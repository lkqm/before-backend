import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { appConfig } from "../../config";
import type { AiFeature } from "../ai/ai.constants";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class QuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getQuota(userId: string) {
    await this.authService.assertUser(userId);

    const account = await this.ensureAccount(userId);
    return this.toQuotaResponse(account);
  }

  async assertAndConsume(userId: string, feature: AiFeature) {
    await this.authService.assertUser(userId);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureSignupGrant(userId, tx);

      const consumeResult = await tx.aiCreditAccount.updateMany({
        where: {
          userId,
          balance: { gt: 0 },
        },
        data: {
          balance: { decrement: 1 },
          totalUsed: { increment: 1 },
        },
      });

      if (consumeResult.count === 0) {
        throw new AppException(
          AppErrorCode.AiCreditExhausted,
          "ai credits exhausted",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const updated = await tx.aiCreditAccount.findUniqueOrThrow({
        where: { userId },
      });

      await tx.aiCreditLedger.create({
        data: {
          userId,
          delta: -1,
          balance: updated.balance,
          reason: "ai_consume",
          feature,
        },
      });

      return this.toQuotaResponse(updated);
    });
  }

  async refundConsumedCredit(
    userId: string,
    feature: AiFeature,
    options: {
      aiUsageId?: string;
      requestId: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await this.authService.assertUser(userId);

    const dedupeKey = `ai_refund:${options.aiUsageId ?? options.requestId}`;

    return this.prisma.$transaction(async (tx) => {
      const existingRefund = await tx.aiCreditLedger.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existingRefund) {
        const account = await tx.aiCreditAccount.findUniqueOrThrow({
          where: { userId },
        });
        return this.toQuotaResponse(account);
      }

      const refundResult = await tx.aiCreditAccount.updateMany({
        where: {
          userId,
          totalUsed: { gt: 0 },
        },
        data: {
          balance: { increment: 1 },
          totalUsed: { decrement: 1 },
        },
      });

      const updated = await tx.aiCreditAccount.findUniqueOrThrow({
        where: { userId },
      });

      if (refundResult.count === 0) {
        return this.toQuotaResponse(updated);
      }

      await tx.aiCreditLedger.create({
        data: {
          userId,
          delta: 1,
          balance: updated.balance,
          reason: "ai_refund",
          dedupeKey,
          feature,
          aiUsageId: options.aiUsageId,
          metadata: options.metadata,
        },
      });

      return this.toQuotaResponse(updated);
    });
  }

  private async ensureAccount(userId: string) {
    const existing = await this.prisma.aiCreditAccount.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      return this.ensureSignupGrant(userId, tx);
    });
  }

  private async ensureSignupGrant(
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const account = await tx.aiCreditAccount.upsert({
      where: { userId },
      create: {
        userId,
        balance: appConfig.quota.signupAiCredits,
        totalAdded: appConfig.quota.signupAiCredits,
      },
      update: {},
    });

    if (
      account.totalAdded !== appConfig.quota.signupAiCredits ||
      account.totalUsed !== 0
    ) {
      return account;
    }

    const grantLedger = await tx.aiCreditLedger.findFirst({
      where: {
        userId,
        reason: "signup_grant",
      },
      select: { id: true },
    });

    if (!grantLedger) {
      await tx.aiCreditLedger.createMany({
        data: [
          {
            userId,
            delta: appConfig.quota.signupAiCredits,
            balance: account.balance,
            reason: "signup_grant",
            dedupeKey: `signup_grant:${userId}`,
          },
        ],
        skipDuplicates: true,
      });
    }

    return account;
  }

  private toQuotaResponse(account: {
    balance: number;
    totalAdded: number;
    totalUsed: number;
  }) {
    return {
      balance: account.balance,
      totalAdded: account.totalAdded,
      totalUsed: account.totalUsed,
    };
  }
}
