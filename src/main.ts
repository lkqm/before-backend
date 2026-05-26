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

  const port = config.get<number>("PORT") ?? 3000;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
