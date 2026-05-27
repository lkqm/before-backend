import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "./common/prisma/prisma.module";
import { appConfig } from "./config";
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
      ignoreEnvVars: true,
      load: [() => appConfig],
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
