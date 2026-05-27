import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import { UsageSummaryResponseDto } from "./dto/usage-summary-response.dto";
import { UsageService } from "./usage.service";

@ApiTags("统计")
@Controller("usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @ApiOperation({
    summary: "AI 使用统计",
    description: "按中国时区日期统计 AI 请求数、状态、token 和平均耗时。",
  })
  @ApiQuery({
    name: "date",
    required: false,
    description: "统计日期，格式 YYYY-MM-DD；不传时默认为中国时区今天",
    example: "2026-05-26",
  })
  @ApiWrappedOkResponse("查询成功", UsageSummaryResponseDto)
  @Get("ai/summary")
  getAiSummary(@Query("date") date?: string) {
    return this.usageService.getAiSummary(date);
  }
}
