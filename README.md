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
