import { registerAs } from "@nestjs/config";

import { readBooleanEnv, readEnv, readPositiveIntEnv } from "./helpers";

export default registerAs("app", () => {
  const env = readEnv("APP_ENV") ?? "dev";
  const explicitSwaggerEnabled = readEnv("ENABLE_SWAGGER");

  return {
    env,
    isProd: env === "prod",
    port: readPositiveIntEnv("PORT", 3000),
    swaggerEnabled: explicitSwaggerEnabled
      ? readBooleanEnv("ENABLE_SWAGGER", false)
      : env !== "prod",
  };
});
