import { IsString, MaxLength, MinLength } from 'class-validator';

export class CaptionDto {
  @IsString()
  deviceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  scene!: string;
}
