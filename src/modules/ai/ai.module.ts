import { Module } from '@nestjs/common';

import { QuotaModule } from '../quota/quota.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [QuotaModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
