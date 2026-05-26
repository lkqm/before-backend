import { ApiProperty } from "@nestjs/swagger";

export class LoginUserDto {
  @ApiProperty({ description: "用户 ID", example: "cmplxxx" })
  id!: string;

  @ApiProperty({
    description: "用户昵称，来自登录请求传入资料；可能为空",
    nullable: true,
    example: "Mario",
  })
  nickname!: string | null;

  @ApiProperty({
    description: "用户头像 URL，来自登录请求传入资料；可能为空",
    nullable: true,
    example: "https://example.com/avatar.jpg",
  })
  avatarUrl!: string | null;
}

export class LoginResponseDto {
  @ApiProperty({
    description: "登录凭证，后续接口通过 Authorization: Bearer <token> 传递",
    example: "eyJ1c2VySWQiOiIuLi4ifQ.signature",
  })
  token!: string;

  @ApiProperty({ description: "当前登录用户信息", type: LoginUserDto })
  user!: LoginUserDto;
}
