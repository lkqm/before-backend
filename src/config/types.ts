export type AiTaskName =
  | "rewrite"
  | "textCaption"
  | "imageCaption"
  | "imageRank";

export type AiCapability = "text" | "image";

export type AiProviderType = "openai-compatible";

export type AiStrategy = "weighted-random" | "first-available";

export type AiModelConfig = {
  id: string;
  capabilities: AiCapability[];
  weight: number;
  supportsJsonMode: boolean;
  supportsThinking: boolean;
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
  ai: {
    strategy: AiStrategy;
    providers: Record<string, AiProviderConfig>;
    tasks: Record<AiTaskName, AiTaskConfig>;
  };
};
