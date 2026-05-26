import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { BillingInterestDto } from "./dto/billing-interest.dto";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async recordInterest(userId: string, dto: BillingInterestDto) {
    await this.authService.assertUser(userId);

    return this.prisma.billingInterest.create({
      data: {
        userId,
        feature: dto.feature,
        remainingCredits: dto.remainingCredits,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    });
  }
}
