import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsObject, IsOptional, Min } from "class-validator";

import {
  AiFeature,
  type AiFeature as AiFeatureType,
} from "../../ai/ai.constants";

export const billingInterestFeatures = [
  AiFeature.rewrite,
  AiFeature.caption,
  AiFeature.rank,
  AiFeature.pick,
] as const;

export type BillingInterestFeature = Extract<
  AiFeatureType,
  (typeof billingInterestFeatures)[number]
>;

export class BillingInterestDto {
  @ApiProperty({
    description: "触发开通意愿的 AI 功能",
    enum: billingInterestFeatures,
    example: "rewrite",
  })
  @IsIn(billingInterestFeatures)
  feature!: BillingInterestFeature;

  @ApiProperty({
    description: "触发时剩余 AI 次数",
    required: false,
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingCredits?: number;

  @ApiProperty({
    description: "业务附加信息，例如图片数量、文案长度、是否有位置",
    required: false,
    example: { imageCount: 3, textLength: 12 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BillingInterestResponseDto {
  @ApiProperty({ description: "开通意愿记录 ID", example: "cmplxxx" })
  id!: string;
}
