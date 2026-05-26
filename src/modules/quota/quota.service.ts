import { HttpStatus, Injectable } from "@nestjs/common";
import { AiFeature, Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AppErrorCode, AppException } from "../../common/errors/app.exception";
import { AuthService } from "../auth/auth.service";

const SIGNUP_AI_CREDITS = 10;

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
        balance: SIGNUP_AI_CREDITS,
        totalAdded: SIGNUP_AI_CREDITS,
      },
      update: {},
    });

    if (account.totalAdded !== SIGNUP_AI_CREDITS || account.totalUsed !== 0) {
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
        data: [{
          userId,
          delta: SIGNUP_AI_CREDITS,
          balance: account.balance,
          reason: "signup_grant",
          dedupeKey: `signup_grant:${userId}`,
        }],
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
