import { BadRequestException, Injectable } from '@nestjs/common';
import { AiFeature, AiUsageStatus } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { getChinaDateRange } from '../../common/date';

type FeatureSummary = {
  feature: AiFeature;
  total: number;
  success: number;
  failed: number;
  blocked: number;
  timeout: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number | null;
};

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getAiSummary(dateInput?: string) {
    const { date, start, end } = this.parseDateRange(dateInput);
    const rows = await this.prisma.aiUsage.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        feature: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        latencyMs: true,
      },
    });
    const summaries = new Map<AiFeature, FeatureSummary>();

    for (const row of rows) {
      const summary = this.getOrCreateSummary(summaries, row.feature);
      summary.total += 1;
      summary[row.status] += 1;
      summary.inputTokens += row.inputTokens ?? 0;
      summary.outputTokens += row.outputTokens ?? 0;

      if (row.latencyMs !== null) {
        const previousCount = summary.avgLatencyMs === null ? 0 : summary.total - 1;
        const previousTotal = (summary.avgLatencyMs ?? 0) * previousCount;
        summary.avgLatencyMs = Math.round((previousTotal + row.latencyMs) / (previousCount + 1));
      }
    }

    return {
      date,
      totalRequests: rows.length,
      byFeature: Array.from(summaries.values()),
    };
  }

  private getOrCreateSummary(
    summaries: Map<AiFeature, FeatureSummary>,
    feature: AiFeature,
  ) {
    const existing = summaries.get(feature);
    if (existing) return existing;

    const summary: FeatureSummary = {
      feature,
      total: 0,
      success: 0,
      failed: 0,
      blocked: 0,
      timeout: 0,
      inputTokens: 0,
      outputTokens: 0,
      avgLatencyMs: null,
    };
    summaries.set(feature, summary);
    return summary;
  }

  private parseDateRange(dateInput?: string) {
    try {
      return getChinaDateRange(dateInput);
    } catch {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
  }
}
