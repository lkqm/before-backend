import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from "../../common/swagger/api-response.dto";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { QuotaResponseDto } from "./dto/quota-response.dto";
import { QuotaService } from "./quota.service";

@ApiTags("额度")
@ApiBearerAuth()
@ApiExtraModels(ApiSuccessResponseDto, ApiErrorResponseDto, QuotaResponseDto)
@Controller("quota")
@UseGuards(AuthGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @ApiOperation({
    summary: "查询 AI 额度",
    description: "查询当前登录用户 AI 体验次数余额。",
  })
  @ApiWrappedOkResponse("查询成功", QuotaResponseDto)
  @ApiUnauthorizedResponse({
    description: "未登录或 token 无效",
    type: ApiErrorResponseDto,
  })
  @Get()
  async getQuota(@CurrentUserId() userId: string) {
    return this.quotaService.getQuota(userId);
  }
}
