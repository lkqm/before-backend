import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { RankImageItemDto } from './rank-images.dto';

export class GenerateMomentDto {
  @IsString()
  deviceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => RankImageItemDto)
  images!: RankImageItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  userNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  timeLabel?: string;
}
