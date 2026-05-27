import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "./common/prisma/prisma.module";
import aiConfig from "./config/ai.config";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import databaseConfig from "./config/database.config";
import quotaConfig from "./config/quota.config";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { HealthModule } from "./modules/health/health.module";
import { QuotaModule } from "./modules/quota/quota.module";
import { UsageModule } from "./modules/usage/usage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, aiConfig, databaseConfig, quotaConfig],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    BillingModule,
    QuotaModule,
    AiModule,
    UsageModule,
  ],
})
export class AppModule {}
