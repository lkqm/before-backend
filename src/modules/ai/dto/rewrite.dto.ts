import { IsString, MaxLength, MinLength } from 'class-validator';

export class RewriteDto {
  @IsString()
  deviceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;
}
