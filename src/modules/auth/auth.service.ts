import { createHmac, timingSafeEqual } from "node:crypto";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";

import { HttpStatus, Injectable, Logger } from "@nestjs/common";

import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { appConfig } from "../../config";
import { WechatLoginDto } from "./dto/wechat-login.dto";

type WechatSessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatSessionHttpResponse = {
  data: WechatSessionResponse;
  ok: boolean;
  statusCode: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async wechatLogin(dto: WechatLoginDto) {
    const { openId, unionId } = await this.getWechatSession(dto.code);
    const user = await this.prisma.user.upsert({
      where: { openId },
      create: {
        openId,
        unionId,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
      },
      update: {
        ...(unionId ? { unionId } : {}),
        ...(dto.nickname ? { nickname: dto.nickname } : {}),
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });

    return {
      token: this.createToken(user.id),
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async assertUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw this.unauthorized();
    }

    return user;
  }

  verifyToken(token: string) {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      throw this.unauthorized();
    }

    const expectedSignature = this.sign(encodedPayload);
    if (!this.isSafeEqual(signature, expectedSignature)) {
      throw this.unauthorized();
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as { userId?: string; exp?: number };

      if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
        throw this.unauthorized();
      }

      return payload.userId;
    } catch {
      throw this.unauthorized();
    }
  }

  private async getWechatSession(code: string) {
    const appId = appConfig.wechat.appId;
    const appSecret = appConfig.wechat.appSecret;
    if (!appId || !appSecret) {
      throw new AppException(
        AppErrorCode.WechatNotConfigured,
        "wechat login is not configured",
      );
    }

    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");

    let response: WechatSessionHttpResponse;
    try {
      response = await this.requestWechatSession(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `wechat jscode2session request failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new AppException(
        AppErrorCode.WechatLoginFailed,
        "wechat login request failed",
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok || !response.data.openid) {
      throw new AppException(
        AppErrorCode.WechatLoginFailed,
        response.data.errmsg || "wechat login failed",
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      openId: response.data.openid,
      unionId: response.data.unionid,
    };
  }

  private requestWechatSession(url: URL) {
    return new Promise<WechatSessionHttpResponse>((resolve, reject) => {
      const rejectUnauthorized = appConfig.wechat.tlsRejectUnauthorized;

      if (!rejectUnauthorized) {
        this.logger.warn(
          "WECHAT_TLS_REJECT_UNAUTHORIZED=false is enabled for jscode2session",
        );
      }

      const request = httpsRequest(
        url,
        {
          agent: new HttpsAgent({ rejectUnauthorized }),
          method: "GET",
          timeout: appConfig.wechat.requestTimeoutMs,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          response.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            try {
              resolve({
                data: JSON.parse(body) as WechatSessionResponse,
                ok:
                  (response.statusCode ?? 500) >= 200 &&
                  (response.statusCode ?? 500) < 300,
                statusCode: response.statusCode ?? 500,
              });
            } catch {
              reject(
                new Error(
                  `wechat jscode2session returned invalid json, status=${response.statusCode ?? 500}`,
                ),
              );
            }
          });
        },
      );

      request.on("error", reject);
      request.on("timeout", () => {
        request.destroy(new Error("wechat jscode2session request timeout"));
      });
      request.end();
    });
  }

  private createToken(userId: string) {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        exp: Date.now() + appConfig.auth.tokenTtlMs,
      }),
    ).toString("base64url");

    return `${payload}.${this.sign(payload)}`;
  }

  private sign(payload: string) {
    return createHmac("sha256", this.getTokenSecret())
      .update(payload)
      .digest("base64url");
  }

  private getTokenSecret() {
    const configuredSecret = appConfig.auth.tokenSecret;
    if (configuredSecret) return configuredSecret;

    if (appConfig.app.env === "production") {
      throw new AppException(
        AppErrorCode.WechatNotConfigured,
        "auth token secret is not configured",
      );
    }

    return appConfig.wechat.appSecret ?? "dev-auth-token-secret";
  }

  private isSafeEqual(value: string, expected: string) {
    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);

    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    );
  }

  private unauthorized() {
    return new AppException(
      AppErrorCode.Unauthorized,
      "unauthorized",
      HttpStatus.UNAUTHORIZED,
    );
  }
}
