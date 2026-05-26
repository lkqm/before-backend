import { ApiProperty } from "@nestjs/swagger";

export class ApiSuccessResponseDto<T> {
  @ApiProperty({ description: "业务状态码，成功固定为 0", example: 0 })
  code!: number;

  @ApiProperty({ description: "响应消息，成功固定为 ok", example: "ok" })
  message!: string;

  @ApiProperty({ description: "接口实际返回数据", type: Object })
  data!: T;

  @ApiProperty({
    description: "请求 ID，便于排查日志；当前运行环境可能为空",
    required: false,
    example: "req-xxx",
  })
  requestId?: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: "业务错误码", example: 1001 })
  code!: number;

  @ApiProperty({ description: "错误说明", example: "validation failed" })
  message!: string;

  @ApiProperty({
    description: "错误响应固定为空",
    type: Object,
    nullable: true,
    example: null,
  })
  data!: null;

  @ApiProperty({
    description: "请求 ID，便于排查日志；当前运行环境可能为空",
    required: false,
    example: "req-xxx",
  })
  requestId?: string;
}
