function readEnv(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function readBooleanEnv(key: string, defaultValue: boolean) {
  const value = readEnv(key);
  if (!value) return defaultValue;
  return value === "true";
}

function readPositiveIntEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
}

function readNonNegativeIntEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isInteger(value) && value >= 0 ? value : defaultValue;
}

function readNumberEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isFinite(value) ? value : defaultValue;
}

export const env = {
  APP_ENV: readEnv("APP_ENV") ?? "dev",
  PORT: readPositiveIntEnv("PORT", 3000),
  ENABLE_SWAGGER: readEnv("ENABLE_SWAGGER"),
  DATABASE_URL: readEnv("DATABASE_URL"),
  AUTH_TOKEN_SECRET: readEnv("AUTH_TOKEN_SECRET"),
  AUTH_TOKEN_TTL_MS: readPositiveIntEnv(
    "AUTH_TOKEN_TTL_MS",
    30 * 24 * 60 * 60 * 1000,
  ),
  WECHAT_APP_ID: readEnv("WECHAT_APP_ID"),
  WECHAT_APP_SECRET: readEnv("WECHAT_APP_SECRET"),
  WECHAT_TLS_REJECT_UNAUTHORIZED: readBooleanEnv(
    "WECHAT_TLS_REJECT_UNAUTHORIZED",
    true,
  ),
  WECHAT_REQUEST_TIMEOUT_MS: readPositiveIntEnv(
    "WECHAT_REQUEST_TIMEOUT_MS",
    8000,
  ),
  SIGNUP_AI_CREDITS: readNonNegativeIntEnv("SIGNUP_AI_CREDITS", 10),
  AI_PROVIDER: readEnv("AI_PROVIDER"),
  AI_BASE_URL: readEnv("AI_BASE_URL"),
  AI_API_KEY: readEnv("AI_API_KEY"),
  AI_MODEL: readEnv("AI_MODEL"),
  AI_TIMEOUT_MS: readPositiveIntEnv("AI_TIMEOUT_MS", 0),
  AI_MAX_RETRIES: readNonNegativeIntEnv("AI_MAX_RETRIES", 0),
  OPENAI_API_KEY: readEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: readEnv("OPENAI_MODEL"),
  TEXT_AI_PROVIDER: readEnv("TEXT_AI_PROVIDER"),
  TEXT_AI_BASE_URL: readEnv("TEXT_AI_BASE_URL"),
  TEXT_AI_API_KEY: readEnv("TEXT_AI_API_KEY"),
  TEXT_AI_MODEL: readEnv("TEXT_AI_MODEL"),
  TEXT_AI_TIMEOUT_MS: readPositiveIntEnv("TEXT_AI_TIMEOUT_MS", 15000),
  TEXT_AI_MAX_RETRIES: readNonNegativeIntEnv("TEXT_AI_MAX_RETRIES", 0),
  IMAGE_AI_PROVIDER: readEnv("IMAGE_AI_PROVIDER"),
  IMAGE_AI_BASE_URL: readEnv("IMAGE_AI_BASE_URL"),
  IMAGE_AI_API_KEY: readEnv("IMAGE_AI_API_KEY"),
  IMAGE_AI_MODEL: readEnv("IMAGE_AI_MODEL"),
  IMAGE_AI_TIMEOUT_MS: readPositiveIntEnv("IMAGE_AI_TIMEOUT_MS", 30000),
  IMAGE_AI_MAX_RETRIES: readNonNegativeIntEnv("IMAGE_AI_MAX_RETRIES", 0),
  AI_REWRITE_MAX_TOKENS: readPositiveIntEnv("AI_REWRITE_MAX_TOKENS", 120),
  AI_REWRITE_TEMPERATURE: readNumberEnv("AI_REWRITE_TEMPERATURE", 0.7),
  AI_REWRITE_THINKING_DISABLED:
    readEnv("AI_REWRITE_THINKING_DISABLED") !== "false",
  AI_TEXT_CAPTION_MAX_TOKENS: readPositiveIntEnv(
    "AI_TEXT_CAPTION_MAX_TOKENS",
    240,
  ),
  AI_TEXT_CAPTION_TEMPERATURE: readNumberEnv(
    "AI_TEXT_CAPTION_TEMPERATURE",
    0.7,
  ),
  AI_TEXT_CAPTION_THINKING_DISABLED:
    readEnv("AI_TEXT_CAPTION_THINKING_DISABLED") !== "false",
  AI_IMAGE_CAPTION_MAX_IMAGES: readPositiveIntEnv(
    "AI_IMAGE_CAPTION_MAX_IMAGES",
    4,
  ),
  AI_IMAGE_CAPTION_MAX_TOKENS: readPositiveIntEnv(
    "AI_IMAGE_CAPTION_MAX_TOKENS",
    220,
  ),
  AI_IMAGE_CAPTION_TEMPERATURE: readNumberEnv(
    "AI_IMAGE_CAPTION_TEMPERATURE",
    0.7,
  ),
  AI_IMAGE_CAPTION_THINKING_DISABLED:
    readEnv("AI_IMAGE_CAPTION_THINKING_DISABLED") !== "false",
};

export type Env = typeof env;
