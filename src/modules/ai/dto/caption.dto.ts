import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { RankImageItemDto } from "./rank-images.dto";

export class CaptionDto {
  @ApiProperty({
    description: "朋友圈场景描述，可作为图片文案的补充上下文",
    required: false,
    minLength: 1,
    maxLength: 200,
    example: "傍晚在海边散步，风很舒服",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  scene?: string;

  @ApiProperty({
    description: "用于生成文案的图片列表",
    required: true,
    minItems: 1,
    maxItems: 4,
    type: [RankImageItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => RankImageItemDto)
  images!: RankImageItemDto[];

  @ApiProperty({
    description: "用户想表达的补充信息，可选",
    required: false,
    maxLength: 80,
    example: "想表达今天很开心",
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
