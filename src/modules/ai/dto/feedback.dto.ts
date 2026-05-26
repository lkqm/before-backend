import { ApiProperty } from "@nestjs/swagger";
import { AiFeedbackResult } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class AiFeedbackDto {
  @ApiProperty({
    description: "AI 调用记录 ID，对应 AiUsage.id",
    example: "cmplxxx",
  })
  @IsString()
  aiUsageId!: string;

  @ApiProperty({
    description: "用户对本次 AI 结果的最终反馈",
    enum: AiFeedbackResult,
    example: AiFeedbackResult.accepted,
  })
  @IsEnum(AiFeedbackResult)
  result!: AiFeedbackResult;

  @ApiProperty({
    description: "业务附加信息，例如 target、textIndex、style、imageCount",
    required: false,
    example: { target: "caption", textIndex: 0, style: "natural" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AiFeedbackResponseDto {
  @ApiProperty({ description: "反馈记录 ID", example: "cmplxxx" })
  id!: string;
}
