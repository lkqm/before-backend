import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { RankImageItemDto } from "./rank-images.dto";

export class PickImageItemDto extends RankImageItemDto {
  @ApiProperty({ description: "图片宽度", required: false, example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiProperty({ description: "图片高度", required: false, example: 900 })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiProperty({
    description: "前端本地筛选分数，0 到 1",
    required: false,
    example: 0.82,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  localScore?: number;

  @ApiProperty({
    description: "前端相似图聚类 ID",
    required: false,
    example: "cluster_1",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  clusterId?: string;

  @ApiProperty({
    description: "前端本地筛选标记",
    required: false,
    example: ["too_dark", "duplicate_like"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  flags?: string[];
}

export class PickImagesDto {
  @ApiProperty({
    description: "本地初筛后的候选图片列表，数量 2 到 12 张",
    minItems: 2,
    maxItems: 12,
    type: [PickImageItemDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => PickImageItemDto)
  images!: PickImageItemDto[];

  @ApiProperty({
    description: "用户原始选择的图片数量",
    example: 24,
  })
  @IsInt()
  @Min(2)
  originalCount!: number;

  @ApiProperty({
    description: "用户想表达的补充信息，可选",
    required: false,
    maxLength: 80,
    example: "想发得低调一点",
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  userNote?: string;

  @ApiProperty({
    description: "地点标签，可选",
    required: false,
    maxLength: 120,
    example: "上海 · 外滩",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationLabel?: string;

  @ApiProperty({
    description: "时间标签，可选",
    required: false,
    maxLength: 40,
    example: "5月26日 傍晚",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  timeLabel?: string;
}
