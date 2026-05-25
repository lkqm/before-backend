import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  register(dto: RegisterDeviceDto) {
    return this.prisma.device.upsert({
      where: { anonymousId: dto.anonymousId },
      create: {
        anonymousId: dto.anonymousId,
        platform: dto.platform,
        appVersion: dto.appVersion,
      },
      update: {
        platform: dto.platform,
        appVersion: dto.appVersion,
      },
    });
  }

  async registerByOpenId(dto: RegisterDeviceDto & { openId: string }) {
    const existingByOpenId = await this.prisma.device.findUnique({
      where: { openId: dto.openId },
    });

    if (existingByOpenId) {
      const existingByAnonymousId = await this.prisma.device.findUnique({
        where: { anonymousId: dto.anonymousId },
      });
      const canUpdateAnonymousId =
        !existingByAnonymousId || existingByAnonymousId.id === existingByOpenId.id;

      return this.prisma.device.update({
        where: { id: existingByOpenId.id },
        data: {
          ...(canUpdateAnonymousId ? { anonymousId: dto.anonymousId } : {}),
          platform: dto.platform,
          appVersion: dto.appVersion,
        },
      });
    }

    const existingByAnonymousId = await this.prisma.device.findUnique({
      where: { anonymousId: dto.anonymousId },
    });

    if (existingByAnonymousId) {
      return this.prisma.device.update({
        where: { id: existingByAnonymousId.id },
        data: {
          openId: dto.openId,
          platform: dto.platform,
          appVersion: dto.appVersion,
        },
      });
    }

    return this.prisma.device.create({
      data: {
        anonymousId: dto.anonymousId,
        openId: dto.openId,
        platform: dto.platform,
        appVersion: dto.appVersion,
      },
    });
  }

  async findById(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('device not found');
    }

    return device;
  }
}
