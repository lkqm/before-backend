import { registerAs } from "@nestjs/config";

import { readEnv } from "./helpers";

export default registerAs("database", () => ({
  url: readEnv("DATABASE_URL"),
}));
