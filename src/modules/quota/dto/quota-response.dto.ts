import { ApiProperty } from "@nestjs/swagger";

export class QuotaResponseDto {
  @ApiProperty({ description: "每日额度上限", example: 10 })
  dailyLimit!: number;

  @ApiProperty({ description: "当天已使用次数", example: 2 })
  used!: number;

  @ApiProperty({ description: "当天剩余次数", example: 8 })
  left!: number;
}
