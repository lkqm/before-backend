import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  type AiCapability,
  type AiModelPricing,
  type AiProviderConfig,
  type AiStrategy,
  type AiTaskConfig,
  type AiTaskName,
  type ResolvedAiCandidate,
} from "../../config";

type DbAiTask = NonNullable<Awaited<ReturnType<AiConfigService["findDbTask"]>>>;
const DEFAULT_AI_STRATEGY: AiStrategy = "weighted-random";

@Injectable()
export class AiConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async pickCandidate(taskName: AiTaskName) {
    const dbTask = await this.findDbTask(taskName);
    if (!dbTask) {
      throw new Error(`ai task ${taskName} is not configured`);
    }

    return this.pickFromCandidates(
      await this.createDbCandidates(taskName, dbTask),
    );
  }

  async getTaskConfig(taskName: AiTaskName) {
    const dbTask = await this.findDbTask(taskName);
    if (!dbTask || !dbTask.enabled) {
      throw new Error(`ai task ${taskName} is not configured`);
    }

    return this.toTaskConfig(dbTask);
  }

  async getTaskSystemPrompt(taskName: AiTaskName) {
    const task = await this.getTaskConfig(taskName);
    const systemPrompt = task.systemPrompt?.trim();

    if (!systemPrompt) {
      throw new Error(`ai task ${taskName} systemPrompt is not configured`);
    }

    return systemPrompt;
  }

  private findDbTask(taskName: AiTaskName) {
    return this.prisma.aiTask.findUnique({
      where: { key: taskName },
    });
  }

  private async createDbCandidates(
    taskName: AiTaskName,
    taskRow: DbAiTask,
  ): Promise<ResolvedAiCandidate[]> {
    if (!taskRow.enabled) {
      throw new Error(`no ai candidate for task ${taskName}`);
    }

    const task = this.toTaskConfig(taskRow);
    const taskModels = await this.prisma.aiTaskModel.findMany({
      where: { taskId: taskRow.id, enabled: true },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const candidateResults = await Promise.all(
      taskModels.map(
        async (taskModel): Promise<ResolvedAiCandidate | undefined> => {
          const model = taskModel.model;

          if (!model || !model.enabled || !model.provider.enabled) {
            return undefined;
          }

          const provider = model.provider;
          const capabilities = this.parseCapabilities(model.capabilities);

          return {
            providerName: provider.key,
            modelName: model.key,
            provider: {
              type: provider.type as AiProviderConfig["type"],
              baseUrl: provider.baseUrl ?? undefined,
              apiKey: provider.apiKey ?? undefined,
              timeoutMs: provider.timeoutMs,
              imageTimeoutMs: provider.imageTimeoutMs,
              maxRetries: provider.maxRetries,
              models: {},
            },
            model: {
              id: model.modelId,
              capabilities,
              weight: taskModel.weight,
              supportsJsonMode: model.supportsJsonMode,
              supportsThinking: model.supportsThinking,
              pricing: this.parsePricing(model.pricing),
              enabled: model.enabled,
            },
            task,
          };
        },
      ),
    );

    const candidates = candidateResults
      .filter((candidate): candidate is ResolvedAiCandidate => !!candidate)
      .filter(
        (candidate) =>
          candidate.provider.apiKey &&
          candidate.model.capabilities.includes(task.mode),
      );

    if (candidates.length === 0) {
      throw new Error(`no ai candidate for task ${taskName}`);
    }

    return candidates;
  }

  private pickFromCandidates(candidates: ResolvedAiCandidate[]) {
    const strategy = candidates[0].task.strategy ?? DEFAULT_AI_STRATEGY;
    if (strategy === "first-available") {
      return candidates[0];
    }

    const totalWeight = candidates.reduce(
      (sum, candidate) => sum + candidate.model.weight,
      0,
    );
    let cursor = Math.random() * totalWeight;
    for (const candidate of candidates) {
      cursor -= candidate.model.weight;
      if (cursor <= 0) return candidate;
    }
    return candidates[candidates.length - 1];
  }

  private toTaskConfig(taskRow: DbAiTask): AiTaskConfig {
    return {
      mode: taskRow.mode as AiCapability,
      strategy: taskRow.strategy as AiStrategy | undefined,
      maxImages: taskRow.maxImages ?? undefined,
      maxTokens: taskRow.maxTokens ?? undefined,
      temperature: taskRow.temperature ?? undefined,
      systemPrompt: taskRow.systemPrompt ?? undefined,
      thinking: taskRow.thinking,
      jsonMode: taskRow.jsonMode,
    };
  }

  private parseCapabilities(value: Prisma.JsonValue): AiCapability[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is AiCapability => item === "text" || item === "image",
    );
  }

  private parsePricing(value: Prisma.JsonValue): AiModelPricing | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as AiModelPricing;
  }
}
