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

  @ApiProperty({ description: "当前用户剩余 AI 次数", example: 9 })
  remainingCredits!: number;
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

  @ApiProperty({ description: "当前用户剩余 AI 次数", example: 9 })
  remainingCredits!: number;
}

export class PickImageCaptionDto {
  @ApiProperty({
    description: "文案风格",
    enum: ["natural", "daily", "minimal"],
    example: "natural",
  })
  style!: "natural" | "daily" | "minimal";

  @ApiProperty({ description: "该方案推荐使用的一条朋友圈文案", example: "风挺大的" })
  text!: string;
}

export class PickImagePlanDto {
  @ApiProperty({ description: "方案标题，后端最多保留 12 字", example: "精选 4 张" })
  title!: string;

  @ApiProperty({ description: "推荐作为朋友圈首图的图片 ID", example: "img_1" })
  coverImageId!: string;

  @ApiProperty({
    description: "该方案推荐发布的图片 ID 顺序，最多 9 张",
    example: ["img_1", "img_3", "img_2", "img_5"],
  })
  imageIds!: string[];

  @ApiProperty({
    description: "方案简短理由，后端最多保留 40 字",
    example: "画面不重复，整体更自然",
  })
  reason!: string;

  @ApiProperty({ description: "该方案推荐文案", type: PickImageCaptionDto })
  caption!: PickImageCaptionDto;
}

export class PickImageRejectedDto {
  @ApiProperty({ description: "不建议使用的输入图片 ID", example: "img_6" })
  imageId!: string;

  @ApiProperty({
    description: "不建议使用的简短理由，后端最多保留 40 字",
    example: "和前一张内容重复",
  })
  reason!: string;
}

export class PickImagesResponseDto {
  @ApiProperty({ description: "AI 调用记录 ID，用于反馈接口关联本次 AI 结果", example: "cmplxxx" })
  aiUsageId!: string;

  @ApiProperty({
    description: "图片整体场景总结，后端最多保留 30 字",
    example: "朋友聚餐和街边散步",
  })
  imageSummary!: string;

  @ApiProperty({ description: "最多 3 个朋友圈发图方案", type: [PickImagePlanDto] })
  plans!: PickImagePlanDto[];

  @ApiProperty({ description: "不建议发布的图片及理由", type: [PickImageRejectedDto] })
  rejected!: PickImageRejectedDto[];

  @ApiProperty({ description: "当前用户剩余 AI 次数", example: 9 })
  remainingCredits!: number;
}
