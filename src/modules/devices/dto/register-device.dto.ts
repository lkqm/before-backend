import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsUUID()
  anonymousId!: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'devtools'])
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
