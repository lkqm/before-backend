import type { AppConfig } from "./types";

export function validateConfig(config: AppConfig) {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push("database.url");
  }
  if (!config.wechat.appId) {
    errors.push("wechat.appId");
  }
  if (!config.wechat.appSecret) {
    errors.push("wechat.appSecret");
  }
  if (config.app.env === "production" && !config.auth.tokenSecret) {
    errors.push("auth.tokenSecret");
  }

  if (errors.length > 0) {
    throw new Error(`Missing or invalid config: ${errors.join(", ")}`);
  }
}
