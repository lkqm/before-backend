import { Controller, Get, Query } from '@nestjs/common';

import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('ai/summary')
  getAiSummary(@Query('date') date?: string) {
    return this.usageService.getAiSummary(date);
  }
}
