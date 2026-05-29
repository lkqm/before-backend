import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";

import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  appConfig,
  type AiTaskName,
  type ResolvedAiCandidate,
} from "../../config";
import { QuotaService } from "../quota/quota.service";
import {
  AiFeature,
  AiUsageStatus,
  type AiFeature as AiFeatureType,
  type AiUsageStatus as AiUsageStatusType,
} from "./ai.constants";
import { CaptionDto } from "./dto/caption.dto";
import { AiFeedbackDto } from "./dto/feedback.dto";
import { PickImagesDto } from "./dto/pick-images.dto";
import { RankImagesDto } from "./dto/rank-images.dto";
import { RewriteDto } from "./dto/rewrite.dto";
import type { ImageRankResult, PickImagesResult, UploadedImage } from "./types";

type CaptionItem = {
  style: "natural" | "daily" | "minimal" | "cute";
  text: string;
};

type AiResult = {
  items: CaptionItem[];
  imageSummary?: string;
};

type AiUsageMetadata = {
  textLength?: number;
  imageCount?: number;
  originalCount?: number;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatCompletionParams = Omit<
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  "model"
> & {
  thinking?: { type: "disabled" };
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
  ) {}

  async rewrite(userId: string, dto: RewriteDto) {
    const text = dto.text.trim();
    const quota = await this.quotaService.assertAndConsume(
      userId,
      AiFeature.rewrite,
    );
    const result = await this.runTextGeneration({
      userId,
      feature: AiFeature.rewrite,
      taskName: "rewrite",
      systemPrompt: this.getTaskSystemPrompt("rewrite"),
      userPrompt: `请把下面这段话改写成 3 条朋友圈文案：\n\n${dto.text}`,
      outputFormat:
        '{"items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}',
      metadata: this.createUsageMetadata({
        textLength: text.length,
      }),
    });

    return {
      aiUsageId: result.aiUsageId,
      items: result.items,
      remainingCredits: quota.balance,
    };
  }

  async caption(userId: string, dto: CaptionDto) {
    const hasImages = Boolean(dto.images?.length);
    if (!hasImages) {
      throw new BadRequestException("images is required");
    }

    const images = this.decodeImages(
      dto.images ?? [],
      1,
      appConfig.ai.tasks.caption.maxImages ?? 4,
    );
    const userNote = dto.userNote?.trim();
    const quota = await this.quotaService.assertAndConsume(
      userId,
      AiFeature.caption,
    );
    const result = await this.runImageCaptionGeneration({
      userId,
      images,
      scene: dto.scene?.trim(),
      userNote,
      locationLabel: dto.locationLabel?.trim(),
      timeLabel: dto.timeLabel?.trim(),
      metadata: this.createUsageMetadata({
        textLength: userNote?.length,
        imageCount: images.length,
      }),
    });

    return {
      ...result,
      remainingCredits: quota.balance,
    };
  }

  async rankImages(userId: string, dto: RankImagesDto) {
    const images = this.decodeImages(dto.images, 2);

    const quota = await this.quotaService.assertAndConsume(
      userId,
      AiFeature.image_rank,
    );
    const result = await this.runImageRankGeneration({
      userId,
      images,
      metadata: this.createUsageMetadata({
        imageCount: images.length,
      }),
    });

    return {
      ...result,
      remainingCredits: quota.balance,
    };
  }

  async pickImages(userId: string, dto: PickImagesDto) {
    const images = this.decodeImages(
      dto.images,
      2,
      appConfig.ai.tasks.pickImage.maxImages ?? 12,
    );
    const userNote = dto.userNote?.trim();

    const quota = await this.quotaService.assertAndConsume(
      userId,
      AiFeature.pick_image,
    );
    const result = await this.runPickImagesGeneration({
      userId,
      images,
      originalCount: dto.originalCount,
      userNote,
      locationLabel: dto.locationLabel?.trim(),
      timeLabel: dto.timeLabel?.trim(),
      metadata: this.createUsageMetadata({
        textLength: userNote?.length,
        imageCount: images.length,
        originalCount: dto.originalCount,
      }),
    });

    return {
      ...result,
      remainingCredits: quota.balance,
    };
  }

  async feedback(userId: string, dto: AiFeedbackDto) {
    const aiUsage = await this.prisma.aiUsage.findFirst({
      where: {
        id: dto.aiUsageId,
        userId,
      },
      select: { id: true },
    });

    if (!aiUsage) {
      throw new AppException(
        AppErrorCode.Forbidden,
        "ai usage forbidden",
        HttpStatus.FORBIDDEN,
      );
    }

    const feedback = await this.prisma.aiFeedback.upsert({
      where: { aiUsageId: dto.aiUsageId },
      update: {
        result: dto.result,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      create: {
        userId,
        aiUsageId: dto.aiUsageId,
        result: dto.result,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    });

    return feedback;
  }

  private async runTextGeneration(params: {
    userId: string;
    feature: AiFeatureType;
    taskName: AiTaskName;
    systemPrompt: string;
    userPrompt: string;
    outputFormat?: string;
    metadata?: AiUsageMetadata;
  }): Promise<AiResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const candidate = await this.pickCandidateOrRefund({
      taskName: params.taskName,
      requestId,
      startedAt,
      userId: params.userId,
      feature: params.feature,
    });
    const providerConfig = this.getProviderConfig(candidate);

    if (!providerConfig.apiKey) {
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
        metadata: params.metadata,
      });
      throw new AppException(
        AppErrorCode.AiProviderNotConfigured,
        "ai provider is not configured",
      );
    }

    try {
      const aiRequestStartedAt = Date.now();
      const completion = await this.createChatCompletion(providerConfig, {
        max_tokens: candidate.task.maxTokens,
        ...(this.shouldUseJsonMode(candidate)
          ? { response_format: { type: "json_object" as const } }
          : {}),
        ...(this.shouldDisableThinking(candidate)
          ? { thinking: { type: "disabled" as const } }
          : {}),
        temperature: candidate.task.temperature,
        messages: [
          { role: "system", content: params.systemPrompt },
          {
            role: "user",
            content:
              `${params.userPrompt}\n\n只返回 JSON，格式：` +
              (params.outputFormat ??
                '{"items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}'),
          },
        ],
      });
      const aiLatencyMs = Date.now() - aiRequestStartedAt;
      const reasoningTokens = this.getReasoningTokens(completion);
      const content = completion.choices[0]?.message?.content;
      const parsed = this.parseResult(content);

      const usageRecordStartedAt = Date.now();
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.success,
        latencyMs: Date.now() - startedAt,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        metadata: params.metadata,
      });
      const usageRecordLatencyMs = Date.now() - usageRecordStartedAt;

      this.logger.log(
        `AI text generation completed requestId=${requestId} feature=${params.feature} provider=${providerConfig.provider} model=${providerConfig.model} aiLatencyMs=${aiLatencyMs} usageRecordLatencyMs=${usageRecordLatencyMs} totalLatencyMs=${Date.now() - startedAt} inputTokens=${completion.usage?.prompt_tokens ?? 0} outputTokens=${completion.usage?.completion_tokens ?? 0} reasoningTokens=${reasoningTokens ?? 0}`,
      );

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      const status = this.isTimeoutError(error)
        ? AiUsageStatus.timeout
        : AiUsageStatus.failed;
      this.logger.warn(
        `AI text generation failed requestId=${requestId} feature=${params.feature} provider=${providerConfig.provider} model=${providerConfig.model} status=${status} totalLatencyMs=${Date.now() - startedAt} error=${this.formatErrorForLog(error)}`,
      );
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
        metadata: params.metadata,
      });
      throw this.toAiException(error);
    }
  }

  private async runImageRankGeneration(params: {
    userId: string;
    images: UploadedImage[];
    metadata?: AiUsageMetadata;
  }): Promise<ImageRankResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const candidate = await this.pickCandidateOrRefund({
      taskName: "imageRank",
      requestId,
      startedAt,
      userId: params.userId,
      feature: AiFeature.image_rank,
    });
    const providerConfig = this.getProviderConfig(candidate, "image");

    if (!providerConfig.apiKey) {
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.image_rank,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
        metadata: params.metadata,
      });
      throw new AppException(
        AppErrorCode.AiProviderNotConfigured,
        "ai provider is not configured",
      );
    }

    try {
      const content: ChatContentPart[] = [
        {
          type: "text",
          text:
            "请完成：\n" +
            "1. 选出最适合作为朋友圈首图的图片\n" +
            "2. 给出推荐发布顺序\n" +
            "3. 每张图给一句非常短的理由\n\n" +
            "输出规则：\n" +
            "- 必须使用输入里的 imageId\n" +
            "- orderedImageIds 必须包含全部 imageId，不能新增，不能遗漏\n" +
            "- 不要输出解释文字\n" +
            "- 只返回 JSON\n\n" +
            'JSON 格式：{"coverImageId":"imageId","orderedImageIds":["imageId"],"reasons":[{"imageId":"imageId","reason":"主体清晰，适合作为首图"}]}',
        },
      ];

      params.images.forEach((image, index) => {
        content.push({
          type: "text",
          text: `图片 ${index + 1}，imageId: ${image.id}`,
        });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
          },
        });
      });

      const completion = await this.createChatCompletion(providerConfig, {
        max_tokens: candidate.task.maxTokens,
        ...(this.shouldUseJsonMode(candidate)
          ? { response_format: { type: "json_object" as const } }
          : {}),
        ...(this.shouldDisableThinking(candidate)
          ? { thinking: { type: "disabled" as const } }
          : {}),
        temperature: candidate.task.temperature,
        messages: [
          {
            role: "system",
            content: this.getTaskSystemPrompt("imageRank"),
          },
          {
            role: "user",
            content,
          },
        ],
      });
      const contentText = completion.choices[0]?.message?.content;
      const parsed = this.parseImageRankResult(
        contentText,
        params.images.map((image) => image.id),
      );

      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.image_rank,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.success,
        latencyMs: Date.now() - startedAt,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        metadata: params.metadata,
      });

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      this.logger.warn(
        `AI image rank generation failed requestId=${requestId} provider=${providerConfig.provider} model=${providerConfig.model} totalLatencyMs=${Date.now() - startedAt} error=${this.formatErrorForLog(error)}`,
      );
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.image_rank,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
        metadata: params.metadata,
      });
      throw this.toAiException(error);
    }
  }

  private async runPickImagesGeneration(params: {
    userId: string;
    images: UploadedImage[];
    originalCount: number;
    userNote?: string;
    locationLabel?: string;
    timeLabel?: string;
    metadata?: AiUsageMetadata;
  }): Promise<PickImagesResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const candidate = await this.pickCandidateOrRefund({
      taskName: "pickImage",
      requestId,
      startedAt,
      userId: params.userId,
      feature: AiFeature.pick_image,
    });
    const providerConfig = this.getProviderConfig(candidate, "image");

    if (!providerConfig.apiKey) {
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.pick_image,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
        metadata: params.metadata,
      });
      throw new AppException(
        AppErrorCode.AiProviderNotConfigured,
        "ai provider is not configured",
      );
    }

    try {
      const contextText =
        [
          `用户原始选择 ${params.originalCount} 张，前端本地初筛后给你 ${params.images.length} 张候选图。`,
          params.locationLabel ? `地点：${params.locationLabel}` : "",
          params.timeLabel ? `时间：${params.timeLabel}` : "",
          params.userNote ? `用户想表达：${params.userNote}` : "",
        ]
          .filter(Boolean)
          .join("\n") || "没有额外上下文。";
      const content: ChatContentPart[] = [
        {
          type: "text",
          text:
            "请帮用户从候选图里挑出适合发微信朋友圈的图片方案，并顺便给每个方案一条很短的朋友圈文案。\n\n" +
            "任务：\n" +
            "1. 返回 1 到 3 个发图方案\n" +
            "2. 每个方案决定发哪几张、顺序、首图\n" +
            "3. 每个方案给一句短理由和一条自然朋友圈文案\n" +
            "4. 给出不建议发的图片及原因\n\n" +
            "输出规则：\n" +
            "- 只返回 JSON，不要解释文字\n" +
            "- 所有 imageId 必须来自输入\n" +
            "- 每个方案最多 9 张，不要为了凑数量硬选\n" +
            "- coverImageId 必须在该方案 imageIds 内\n" +
            "- 方案之间要有明显差异\n" +
            "- 文案不要小红书感，不要像图片描述\n\n" +
            `上下文：\n${contextText}\n\n` +
            'JSON 格式：{"imageSummary":"...","plans":[{"title":"精选 4 张","coverImageId":"imageId","imageIds":["imageId"],"reason":"...","caption":{"style":"natural","text":"..."}}],"rejected":[{"imageId":"imageId","reason":"..."}]}',
        },
      ];

      params.images.forEach((image, index) => {
        content.push({
          type: "text",
          text: [
            `图片 ${index + 1}，imageId: ${image.id}`,
            image.width && image.height
              ? `尺寸：${image.width}x${image.height}`
              : "",
            image.localScore !== undefined
              ? `本地质量分：${image.localScore.toFixed(2)}`
              : "",
            image.clusterId ? `相似组：${image.clusterId}` : "",
            image.flags?.length ? `本地标记：${image.flags.join(",")}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
          },
        });
      });

      const aiRequestStartedAt = Date.now();
      const completion = await this.createChatCompletion(providerConfig, {
        ...(this.shouldDisableThinking(candidate)
          ? { thinking: { type: "disabled" as const } }
          : {}),
        max_tokens: candidate.task.maxTokens,
        temperature: candidate.task.temperature,
        ...(this.shouldUseJsonMode(candidate)
          ? { response_format: { type: "json_object" as const } }
          : {}),
        messages: [
          {
            role: "system",
            content: this.getTaskSystemPrompt("pickImage"),
          },
          {
            role: "user",
            content,
          },
        ],
      });
      const aiLatencyMs = Date.now() - aiRequestStartedAt;
      const reasoningTokens = this.getReasoningTokens(completion);
      const contentText = completion.choices[0]?.message?.content;
      const parsed = this.parsePickImagesResult(
        contentText,
        params.images.map((image) => image.id),
      );

      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.pick_image,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.success,
        latencyMs: Date.now() - startedAt,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        metadata: params.metadata,
      });

      this.logger.log(
        `AI image pick generation completed requestId=${requestId} provider=${providerConfig.provider} model=${providerConfig.model} imageCount=${params.images.length} aiLatencyMs=${aiLatencyMs} totalLatencyMs=${Date.now() - startedAt} inputTokens=${completion.usage?.prompt_tokens ?? 0} outputTokens=${completion.usage?.completion_tokens ?? 0} reasoningTokens=${reasoningTokens ?? 0}`,
      );

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      this.logger.warn(
        `AI image pick generation failed requestId=${requestId} provider=${providerConfig.provider} model=${providerConfig.model} totalLatencyMs=${Date.now() - startedAt} error=${this.formatErrorForLog(error)}`,
      );
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.pick_image,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
        metadata: params.metadata,
      });
      throw this.toAiException(error);
    }
  }

  private async runImageCaptionGeneration(params: {
    userId: string;
    images: UploadedImage[];
    scene?: string;
    userNote?: string;
    locationLabel?: string;
    timeLabel?: string;
    metadata?: AiUsageMetadata;
  }): Promise<AiResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const candidate = await this.pickCandidateOrRefund({
      taskName: "caption",
      requestId,
      startedAt,
      userId: params.userId,
      feature: AiFeature.caption,
    });
    const providerConfig = this.getProviderConfig(candidate, "image");

    if (!providerConfig.apiKey) {
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.caption,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
        metadata: params.metadata,
      });
      throw new AppException(
        AppErrorCode.AiProviderNotConfigured,
        "ai provider is not configured",
      );
    }

    try {
      const contextText =
        [
          params.scene ? `场景：${params.scene}` : "",
          params.locationLabel ? `地点：${params.locationLabel}` : "",
          params.timeLabel ? `时间：${params.timeLabel}` : "",
          params.userNote ? `用户想表达：${params.userNote}` : "",
        ]
          .filter(Boolean)
          .join("\n") || "没有额外上下文。";
      const content: ChatContentPart[] = [
        {
          type: "text",
          text:
            "请根据图片和上下文完成：\n" +
            "1. 用 30 个字以内总结这组图片的整体场景\n" +
            "2. 生成 3 条中文朋友圈文案\n\n" +
            "输出规则：\n" +
            "- 只返回 JSON\n\n" +
            `上下文：\n${contextText}\n\n` +
            'JSON 格式：{"imageSummary":"...","items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}',
        },
      ];

      params.images.forEach((image, index) => {
        content.push({
          type: "text",
          text: `图片 ${index + 1}，imageId: ${image.id}`,
        });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
          },
        });
      });

      const aiRequestStartedAt = Date.now();
      const completion = await this.createChatCompletion(providerConfig, {
        ...(this.shouldDisableThinking(candidate)
          ? { thinking: { type: "disabled" as const } }
          : {}),
        max_tokens: candidate.task.maxTokens,
        temperature: candidate.task.temperature,
        ...(this.shouldUseJsonMode(candidate)
          ? { response_format: { type: "json_object" as const } }
          : {}),
        messages: [
          {
            role: "system",
            content: this.getTaskSystemPrompt("caption"),
          },
          {
            role: "user",
            content,
          },
        ],
      });
      const aiLatencyMs = Date.now() - aiRequestStartedAt;
      const reasoningTokens = this.getReasoningTokens(completion);
      const contentText = completion.choices[0]?.message?.content;
      const parsed = this.parseImageCaptionResult(contentText);

      const usageRecordStartedAt = Date.now();
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.caption,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.success,
        latencyMs: Date.now() - startedAt,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        metadata: params.metadata,
      });
      const usageRecordLatencyMs = Date.now() - usageRecordStartedAt;

      this.logger.log(
        `AI image caption generation completed requestId=${requestId} provider=${providerConfig.provider} model=${providerConfig.model} imageCount=${params.images.length} aiLatencyMs=${aiLatencyMs} usageRecordLatencyMs=${usageRecordLatencyMs} totalLatencyMs=${Date.now() - startedAt} inputTokens=${completion.usage?.prompt_tokens ?? 0} outputTokens=${completion.usage?.completion_tokens ?? 0} reasoningTokens=${reasoningTokens ?? 0}`,
      );

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      this.logger.warn(
        `AI image caption generation failed requestId=${requestId} provider=${providerConfig.provider} model=${providerConfig.model} totalLatencyMs=${Date.now() - startedAt} error=${this.formatErrorForLog(error)}`,
      );
      await this.recordFailedUsageAndRefund({
        requestId,
        userId: params.userId,
        feature: AiFeature.caption,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
        metadata: params.metadata,
      });
      throw this.toAiException(error);
    }
  }

  private createChatCompletion(
    providerConfig: ReturnType<AiService["getProviderConfig"]>,
    params: ChatCompletionParams,
  ) {
    const client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
      maxRetries: providerConfig.maxRetries,
      timeout: providerConfig.timeoutMs,
    });

    return client.chat.completions.create({
      model: providerConfig.model,
      ...params,
    });
  }

  private getTaskSystemPrompt(taskName: AiTaskName) {
    const systemPrompt = appConfig.ai.tasks[taskName].systemPrompt?.trim();
    if (!systemPrompt) {
      throw new Error(`ai task ${taskName} systemPrompt is not configured`);
    }
    return systemPrompt;
  }

  private getReasoningTokens(
    completion: OpenAI.Chat.Completions.ChatCompletion,
  ) {
    const usage = completion.usage as
      | (OpenAI.Completions.CompletionUsage & {
          completion_tokens_details?: { reasoning_tokens?: number };
        })
      | undefined;
    return usage?.completion_tokens_details?.reasoning_tokens;
  }

  private getProviderConfig(
    candidate: ResolvedAiCandidate,
    kind: "text" | "image" = "text",
  ) {
    return {
      provider: candidate.providerName,
      apiKey: candidate.provider.apiKey,
      model: candidate.model.id,
      baseURL: candidate.provider.baseUrl,
      timeoutMs:
        kind === "image"
          ? candidate.provider.imageTimeoutMs
          : candidate.provider.timeoutMs,
      maxRetries: candidate.provider.maxRetries,
    };
  }

  private pickCandidate(taskName: AiTaskName) {
    const task = appConfig.ai.tasks[taskName];
    const candidates: ResolvedAiCandidate[] = Object.entries(
      appConfig.ai.providers,
    ).flatMap(([providerName, provider]) =>
      Object.entries(provider.models)
        .filter(
          ([, model]) =>
            model.enabled !== false &&
            model.capabilities.includes(task.mode) &&
            provider.apiKey,
        )
        .map(([modelName, model]) => ({
          providerName,
          modelName,
          provider,
          model,
          task,
        })),
    );

    if (candidates.length === 0) {
      throw new Error(`no ai candidate for task ${taskName}`);
    }

    const strategy = task.strategy ?? appConfig.ai.strategy;
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

  private async pickCandidateOrRefund(params: {
    taskName: AiTaskName;
    requestId: string;
    startedAt: number;
    userId: string;
    feature: AiFeatureType;
  }) {
    try {
      return this.pickCandidate(params.taskName);
    } catch (error) {
      await this.recordFailedUsageAndRefund({
        requestId: params.requestId,
        userId: params.userId,
        feature: params.feature,
        provider: "unknown",
        model: "unknown",
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - params.startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      });
      throw this.toAiException(error);
    }
  }

  private shouldUseJsonMode(candidate: ResolvedAiCandidate) {
    return candidate.task.jsonMode && candidate.model.supportsJsonMode;
  }

  private shouldDisableThinking(candidate: ResolvedAiCandidate) {
    return !candidate.task.thinking && candidate.model.supportsThinking;
  }

  private parseResult(content: string | null | undefined): AiResult {
    if (!content) {
      throw new Error("empty ai response");
    }

    const parsed = JSON.parse(content) as AiResult;
    const items = this.parseTextItems(parsed.items);
    if (items.length === 0) {
      throw new Error("invalid ai response");
    }

    return {
      items,
    };
  }

  private parseImageRankResult(
    content: string | null | undefined,
    imageIds: string[],
  ): ImageRankResult {
    if (!content) {
      throw new Error("empty ai response");
    }

    const parsed = JSON.parse(content) as ImageRankResult;
    const expectedIds = new Set(imageIds);
    const orderedIds = parsed.orderedImageIds || [];
    const orderedSet = new Set(orderedIds);

    if (!expectedIds.has(parsed.coverImageId)) {
      throw new Error("invalid coverImageId");
    }
    if (orderedIds.length !== imageIds.length) {
      throw new Error("invalid orderedImageIds length");
    }
    if (orderedSet.size !== imageIds.length) {
      throw new Error("duplicated orderedImageIds");
    }
    for (const imageId of imageIds) {
      if (!orderedSet.has(imageId)) {
        throw new Error("orderedImageIds missing input imageId");
      }
    }

    return {
      coverImageId: parsed.coverImageId,
      orderedImageIds: orderedIds,
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons
            .filter((item) => expectedIds.has(item.imageId))
            .map((item) => ({
              imageId: item.imageId,
              reason: String(item.reason || "").slice(0, 40),
            }))
        : [],
    };
  }

  private parseImageCaptionResult(
    content: string | null | undefined,
  ): AiResult {
    if (!content) {
      throw new Error("empty ai response");
    }

    const parsed = JSON.parse(content) as AiResult;
    const items = this.parseTextItems(parsed.items);

    if (items.length === 0) {
      throw new Error("invalid ai response");
    }

    return {
      imageSummary: String(parsed.imageSummary || "").slice(0, 30),
      items,
    };
  }

  private parseTextItems(items: unknown): CaptionItem[] {
    const validStyles = new Set(["natural", "daily", "minimal"]);
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const style = (item as { style?: unknown }).style;
        const text = (item as { text?: unknown }).text;
        if (typeof style !== "string" || !validStyles.has(style)) return null;
        if (typeof text !== "string") return null;

        const trimmedText = text.trim();
        if (!trimmedText) return null;

        return {
          style: style as CaptionItem["style"],
          text: trimmedText.slice(0, 120),
        };
      })
      .filter((item): item is CaptionItem => Boolean(item))
      .slice(0, 3);
  }

  private parsePickImagesResult(
    content: string | null | undefined,
    imageIds: string[],
  ): PickImagesResult {
    if (!content) {
      throw new Error("empty ai response");
    }

    const parsed = JSON.parse(content) as PickImagesResult;
    const expectedIds = new Set(imageIds);
    const validStyles = new Set(["natural", "daily", "minimal"]);
    const plans = Array.isArray(parsed.plans)
      ? parsed.plans
          .slice(0, 3)
          .map((plan) => {
            const ids = Array.isArray(plan.imageIds)
              ? plan.imageIds.filter((id) => expectedIds.has(id))
              : [];
            const uniqueIds = [...new Set(ids)].slice(0, 9);
            if (
              uniqueIds.length === 0 ||
              !expectedIds.has(plan.coverImageId) ||
              !uniqueIds.includes(plan.coverImageId) ||
              !plan.caption?.text ||
              !validStyles.has(plan.caption.style)
            ) {
              return null;
            }

            return {
              title: String(plan.title || `精选 ${uniqueIds.length} 张`).slice(
                0,
                12,
              ),
              coverImageId: plan.coverImageId,
              imageIds: uniqueIds,
              reason: String(plan.reason || "").slice(0, 40),
              caption: {
                style: plan.caption.style,
                text: String(plan.caption.text).slice(0, 120),
              },
            };
          })
          .filter((plan): plan is PickImagesResult["plans"][number] =>
            Boolean(plan),
          )
      : [];

    if (plans.length === 0) {
      throw new Error("invalid ai response");
    }

    return {
      imageSummary: String(parsed.imageSummary || "").slice(0, 30),
      plans,
      rejected: Array.isArray(parsed.rejected)
        ? parsed.rejected
            .filter((item) => expectedIds.has(item.imageId))
            .slice(0, imageIds.length)
            .map((item) => ({
              imageId: item.imageId,
              reason: String(item.reason || "").slice(0, 40),
            }))
        : [],
    };
  }

  private decodeImages(
    images: Array<
      RankImagesDto["images"][number] & {
        width?: number;
        height?: number;
        localScore?: number;
        clusterId?: string;
        flags?: string[];
      }
    >,
    minCount: 1 | 2,
    maxCount = 9,
  ) {
    if (images.length < minCount || images.length > maxCount) {
      throw new BadRequestException(
        `images must contain ${minCount} to ${maxCount} items`,
      );
    }
    if (new Set(images.map((image) => image.id)).size !== images.length) {
      throw new BadRequestException("image ids must be unique");
    }

    return images.map((image) => {
      const base64 = image.base64.includes(",")
        ? image.base64.split(",").pop() || ""
        : image.base64;
      const buffer = Buffer.from(base64, "base64");

      if (buffer.length === 0) {
        throw new BadRequestException("image is empty");
      }
      if (buffer.length > 512 * 1024) {
        throw new AppException(
          AppErrorCode.ImageTooLarge,
          "image is too large",
          400,
        );
      }

      return {
        id: image.id,
        mimeType: image.mimeType,
        buffer,
        width: image.width,
        height: image.height,
        localScore: image.localScore,
        clusterId: image.clusterId,
        flags: image.flags,
      };
    });
  }

  private recordUsage(params: {
    requestId: string;
    userId: string;
    provider: string;
    feature: AiFeatureType;
    model: string;
    status: AiUsageStatusType;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    errorMessage?: string;
    metadata?: AiUsageMetadata;
  }) {
    return this.prisma.aiUsage.create({
      data: {
        requestId: params.requestId,
        userId: params.userId,
        provider: params.provider,
        feature: params.feature,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        status: params.status,
        latencyMs: params.latencyMs,
        errorMessage: this.truncateErrorMessage(params.errorMessage),
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    });
  }

  private createUsageMetadata(metadata: AiUsageMetadata) {
    const normalized: AiUsageMetadata = {};
    for (const [key, value] of Object.entries(metadata) as Array<
      [keyof AiUsageMetadata, number | undefined]
    >) {
      if (typeof value === "number" && value > 0) {
        normalized[key] = value;
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private async recordUsageSafely(
    params: Parameters<AiService["recordUsage"]>[0],
  ) {
    try {
      return await this.recordUsage(params);
    } catch (error) {
      this.logger.error(
        `AI usage record failed requestId=${params.requestId} feature=${params.feature} status=${params.status} error=${this.formatErrorForLog(error)}`,
      );
      return null;
    }
  }

  private async recordFailedUsageAndRefund(
    params: Parameters<AiService["recordUsage"]>[0],
  ) {
    const usage = await this.recordUsageSafely(params);
    await this.refundConsumedCreditSafely({
      userId: params.userId,
      feature: params.feature,
      requestId: params.requestId,
      aiUsageId: usage?.id,
      errorMessage: params.errorMessage,
    });
  }

  private async refundConsumedCreditSafely(params: {
    userId: string;
    feature: AiFeatureType;
    requestId: string;
    aiUsageId?: string;
    errorMessage?: string;
  }) {
    try {
      await this.quotaService.refundConsumedCredit(
        params.userId,
        params.feature,
        {
          requestId: params.requestId,
          aiUsageId: params.aiUsageId,
          metadata: {
            requestId: params.requestId,
            errorMessage: this.truncateErrorMessage(params.errorMessage),
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `AI credit refund failed requestId=${params.requestId} feature=${params.feature} aiUsageId=${params.aiUsageId ?? ""} error=${this.formatErrorForLog(error)}`,
      );
    }
  }

  private truncateErrorMessage(message: string | undefined) {
    return message?.slice(0, 2000);
  }

  private toAiException(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (this.isTimeoutError(error)) {
      return new AppException(
        AppErrorCode.AiProviderTimeout,
        "ai provider timeout",
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    if (
      message.includes("invalid ai response") ||
      message.includes("empty ai response") ||
      message.includes("JSON")
    ) {
      return new AppException(
        AppErrorCode.AiInvalidResponse,
        "ai invalid response",
      );
    }

    return new AppException(AppErrorCode.AiProviderError, "ai provider error");
  }

  private formatErrorForLog(error: unknown) {
    if (!(error instanceof Error)) return "unknown error";

    const extra = error as Error & {
      status?: number;
      code?: string;
      type?: string;
    };
    return [
      `name=${error.name}`,
      `message=${error.message}`,
      extra.status ? `providerStatus=${extra.status}` : "",
      extra.code ? `providerCode=${extra.code}` : "",
      extra.type ? `providerType=${extra.type}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private isTimeoutError(error: unknown) {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("aborted")
    );
  }
}
