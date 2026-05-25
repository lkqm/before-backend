import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AppErrorCode, AppException } from '../../common/errors/app.exception';
import { getChinaDateRange } from '../../common/date';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class QuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly devicesService: DevicesService,
  ) {}

  async getQuota(deviceId: string, feature: AiFeature) {
    await this.devicesService.findById(deviceId);

    const dailyLimit = this.getDailyLimit(feature);
    const usage = await this.prisma.quotaUsage.findUnique({
      where: {
        deviceId_feature_date: {
          deviceId,
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

  async assertAndConsume(deviceId: string, feature: AiFeature) {
    await this.devicesService.findById(deviceId);

    const dailyLimit = this.getDailyLimit(feature);
    const today = this.today();
    const usage = await this.prisma.quotaUsage.upsert({
      where: {
        deviceId_feature_date: {
          deviceId,
          feature,
          date: today,
        },
      },
      create: {
        deviceId,
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
        'daily quota exceeded',
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
      return this.readNumber('DAILY_TEXT_AI_QUOTA') ?? this.readNumber('DAILY_AI_QUOTA') ?? 10;
    }
    if (feature === AiFeature.image_rank) {
      return this.readNumber('DAILY_IMAGE_AI_QUOTA') ?? this.readNumber('DAILY_AI_QUOTA') ?? 10;
    }

    return this.readNumber('DAILY_AI_QUOTA') ?? 10;
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
