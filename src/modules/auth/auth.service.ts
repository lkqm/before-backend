import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppErrorCode, AppException } from '../../common/errors/app.exception';
import { DevicesService } from '../devices/devices.service';
import { WechatLoginDto } from './dto/wechat-login.dto';

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
    private readonly devicesService: DevicesService,
  ) {}

  async wechatLogin(dto: WechatLoginDto) {
    const openId = await this.getWechatOpenId(dto.code);

    return this.devicesService.registerByOpenId({
      openId,
      anonymousId: dto.anonymousId,
      platform: dto.platform,
      appVersion: dto.appVersion,
    });
  }

  private async getWechatOpenId(code: string) {
    const appId = this.readConfig('WECHAT_APP_ID');
    const appSecret = this.readConfig('WECHAT_APP_SECRET');
    if (!appId || !appSecret) {
      throw new AppException(
        AppErrorCode.WechatNotConfigured,
        'wechat login is not configured',
      );
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url);
    const data = (await response.json()) as WechatSessionResponse;
    if (!response.ok || !data.openid) {
      throw new AppException(
        AppErrorCode.WechatLoginFailed,
        data.errmsg || 'wechat login failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    return data.openid;
  }

  private readConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }
}
