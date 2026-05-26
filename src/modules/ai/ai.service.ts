import { randomUUID } from "node:crypto";

import { BadRequestException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiFeature, AiUsageStatus, Prisma } from "@prisma/client";
import OpenAI from "openai";

import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QuotaService } from "../quota/quota.service";
import { AiLockService } from "./ai-lock.service";
import { CaptionDto } from "./dto/caption.dto";
import { AiFeedbackDto } from "./dto/feedback.dto";
import { RankImagesDto } from "./dto/rank-images.dto";
import { RewriteDto } from "./dto/rewrite.dto";
import type { ImageRankResult, UploadedImage } from "./types";

type CaptionItem = {
  style: "natural" | "daily" | "minimal" | "cute";
  text: string;
};

type AiResult = {
  items: CaptionItem[];
  imageSummary?: string;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly aiLockService: AiLockService,
  ) {}

  async rewrite(userId: string, dto: RewriteDto) {
    return this.aiLockService.runExclusive(userId, async () => {
      const quota = await this.quotaService.assertAndConsume(
        userId,
        AiFeature.ai,
      );
      const result = await this.runTextGeneration({
        userId,
        feature: AiFeature.rewrite,
        systemPrompt:
          "你是一个朋友圈文案编辑，只输出自然、日常、克制的中文朋友圈表达。不要像广告，不要像小红书，不要解释。",
        userPrompt: `把下面这段话改写成 3 条更有朋友圈感的文案。每条尽量短，自然，不要过度抒情。\n\n${dto.text}`,
      });

      return {
        aiUsageId: result.aiUsageId,
        items: result.items,
        quotaLeft: quota.left,
      };
    });
  }

  async caption(userId: string, dto: CaptionDto) {
    return this.aiLockService.runExclusive(userId, async () => {
      const scene = dto.scene?.trim();
      const hasImages = Boolean(dto.images?.length);
      if (!scene && !hasImages) {
        throw new BadRequestException("scene or images is required");
      }

      const quota = await this.quotaService.assertAndConsume(
        userId,
        AiFeature.ai,
      );
      const result = hasImages
        ? await this.runImageCaptionGeneration({
            userId,
            images: this.decodeImages(dto.images ?? [], 1),
            scene,
            userNote: dto.userNote?.trim(),
            locationLabel: dto.locationLabel?.trim(),
            timeLabel: dto.timeLabel?.trim(),
          })
        : await this.runTextGeneration({
            userId,
            feature: AiFeature.caption,
            systemPrompt:
              "你是一个朋友圈文案编辑，根据用户给的场景生成自然、日常、克制的中文朋友圈表达。不要像广告，不要像作文，不要解释。",
            userPrompt: `根据这个场景生成 3 条朋友圈文案：${scene}`,
          });

      return {
        ...result,
        quotaLeft: quota.left,
      };
    });
  }

  async rankImages(userId: string, dto: RankImagesDto) {
    return this.aiLockService.runExclusive(userId, async () => {
      const images = this.decodeImages(dto.images, 2);

      const quota = await this.quotaService.assertAndConsume(
        userId,
        AiFeature.ai,
      );
      const result = await this.runImageRankGeneration({
        userId,
        images,
      });

      return {
        ...result,
        quotaLeft: quota.left,
      };
    });
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
    feature: AiFeature;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<AiResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const providerConfig = this.getProviderConfig("text");

    if (!providerConfig.apiKey) {
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
      });
      throw new AppException(
        AppErrorCode.AiProviderNotConfigured,
        "ai provider is not configured",
      );
    }

    try {
      const completion = await this.createChatCompletion(providerConfig, {
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          {
            role: "user",
            content:
              `${params.userPrompt}\n\n只返回 JSON，格式：` +
              '{"items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}',
          },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      const parsed = this.parseResult(content);

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
      });

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      });
      throw this.toAiException(error);
    }
  }

  private async runImageRankGeneration(params: {
    userId: string;
    images: UploadedImage[];
  }): Promise<ImageRankResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const providerConfig = this.getProviderConfig("image");

    if (!providerConfig.apiKey) {
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.image_rank,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
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
            "你是朋友圈图片排序助手。目标是让这组图片发朋友圈时第一眼更舒服。\n" +
            "请根据每张图片的主体清晰度、构图、情绪、氛围、色彩连续性和内容重复度：\n" +
            "1. 选出最适合作为朋友圈首图的图片\n" +
            "2. 给出推荐发布顺序\n" +
            "3. 每张图给一句非常短的理由\n\n" +
            "规则：\n" +
            "- 必须使用输入里的 imageId\n" +
            "- orderedImageIds 必须包含全部 imageId，不能新增，不能遗漏\n" +
            "- 不要建议删除图片\n" +
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
        response_format: { type: "json_object" },
        messages: [
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
      });

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.image_rank,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
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
  }): Promise<AiResult & { aiUsageId: string }> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const providerConfig = this.getProviderConfig("image");

    if (!providerConfig.apiKey) {
      const usage = await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.caption,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI_API_KEY is not configured",
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
            "你是一个朋友圈文案助手。根据图片、场景、地点、时间和用户补充生成朋友圈文案。\n\n" +
            "输出目标：\n" +
            "1. 总结这组图片的整体场景\n" +
            "2. 生成 3 条中文朋友圈文案：自然、简短、可爱\n\n" +
            "文案规则：\n" +
            "- 像真实朋友圈，不要像广告、小红书标题或作文\n" +
            "- 不要解释，不要输出 hashtag\n" +
            "- 可以少量 emoji，但不要堆砌\n" +
            "- 如果用户补充了想表达的内容，要优先贴合\n\n" +
            "- 只返回 JSON\n\n" +
            `上下文：\n${contextText}\n\n` +
            'JSON 格式：{"imageSummary":"...","items":[{"style":"natural","text":"..."},{"style":"minimal","text":"..."},{"style":"cute","text":"..."}]}',
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
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content,
          },
        ],
      });
      const contentText = completion.choices[0]?.message?.content;
      const parsed = this.parseImageCaptionResult(contentText);

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
      });

      return {
        ...parsed,
        aiUsageId: usage.id,
      };
    } catch (error) {
      await this.recordUsage({
        requestId,
        userId: params.userId,
        feature: AiFeature.caption,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      });
      throw this.toAiException(error);
    }
  }

  private createChatCompletion(
    providerConfig: ReturnType<AiService["getProviderConfig"]>,
    params: Omit<
      OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      "model"
    >,
  ) {
    const client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    });

    return client.chat.completions.create({
      model: providerConfig.model,
      ...params,
    });
  }

  private getProviderConfig(kind: "text" | "image") {
    const prefix = kind === "text" ? "TEXT_AI" : "IMAGE_AI";
    const provider =
      this.readConfig(`${prefix}_PROVIDER`) ??
      this.readConfig("AI_PROVIDER") ??
      "openai";
    const apiKey =
      this.readConfig(`${prefix}_API_KEY`) ??
      this.readConfig("AI_API_KEY") ??
      this.readConfig("OPENAI_API_KEY");
    const model =
      this.readConfig(`${prefix}_MODEL`) ??
      this.readConfig("AI_MODEL") ??
      this.readConfig("OPENAI_MODEL") ??
      "gpt-4.1-mini";
    const baseURL =
      this.readConfig(`${prefix}_BASE_URL`) ?? this.readConfig("AI_BASE_URL");

    return {
      provider,
      apiKey,
      model,
      baseURL,
    };
  }

  private readConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : undefined;
  }

  private parseResult(content: string | null | undefined): AiResult {
    if (!content) {
      throw new Error("empty ai response");
    }

    const parsed = JSON.parse(content) as AiResult;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error("invalid ai response");
    }

    return {
      items: parsed.items.slice(0, 3).map((item) => ({
        style: item.style,
        text: item.text,
      })),
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
    const validStyles = new Set(["natural", "minimal", "cute"]);
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((item) => validStyles.has(item.style) && item.text)
          .slice(0, 3)
          .map((item) => ({
            style: item.style,
            text: String(item.text).slice(0, 120),
          }))
      : [];

    if (items.length === 0) {
      throw new Error("invalid ai response");
    }

    return {
      imageSummary: String(parsed.imageSummary || "").slice(0, 120),
      items,
    };
  }

  private decodeImages(images: RankImagesDto["images"], minCount: 1 | 2) {
    if (images.length < minCount || images.length > 9) {
      throw new BadRequestException(
        `images must contain ${minCount} to 9 items`,
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
      if (buffer.length > 800 * 1024) {
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
      };
    });
  }

  private recordUsage(params: {
    requestId: string;
    userId: string;
    provider: string;
    feature: AiFeature;
    model: string;
    status: AiUsageStatus;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    errorMessage?: string;
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
        errorMessage: params.errorMessage?.slice(0, 500),
      },
      select: { id: true },
    });
  }

  private toAiException(error: unknown) {
    const message = error instanceof Error ? error.message : "";
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
}
