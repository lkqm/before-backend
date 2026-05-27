import { registerAs } from "@nestjs/config";

import { env } from "../env";

function readProviderConfig(prefix: "text" | "image", timeoutMs: number) {
  const isText = prefix === "text";
  return {
    provider:
      (isText ? env.TEXT_AI_PROVIDER : env.IMAGE_AI_PROVIDER) ??
      env.AI_PROVIDER ??
      "openai",
    apiKey:
      (isText ? env.TEXT_AI_API_KEY : env.IMAGE_AI_API_KEY) ??
      env.AI_API_KEY ??
      env.OPENAI_API_KEY,
    model:
      (isText ? env.TEXT_AI_MODEL : env.IMAGE_AI_MODEL) ??
      env.AI_MODEL ??
      env.OPENAI_MODEL ??
      "gpt-4.1-mini",
    baseURL:
      (isText ? env.TEXT_AI_BASE_URL : env.IMAGE_AI_BASE_URL) ??
      env.AI_BASE_URL,
    timeoutMs:
      (isText ? env.TEXT_AI_TIMEOUT_MS : env.IMAGE_AI_TIMEOUT_MS) ||
      env.AI_TIMEOUT_MS ||
      timeoutMs,
    maxRetries:
      (isText ? env.TEXT_AI_MAX_RETRIES : env.IMAGE_AI_MAX_RETRIES) ??
      env.AI_MAX_RETRIES,
  };
}

export const appConfig = registerAs("app", () => ({
  env: env.APP_ENV,
  isProd: env.APP_ENV === "prod",
  port: env.PORT,
  swaggerEnabled: env.ENABLE_SWAGGER
    ? env.ENABLE_SWAGGER === "true"
    : env.APP_ENV !== "prod",
}));

export const authConfig = registerAs("auth", () => ({
  tokenSecret: env.AUTH_TOKEN_SECRET,
  tokenTtlMs: env.AUTH_TOKEN_TTL_MS,
  wechat: {
    appId: env.WECHAT_APP_ID,
    appSecret: env.WECHAT_APP_SECRET,
    tlsRejectUnauthorized: env.WECHAT_TLS_REJECT_UNAUTHORIZED,
    requestTimeoutMs: env.WECHAT_REQUEST_TIMEOUT_MS,
  },
}));

export const aiConfig = registerAs("ai", () => ({
  hasConfiguredApiKey: Boolean(
    env.TEXT_AI_API_KEY ||
    env.IMAGE_AI_API_KEY ||
    env.AI_API_KEY ||
    env.OPENAI_API_KEY,
  ),
  hasConfiguredModel: Boolean(
    env.TEXT_AI_MODEL || env.IMAGE_AI_MODEL || env.AI_MODEL || env.OPENAI_MODEL,
  ),
  text: readProviderConfig("text", 15000),
  image: readProviderConfig("image", 30000),
  rewrite: {
    maxTokens: env.AI_REWRITE_MAX_TOKENS,
    temperature: env.AI_REWRITE_TEMPERATURE,
    disableThinking: env.AI_REWRITE_THINKING_DISABLED,
  },
  textCaption: {
    maxTokens: env.AI_TEXT_CAPTION_MAX_TOKENS,
    temperature: env.AI_TEXT_CAPTION_TEMPERATURE,
    disableThinking: env.AI_TEXT_CAPTION_THINKING_DISABLED,
  },
  imageCaption: {
    maxImages: env.AI_IMAGE_CAPTION_MAX_IMAGES,
    maxTokens: env.AI_IMAGE_CAPTION_MAX_TOKENS,
    temperature: env.AI_IMAGE_CAPTION_TEMPERATURE,
    disableThinking: env.AI_IMAGE_CAPTION_THINKING_DISABLED,
  },
}));

export const databaseConfig = registerAs("database", () => ({
  url: env.DATABASE_URL,
}));

export const quotaConfig = registerAs("quota", () => ({
  signupAiCredits: env.SIGNUP_AI_CREDITS,
}));

export const configuration = [
  appConfig,
  authConfig,
  aiConfig,
  databaseConfig,
  quotaConfig,
];
