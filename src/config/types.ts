export type AiTaskName = "rewrite" | "caption" | "rank" | "pick";

export type AiCapability = "text" | "image";

export type AiProviderType = "openai-compatible";

export type AiStrategy = "weighted-random" | "first-available";

export type AiModelPricing = {
  input?: number;
  output?: number;
  cachedInput?: number;
  cacheStoragePerHour?: number;
  reasoningOutput?: number;
  imageInput?: {
    unit?: "image";
    price?: number;
  };
  tiers?: Array<{
    key: string;
    minInputTokens?: number;
    maxInputTokens?: number;
    input?: number;
    cachedInput?: number;
    output?: number;
  }>;
};

export type AiModelConfig = {
  id: string;
  capabilities: AiCapability[];
  weight: number;
  supportsJsonMode: boolean;
  supportsThinking: boolean;
  pricing?: AiModelPricing;
  enabled?: boolean;
};

export type AiProviderConfig = {
  type: AiProviderType;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs: number;
  imageTimeoutMs: number;
  maxRetries: number;
  models: Record<string, AiModelConfig>;
};

export type AiTaskConfig = {
  mode: AiCapability;
  strategy?: AiStrategy;
  maxImages?: number;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  thinking: boolean;
  jsonMode: boolean;
};

export type ResolvedAiCandidate = {
  providerName: string;
  modelName: string;
  provider: AiProviderConfig;
  model: AiModelConfig;
  task: AiTaskConfig;
};

export type AppConfig = {
  app: {
    env: string;
    port: number;
    swaggerEnabled: boolean;
  };
  database: {
    url?: string;
  };
  wechat: {
    appId?: string;
    appSecret?: string;
    tlsRejectUnauthorized: boolean;
    requestTimeoutMs: number;
  };
  auth: {
    tokenSecret?: string;
    tokenTtlMs: number;
  };
  quota: {
    signupAiCredits: number;
  };
  ai?: {
    strategy: AiStrategy;
    providers: Record<string, AiProviderConfig>;
    tasks: Record<AiTaskName, AiTaskConfig>;
  };
};
