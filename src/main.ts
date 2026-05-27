import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import aiConfig from "./config/ai.config";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import databaseConfig from "./config/database.config";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      bodyLimit: 12 * 1024 * 1024,
      genReqId: () => `req_${randomUUID()}`,
    }),
  );
  const config = app.get(ConfigService);
  const appConfiguration =
    config.getOrThrow<ConfigType<typeof appConfig>>("app");
  validateRequiredConfig(config, appConfiguration);

  await app.register(helmet);
  await app.register(cors, { origin: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (appConfiguration.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("before-backend API")
      .setDescription("圈感小程序后端接口文档")
      .setVersion("1.0.0")
      .addBearerAuth({
        type: "http",
        scheme: "bearer",
        bearerFormat: "Token",
        description: "登录后通过 /auth/wechat-login 获取 token",
      })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
    app.getHttpAdapter().get("/openapi.json", (_request, reply) => {
      reply.send(document);
    });
  }

  await app.listen(appConfiguration.port, "0.0.0.0");
}

function validateRequiredConfig(
  config: ConfigService,
  appConfiguration: ConfigType<typeof appConfig>,
) {
  const authConfiguration =
    config.getOrThrow<ConfigType<typeof authConfig>>("auth");
  const aiConfiguration = config.getOrThrow<ConfigType<typeof aiConfig>>("ai");
  const databaseConfiguration =
    config.getOrThrow<ConfigType<typeof databaseConfig>>("database");
  const missingKeys = [
    databaseConfiguration.url ? "" : "DATABASE_URL",
    authConfiguration.wechat.appId ? "" : "WECHAT_APP_ID",
    authConfiguration.wechat.appSecret ? "" : "WECHAT_APP_SECRET",
    aiConfiguration.hasConfiguredApiKey ? "" : "AI_API_KEY",
    aiConfiguration.hasConfiguredModel ? "" : "AI_MODEL",
    appConfiguration.isProd && !authConfiguration.tokenSecret
      ? "AUTH_TOKEN_SECRET"
      : "",
  ].filter(Boolean);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required config: ${missingKeys.join(", ")}`);
  }
}

void bootstrap();
