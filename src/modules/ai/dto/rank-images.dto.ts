import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RankImageItemDto {
  @IsString()
  id!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @IsString()
  @MaxLength(1_100_000)
  base64!: string;
}

export class RankImagesDto {
  @IsString()
  deviceId!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => RankImageItemDto)
  images!: RankImageItemDto[];
}
