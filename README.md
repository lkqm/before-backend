# before-backend

圈感小程序的后端服务，提供匿名设备、AI 文案和每日额度能力。

## 功能

- 匿名设备注册
- AI 文案改写和生成
- 每日 AI 共享额度
- AI 调用用量记录
- 统一接口响应和错误返回

## 技术栈

- NestJS
- Fastify
- Prisma
- PostgreSQL
- Docker Compose
- OpenAI-compatible SDK

## 开发

```bash
nvm use
npm install
docker compose up -d postgres
npm run prisma:migrate
npm run start:dev
```

本地配置复制 `.env.example` 到 `.env`，填写 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL`。
