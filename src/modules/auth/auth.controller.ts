import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    const device = await this.authService.wechatLogin(dto);

    return {
      deviceId: device.id,
    };
  }
}
