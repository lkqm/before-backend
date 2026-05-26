import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { WechatLoginDto } from "./dto/wechat-login.dto";

type WechatSessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
    const appId = this.readConfig("WECHAT_APP_ID");
    const appSecret = this.readConfig("WECHAT_APP_SECRET");
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

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause =
        error instanceof Error && "cause" in error
          ? String((error as Error & { cause?: unknown }).cause)
          : "";
      this.logger.error(
        `wechat jscode2session request failed: ${message}${cause ? `; cause=${cause}` : ""}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new AppException(
        AppErrorCode.WechatLoginFailed,
        "wechat login request failed",
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await response.json()) as WechatSessionResponse;
    if (!response.ok || !data.openid) {
      throw new AppException(
        AppErrorCode.WechatLoginFailed,
        data.errmsg || "wechat login failed",
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      openId: data.openid,
      unionId: data.unionid,
    };
  }

  private readConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }

  private createToken(userId: string) {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
    const configuredSecret = this.readConfig("AUTH_TOKEN_SECRET");
    if (configuredSecret) return configuredSecret;

    if (this.readConfig("APP_ENV") === "prod") {
      throw new AppException(
        AppErrorCode.WechatNotConfigured,
        "auth token secret is not configured",
      );
    }

    return this.readConfig("WECHAT_APP_SECRET") ?? "dev-auth-token-secret";
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
