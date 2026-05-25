import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
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

    const dailyLimit = this.getDailyLimit();
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

    const dailyLimit = this.getDailyLimit();
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
      throw new HttpException(
        'daily quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      dailyLimit,
      used: usage.count,
      left: Math.max(dailyLimit - usage.count, 0),
    };
  }

  private getDailyLimit() {
    return Number(this.config.get<string>('DAILY_AI_QUOTA') ?? 10);
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
