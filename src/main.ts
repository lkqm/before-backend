import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { ValidationPipe } from "@nestjs/common";
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
import { HttpLoggingInterceptor } from "./common/interceptors/http-logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { appConfig } from "./config";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 12 * 1024 * 1024,
      genReqId: () => `req_${randomUUID()}`,
    }),
  );

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
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(),
    new ResponseInterceptor(),
  );

  if (appConfig.app.swaggerEnabled) {
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

  await app.listen(appConfig.app.port, "0.0.0.0");
}

void bootstrap();
