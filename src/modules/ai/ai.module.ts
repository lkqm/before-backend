import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { QuotaModule } from "../quota/quota.module";
import { AiController } from "./ai.controller";
import { AiLockService } from "./ai-lock.service";
import { AiService } from "./ai.service";

@Module({
  imports: [AuthModule, QuotaModule],
  controllers: [AiController],
  providers: [AiService, AiLockService],
})
export class AiModule {}
