import { randomUUID } from 'node:crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature, AiUsageStatus } from '@prisma/client';
import OpenAI from 'openai';

import { PrismaService } from '../../common/prisma/prisma.service';
import { QuotaService } from '../quota/quota.service';
import { CaptionDto } from './dto/caption.dto';
import { RewriteDto } from './dto/rewrite.dto';

type CaptionItem = {
  style: 'natural' | 'daily' | 'minimal';
  text: string;
};

type AiResult = {
  items: CaptionItem[];
};

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
  ) {}

  async rewrite(dto: RewriteDto) {
    const quota = await this.quotaService.assertAndConsume(
      dto.deviceId,
      AiFeature.ai,
    );
    const result = await this.runTextGeneration({
      deviceId: dto.deviceId,
      feature: AiFeature.rewrite,
      systemPrompt:
        '你是一个朋友圈文案编辑，只输出自然、日常、克制的中文朋友圈表达。不要像广告，不要像小红书，不要解释。',
      userPrompt: `把下面这段话改写成 3 条更有朋友圈感的文案。每条尽量短，自然，不要过度抒情。\n\n${dto.text}`,
    });

    return {
      items: result.items,
      quotaLeft: quota.left,
    };
  }

  async caption(dto: CaptionDto) {
    const quota = await this.quotaService.assertAndConsume(
      dto.deviceId,
      AiFeature.ai,
    );
    const result = await this.runTextGeneration({
      deviceId: dto.deviceId,
      feature: AiFeature.caption,
      systemPrompt:
        '你是一个朋友圈文案编辑，根据用户给的场景生成自然、日常、克制的中文朋友圈表达。不要像广告，不要像作文，不要解释。',
      userPrompt: `根据这个场景生成 3 条朋友圈文案：${dto.scene}`,
    });

    return {
      items: result.items,
      quotaLeft: quota.left,
    };
  }

  private async runTextGeneration(params: {
    deviceId: string;
    feature: AiFeature;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<AiResult> {
    const requestId = `req_${randomUUID()}`;
    const startedAt = Date.now();
    const providerConfig = this.getProviderConfig();

    if (!providerConfig.apiKey) {
      await this.recordUsage({
        requestId,
        deviceId: params.deviceId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: 'AI_API_KEY is not configured',
      });
      throw new InternalServerErrorException('ai provider is not configured');
    }

    try {
      const client = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
      });
      const completion = await client.chat.completions.create({
        model: providerConfig.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: params.systemPrompt },
          {
            role: 'user',
            content:
              `${params.userPrompt}\n\n只返回 JSON，格式：` +
              '{"items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}',
          },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      const parsed = this.parseResult(content);

      await this.recordUsage({
        requestId,
        deviceId: params.deviceId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.success,
        latencyMs: Date.now() - startedAt,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      });

      return parsed;
    } catch (error) {
      await this.recordUsage({
        requestId,
        deviceId: params.deviceId,
        feature: params.feature,
        provider: providerConfig.provider,
        model: providerConfig.model,
        status: AiUsageStatus.failed,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : 'unknown error',
      });
      throw new InternalServerErrorException('ai provider error');
    }
  }

  private getProviderConfig() {
    const provider = this.readConfig('AI_PROVIDER') ?? 'openai';
    const apiKey =
      this.readConfig('AI_API_KEY') ?? this.readConfig('OPENAI_API_KEY');
    const model =
      this.readConfig('AI_MODEL') ??
      this.readConfig('OPENAI_MODEL') ??
      'gpt-4.1-mini';
    const baseURL = this.readConfig('AI_BASE_URL');

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
      throw new Error('empty ai response');
    }

    const parsed = JSON.parse(content) as AiResult;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error('invalid ai response');
    }

    return {
      items: parsed.items.slice(0, 3).map((item) => ({
        style: item.style,
        text: item.text,
      })),
    };
  }

  private recordUsage(params: {
    requestId: string;
    deviceId: string;
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
        deviceId: params.deviceId,
        provider: params.provider,
        feature: params.feature,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        status: params.status,
        latencyMs: params.latencyMs,
        errorMessage: params.errorMessage?.slice(0, 500),
      },
    });
  }
}
