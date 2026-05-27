import { registerAs } from "@nestjs/config";

import { readNonNegativeIntEnv } from "./helpers";

export default registerAs("quota", () => ({
  signupAiCredits: readNonNegativeIntEnv("SIGNUP_AI_CREDITS", 10),
}));
