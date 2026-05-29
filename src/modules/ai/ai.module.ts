import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { QuotaModule } from "../quota/quota.module";
import { AiConfigService } from "./ai-config.service";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [AuthModule, QuotaModule],
  controllers: [AiController],
  providers: [AiConfigService, AiService],
})
export class AiModule {}
