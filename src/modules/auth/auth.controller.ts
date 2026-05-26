import { Body, Controller, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from "../../common/swagger/api-response.dto";
import { AuthService } from "./auth.service";
import { LoginResponseDto, LoginUserDto } from "./dto/login-response.dto";
import { WechatLoginDto } from "./dto/wechat-login.dto";

@ApiTags("认证")
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LoginResponseDto,
  LoginUserDto,
)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: "微信登录",
    description:
      "使用微信小程序登录 code 换取 openId，创建或更新用户，并返回后续接口使用的 Bearer token。",
  })
  @ApiWrappedOkResponse("登录成功", LoginResponseDto)
  @ApiBadRequestResponse({
    description: "微信登录失败或参数错误",
    type: ApiErrorResponseDto,
  })
  @Post("wechat-login")
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto);
  }
}
