import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ description: "服务状态", example: "ok" })
  status!: string;

  @ApiProperty({ description: "服务名称", example: "before-backend" })
  service!: string;
}
