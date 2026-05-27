import { ApiProperty } from "@nestjs/swagger";

export class FeatureSummaryDto {
  @ApiProperty({
    description: "AI 功能类型",
    enum: ["ai", "caption", "image_rank", "pick_image", "rewrite"],
    example: "caption",
  })
  feature!: "ai" | "caption" | "image_rank" | "pick_image" | "rewrite";

  @ApiProperty({ description: "请求总数", example: 12 })
  total!: number;

  @ApiProperty({ description: "成功次数", example: 10 })
  success!: number;

  @ApiProperty({ description: "失败次数", example: 2 })
  failed!: number;

  @ApiProperty({ description: "被阻断次数，当前为预留状态", example: 0 })
  blocked!: number;

  @ApiProperty({ description: "超时次数，当前为预留状态", example: 0 })
  timeout!: number;

  @ApiProperty({ description: "输入 token 总数", example: 1200 })
  inputTokens!: number;

  @ApiProperty({ description: "输出 token 总数", example: 360 })
  outputTokens!: number;

  @ApiProperty({
    description: "平均耗时，单位毫秒；没有可统计耗时时为空",
    nullable: true,
    example: 1300,
  })
  avgLatencyMs!: number | null;
}

export class UsageSummaryResponseDto {
  @ApiProperty({
    description: "统计日期，按中国时区计算",
    example: "2026-05-26",
  })
  date!: string;

  @ApiProperty({ description: "当天 AI 请求总数", example: 12 })
  totalRequests!: number;

  @ApiProperty({
    description: "按功能拆分的统计结果",
    type: [FeatureSummaryDto],
  })
  byFeature!: FeatureSummaryDto[];
}
