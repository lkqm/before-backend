import "dotenv/config";

import type { AppConfig } from "./types";
import { validateConfig } from "./validate";

const nodeConfig = require("config") as typeof import("config");

function resolveConfig() {
  const raw = nodeConfig.util.toObject() as AppConfig;
  const config: AppConfig = {
    ...raw,
    app: {
      ...raw.app,
      env: process.env.NODE_ENV || raw.app.env,
    },
  };

  normalizeConfig(config);
  validateConfig(config);
  return config;
}

function normalizeConfig(config: AppConfig) {
  config.app.port = toPositiveInt(config.app.port, 3000);
  config.app.swaggerEnabled = toBoolean(config.app.swaggerEnabled, true);
  config.wechat.tlsRejectUnauthorized = toBoolean(
    config.wechat.tlsRejectUnauthorized,
    true,
  );
  config.wechat.requestTimeoutMs = toPositiveInt(
    config.wechat.requestTimeoutMs,
    8000,
  );
  config.auth.tokenTtlMs = toPositiveInt(
    config.auth.tokenTtlMs,
    30 * 24 * 60 * 60 * 1000,
  );
  config.quota.signupAiCredits = toNonNegativeInt(
    config.quota.signupAiCredits,
    10,
  );

}

function toBoolean(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return defaultValue;
}

function toPositiveInt(value: unknown, defaultValue: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function toNonNegativeInt(value: unknown, defaultValue: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export const appConfig = resolveConfig();
export type {
  AiCapability,
  AiModelConfig,
  AiModelPricing,
  AiProviderConfig,
  AiStrategy,
  AiTaskConfig,
  AiTaskName,
  AppConfig,
  ResolvedAiCandidate,
} from "./types";
