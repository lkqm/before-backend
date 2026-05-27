import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { BillingService } from "./billing.service";
import {
  BillingInterestDto,
  BillingInterestResponseDto,
} from "./dto/billing-interest.dto";

@ApiTags("付费验证")
@ApiBearerAuth()
@Controller("billing")
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiOperation({
    summary: "记录 AI 次数包开通意愿",
    description: "用户 AI 体验次数用完后点击想要开通时记录，用于验证付费意愿。",
  })
  @ApiWrappedOkResponse("记录成功", BillingInterestResponseDto)
  @Post("interest")
  recordInterest(
    @CurrentUserId() userId: string,
    @Body() dto: BillingInterestDto,
  ) {
    return this.billingService.recordInterest(userId, dto);
  }
}
