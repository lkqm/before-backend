# before-backend

圈感小程序的后端服务，提供匿名设备、AI 文案和每日额度能力。

## 功能

- 匿名设备注册
- AI 文案改写和生成
- AI 图片排序和首图推荐
- 每日 AI 共享额度
- AI 调用用量记录
- AI 使用统计查询
- 统一接口响应和错误返回

## 技术栈

- NestJS
- Fastify
- Prisma
- MySQL
- Docker Compose
- OpenAI-compatible SDK

## 开发

```bash
nvm use
npm install
docker compose up -d mysql
npm run prisma:migrate
npm run start:dev
```

本地配置复制 `.env.example` 到 `.env`，填写 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL`。

文案和图片模型可以分别用 `TEXT_AI_*`、`IMAGE_AI_*` 覆盖；未配置时回退到 `AI_*`。

## 环境配置

本地开发复制 `.env.example`：

```bash
cp .env.example .env
```

生产密钥不要提交到 Git，也不要打进 Docker 镜像。部署到微信云托管时，在云托管环境变量里配置：

- `APP_ENV=prod`
- `PORT`
- `ENABLE_SWAGGER`
- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `WECHAT_TLS_REJECT_UNAUTHORIZED`
- `SIGNUP_AI_CREDITS`
- `AI_PROVIDER`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

可选按场景覆盖：

- `TEXT_AI_PROVIDER`
- `TEXT_AI_BASE_URL`
- `TEXT_AI_API_KEY`
- `TEXT_AI_MODEL`
- `IMAGE_AI_PROVIDER`
- `IMAGE_AI_BASE_URL`
- `IMAGE_AI_API_KEY`
- `IMAGE_AI_MODEL`

## Docker 部署

构建镜像：

```bash
docker build -t before-backend .
```

启动前先执行数据库迁移：

```bash
npm run prisma:migrate:deploy
```

容器启动命令：

```bash
node dist/main
```

应用会监听 `PORT`，默认 `3000`。

生产环境默认不开放 Swagger 文档。如需临时打开 `/docs` 和 `/openapi.json`，设置：

```bash
ENABLE_SWAGGER=true
```
