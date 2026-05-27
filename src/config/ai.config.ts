import { registerAs } from "@nestjs/config";

import {
  readEnv,
  readNonNegativeIntEnv,
  readNumberEnv,
  readPositiveIntEnv,
} from "./helpers";

function readProviderConfig(prefix: "TEXT_AI" | "IMAGE_AI", timeoutMs: number) {
  return {
    provider:
      readEnv(`${prefix}_PROVIDER`) ?? readEnv("AI_PROVIDER") ?? "openai",
    apiKey:
      readEnv(`${prefix}_API_KEY`) ??
      readEnv("AI_API_KEY") ??
      readEnv("OPENAI_API_KEY"),
    model:
      readEnv(`${prefix}_MODEL`) ??
      readEnv("AI_MODEL") ??
      readEnv("OPENAI_MODEL") ??
      "gpt-4.1-mini",
    baseURL: readEnv(`${prefix}_BASE_URL`) ?? readEnv("AI_BASE_URL"),
    timeoutMs: readPositiveIntEnv(
      `${prefix}_TIMEOUT_MS`,
      readPositiveIntEnv("AI_TIMEOUT_MS", timeoutMs),
    ),
    maxRetries: readNonNegativeIntEnv(
      `${prefix}_MAX_RETRIES`,
      readNonNegativeIntEnv("AI_MAX_RETRIES", 0),
    ),
  };
}

export default registerAs("ai", () => ({
  hasConfiguredApiKey: Boolean(
    readEnv("TEXT_AI_API_KEY") ||
    readEnv("IMAGE_AI_API_KEY") ||
    readEnv("AI_API_KEY") ||
    readEnv("OPENAI_API_KEY"),
  ),
  hasConfiguredModel: Boolean(
    readEnv("TEXT_AI_MODEL") ||
    readEnv("IMAGE_AI_MODEL") ||
    readEnv("AI_MODEL") ||
    readEnv("OPENAI_MODEL"),
  ),
  text: readProviderConfig("TEXT_AI", 15000),
  image: readProviderConfig("IMAGE_AI", 30000),
  rewrite: {
    maxTokens: readPositiveIntEnv("AI_REWRITE_MAX_TOKENS", 120),
    temperature: readNumberEnv("AI_REWRITE_TEMPERATURE", 0.7),
    disableThinking: readEnv("AI_REWRITE_THINKING_DISABLED") !== "false",
  },
  textCaption: {
    maxTokens: readPositiveIntEnv("AI_TEXT_CAPTION_MAX_TOKENS", 240),
    temperature: readNumberEnv("AI_TEXT_CAPTION_TEMPERATURE", 0.7),
    disableThinking: readEnv("AI_TEXT_CAPTION_THINKING_DISABLED") !== "false",
  },
  imageCaption: {
    maxImages: readPositiveIntEnv("AI_IMAGE_CAPTION_MAX_IMAGES", 4),
    maxTokens: readPositiveIntEnv("AI_IMAGE_CAPTION_MAX_TOKENS", 220),
    temperature: readNumberEnv("AI_IMAGE_CAPTION_TEMPERATURE", 0.7),
    disableThinking: readEnv("AI_IMAGE_CAPTION_THINKING_DISABLED") !== "false",
  },
}));
