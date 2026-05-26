import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiFeature } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { getChinaDateRange } from "../../common/date";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class QuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async getQuota(userId: string, feature: AiFeature) {
    await this.authService.assertUser(userId);

    const dailyLimit = this.getDailyLimit(feature);
    const usage = await this.prisma.quotaUsage.findUnique({
      where: {
        userId_feature_date: {
          userId,
          feature,
          date: this.today(),
        },
      },
    });
    const used = usage?.count ?? 0;

    return {
      dailyLimit,
      used,
      left: Math.max(dailyLimit - used, 0),
    };
  }

  async assertAndConsume(userId: string, feature: AiFeature) {
    await this.authService.assertUser(userId);

    const dailyLimit = this.getDailyLimit(feature);
    const today = this.today();
    const usage = await this.prisma.quotaUsage.upsert({
      where: {
        userId_feature_date: {
          userId,
          feature,
          date: today,
        },
      },
      create: {
        userId,
        feature,
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    if (usage.count > dailyLimit) {
      throw new AppException(
        AppErrorCode.QuotaExceeded,
        "daily quota exceeded",
        429,
      );
    }

    return {
      dailyLimit,
      used: usage.count,
      left: Math.max(dailyLimit - usage.count, 0),
    };
  }

  private getDailyLimit(feature: AiFeature) {
    if (feature === AiFeature.rewrite || feature === AiFeature.caption) {
      return (
        this.readNumber("DAILY_TEXT_AI_QUOTA") ??
        this.readNumber("DAILY_AI_QUOTA") ??
        10
      );
    }
    if (feature === AiFeature.image_rank) {
      return (
        this.readNumber("DAILY_IMAGE_AI_QUOTA") ??
        this.readNumber("DAILY_AI_QUOTA") ??
        10
      );
    }

    return this.readNumber("DAILY_AI_QUOTA") ?? 10;
  }

  private readNumber(key: string) {
    const value = this.config.get<string>(key);
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private today() {
    return getChinaDateRange().start;
  }
}
