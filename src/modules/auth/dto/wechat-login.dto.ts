import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class WechatLoginDto {
  @ApiProperty({
    description: "微信小程序 uni.login / wx.login 返回的临时登录 code",
    example: "0a3b4c...",
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: "用户昵称，可选；传入后会更新用户资料",
    required: false,
    maxLength: 32,
    example: "Mario",
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string;

  @ApiProperty({
    description: "用户头像 URL，可选；传入后会更新用户资料",
    required: false,
    maxLength: 500,
    example: "https://example.com/avatar.jpg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
