import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class RankImageItemDto {
  @ApiProperty({
    description: "前端生成的图片 ID，用于保持排序结果和原图的对应关系",
    example: "img_1",
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: "图片 MIME 类型",
    enum: ["image/jpeg", "image/png", "image/webp"],
    example: "image/jpeg",
  })
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  mimeType!: string;

  @ApiProperty({
    description:
      "图片 base64 内容，可带 data URL 前缀；后端解码后单张最大 800KB",
    maxLength: 1_100_000,
    example: "/9j/4AAQSkZJRgABAQ...",
  })
  @IsString()
  @MaxLength(1_100_000)
  base64!: string;
}

export class RankImagesDto {
  @ApiProperty({
    description: "待排序图片列表，数量 2 到 9 张",
    minItems: 2,
    maxItems: 9,
    type: [RankImageItemDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => RankImageItemDto)
  images!: RankImageItemDto[];
}
