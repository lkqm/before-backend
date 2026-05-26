import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from "../../common/swagger/api-response.dto";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AiService } from "./ai.service";
import {
  AiTextItemDto,
  ImageRankReasonDto,
  RankImagesResponseDto,
  TextGenerationResponseDto,
} from "./dto/ai-response.dto";
import { CaptionDto } from "./dto/caption.dto";
import { AiFeedbackDto, AiFeedbackResponseDto } from "./dto/feedback.dto";
import { RankImagesDto } from "./dto/rank-images.dto";
import { RewriteDto } from "./dto/rewrite.dto";

@ApiTags("AI")
@ApiBearerAuth()
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  AiTextItemDto,
  TextGenerationResponseDto,
  ImageRankReasonDto,
  RankImagesResponseDto,
  AiFeedbackResponseDto,
)
@Controller("ai")
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({
    summary: "改写朋友圈文案",
    description:
      "将用户输入的原始文案改写为 3 条自然、日常、克制的朋友圈表达。",
  })
  @ApiWrappedOkResponse("改写成功", TextGenerationResponseDto)
  @ApiUnauthorizedResponse({
    description: "未登录或 token 无效",
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: "额度已用完或同一用户已有 AI 请求进行中",
    type: ApiErrorResponseDto,
  })
  @Post("rewrite")
  rewrite(@CurrentUserId() userId: string, @Body() dto: RewriteDto) {
    return this.aiService.rewrite(userId, dto);
  }

  @ApiOperation({
    summary: "文案生成",
    description:
      "根据文字场景生成朋友圈文案；也支持传入图片、地点、时间和用户补充，生成带图片理解的朋友圈文案。",
  })
  @ApiWrappedOkResponse("生成成功", TextGenerationResponseDto)
  @ApiUnauthorizedResponse({
    description: "未登录或 token 无效",
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: "额度已用完或同一用户已有 AI 请求进行中",
    type: ApiErrorResponseDto,
  })
  @Post("caption")
  caption(@CurrentUserId() userId: string, @Body() dto: CaptionDto) {
    return this.aiService.caption(userId, dto);
  }

  @ApiOperation({
    summary: "图片排序",
    description:
      "根据图片主体清晰度、构图、情绪、氛围、色彩连续性和内容重复度，推荐首图和朋友圈发布顺序。",
  })
  @ApiWrappedOkResponse("排序成功", RankImagesResponseDto)
  @ApiBadRequestResponse({
    description: "图片数量、类型、大小或 ID 不合法",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "未登录或 token 无效",
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: "额度已用完或同一用户已有 AI 请求进行中",
    type: ApiErrorResponseDto,
  })
  @Post("rank")
  rankImages(@CurrentUserId() userId: string, @Body() dto: RankImagesDto) {
    return this.aiService.rankImages(userId, dto);
  }

  @ApiOperation({
    summary: "AI 结果反馈",
    description:
      "记录用户对某次 AI 结果的反馈，用于统计 AI 采纳、忽略和撤销效果。",
  })
  @ApiWrappedOkResponse("反馈成功", AiFeedbackResponseDto)
  @ApiBadRequestResponse({
    description: "AI 调用记录不存在、无权限或参数错误",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "未登录或 token 无效",
    type: ApiErrorResponseDto,
  })
  @Post("feedback")
  feedback(@CurrentUserId() userId: string, @Body() dto: AiFeedbackDto) {
    return this.aiService.feedback(userId, dto);
  }
}
