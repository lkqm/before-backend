import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
  validateRequiredConfig(config);

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

  if (isSwaggerEnabled(config)) {
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

  const port = config.get<number>("PORT") ?? 3000;
  await app.listen(port, "0.0.0.0");
}

function validateRequiredConfig(config: ConfigService) {
  const requiredKeys = [
    "DATABASE_URL",
    "WECHAT_APP_ID",
    "WECHAT_APP_SECRET",
    "AI_API_KEY",
    "AI_MODEL",
  ];
  if (readConfig(config, "APP_ENV") === "prod") {
    requiredKeys.push("AUTH_TOKEN_SECRET");
  }

  const missingKeys = requiredKeys.filter((key) => !readConfig(config, key));

  if (missingKeys.length > 0) {
    throw new Error(`Missing required config: ${missingKeys.join(", ")}`);
  }
}

function isSwaggerEnabled(config: ConfigService) {
  const explicitValue = readConfig(config, "ENABLE_SWAGGER");
  if (explicitValue) return explicitValue === "true";

  return readConfig(config, "APP_ENV") !== "prod";
}

function readConfig(config: ConfigService, key: string) {
  const value = config.get<string>(key)?.trim();
  return value ? value : undefined;
}

void bootstrap();
