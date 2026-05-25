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
