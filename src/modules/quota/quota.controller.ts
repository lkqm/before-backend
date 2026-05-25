import { Controller, Get, Query } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { IsString } from 'class-validator';

import { QuotaService } from './quota.service';

class QuotaQueryDto {
  @IsString()
  deviceId!: string;
}

@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get()
  async getQuota(@Query() query: QuotaQueryDto) {
    return this.quotaService.getQuota(query.deviceId, AiFeature.ai);
  }
}
