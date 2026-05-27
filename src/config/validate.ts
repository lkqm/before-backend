import type { AiCapability, AiModelConfig, AppConfig } from "./types";

const REQUIRED_SYSTEM_PROMPT_TASKS = new Set([
  "rewrite",
  "caption",
  "imageRank",
]);

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

  for (const [providerName, provider] of Object.entries(config.ai.providers)) {
    if (!provider.apiKey) {
      errors.push(`ai.providers.${providerName}.apiKey`);
    }
    for (const [modelName, model] of Object.entries(provider.models)) {
      validateModel(providerName, modelName, model, errors);
    }
  }

  for (const [taskName, task] of Object.entries(config.ai.tasks)) {
    if (!findModelsForMode(config, task.mode).length) {
      errors.push(`ai.tasks.${taskName}.mode`);
    }
    if (
      REQUIRED_SYSTEM_PROMPT_TASKS.has(taskName) &&
      !task.systemPrompt?.trim()
    ) {
      errors.push(`ai.tasks.${taskName}.systemPrompt`);
    }
    if (typeof task.thinking !== "boolean") {
      errors.push(`ai.tasks.${taskName}.thinking`);
    }
    if (typeof task.jsonMode !== "boolean") {
      errors.push(`ai.tasks.${taskName}.jsonMode`);
    }
    if (
      task.temperature !== undefined &&
      (!Number.isFinite(task.temperature) ||
        task.temperature < 0 ||
        task.temperature > 2)
    ) {
      errors.push(`ai.tasks.${taskName}.temperature`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Missing or invalid config: ${errors.join(", ")}`);
  }
}

function validateModel(
  providerName: string,
  modelName: string,
  model: AiModelConfig,
  errors: string[],
) {
  const path = `ai.providers.${providerName}.models.${modelName}`;
  if (!model.id) {
    errors.push(`${path}.id`);
  }
  if (!model.capabilities.length) {
    errors.push(`${path}.capabilities`);
  }
  if (!Number.isFinite(model.weight) || model.weight <= 0) {
    errors.push(`${path}.weight`);
  }
}

function findModelsForMode(config: AppConfig, mode: AiCapability) {
  return Object.values(config.ai.providers).flatMap((provider) =>
    Object.values(provider.models).filter(
      (model) => model.enabled !== false && model.capabilities.includes(mode),
    ),
  );
}
