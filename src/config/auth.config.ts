import { registerAs } from "@nestjs/config";

import { readBooleanEnv, readEnv, readPositiveIntEnv } from "./helpers";

export default registerAs("auth", () => ({
  tokenSecret: readEnv("AUTH_TOKEN_SECRET"),
  tokenTtlMs: readPositiveIntEnv("AUTH_TOKEN_TTL_MS", 30 * 24 * 60 * 60 * 1000),
  wechat: {
    appId: readEnv("WECHAT_APP_ID"),
    appSecret: readEnv("WECHAT_APP_SECRET"),
    tlsRejectUnauthorized: readBooleanEnv(
      "WECHAT_TLS_REJECT_UNAUTHORIZED",
      true,
    ),
    requestTimeoutMs: readPositiveIntEnv("WECHAT_REQUEST_TIMEOUT_MS", 8000),
  },
}));
