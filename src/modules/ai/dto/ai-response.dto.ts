import { ApiProperty } from "@nestjs/swagger";

export class AiTextItemDto {
  @ApiProperty({
    description: "文案风格",
    enum: ["natural", "daily", "minimal", "cute"],
    example: "natural",
  })
  style!: "natural" | "daily" | "minimal" | "cute";

  @ApiProperty({ description: "生成的朋友圈文案", example: "今天的风刚刚好。" })
  text!: string;
}

export class TextGenerationResponseDto {
  @ApiProperty({ description: "AI 调用记录 ID，用于反馈接口关联本次 AI 结果", example: "cmplxxx" })
  aiUsageId!: string;

  @ApiProperty({ description: "AI 生成的文案列表", type: [AiTextItemDto] })
  items!: AiTextItemDto[];

  @ApiProperty({
    description: "图片文案生成时返回的图片整体场景总结；纯文字生成时通常为空",
    required: false,
    example: "傍晚在海边散步，光线柔和，整体氛围轻松。",
  })
  imageSummary?: string;

  @ApiProperty({ description: "当前用户今日剩余 AI 次数", example: 9 })
  quotaLeft!: number;
}

export class ImageRankReasonDto {
  @ApiProperty({ description: "输入图片 ID", example: "img_1" })
  imageId!: string;

  @ApiProperty({
    description: "排序理由，后端最多保留 40 字",
    example: "主体清晰，适合作为首图",
  })
  reason!: string;
}

export class RankImagesResponseDto {
  @ApiProperty({ description: "AI 调用记录 ID，用于反馈接口关联本次 AI 结果", example: "cmplxxx" })
  aiUsageId!: string;

  @ApiProperty({ description: "推荐作为朋友圈首图的图片 ID", example: "img_1" })
  coverImageId!: string;

  @ApiProperty({
    description: "推荐发布顺序，必须包含全部输入图片 ID",
    example: ["img_1", "img_2"],
  })
  orderedImageIds!: string[];

  @ApiProperty({
    description: "每张图片的简短排序理由",
    type: [ImageRankReasonDto],
  })
  reasons!: ImageRankReasonDto[];

  @ApiProperty({ description: "当前用户今日剩余 AI 次数", example: 9 })
  quotaLeft!: number;
}
