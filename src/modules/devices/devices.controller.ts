import { Body, Controller, Post } from '@nestjs/common';

import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(@Body() dto: RegisterDeviceDto) {
    const device = await this.devicesService.register(dto);

    return {
      deviceId: device.id,
    };
  }
}
