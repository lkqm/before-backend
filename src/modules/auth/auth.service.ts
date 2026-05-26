import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpStatus, Injectable } from "@nestjs/common";
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

    const response = await fetch(url);
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
    return (
      this.readConfig("AUTH_TOKEN_SECRET") ??
      this.readConfig("WECHAT_APP_SECRET") ??
      "dev-auth-token-secret"
    );
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
