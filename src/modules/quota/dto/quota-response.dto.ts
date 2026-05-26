import { ApiProperty } from "@nestjs/swagger";

export class QuotaResponseDto {
  @ApiProperty({ description: "当前可用 AI 次数", example: 8 })
  balance!: number;

  @ApiProperty({ description: "累计增加的 AI 次数，包括赠送和购买", example: 10 })
  totalAdded!: number;

  @ApiProperty({ description: "累计已消耗 AI 次数", example: 2 })
  totalUsed!: number;
}
