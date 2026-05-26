import { Controller, Get } from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiWrappedOkResponse } from "../../common/swagger/api-ok-response";
import { ApiSuccessResponseDto } from "../../common/swagger/api-response.dto";
import { HealthResponseDto } from "./dto/health-response.dto";

@ApiTags("健康检查")
@ApiExtraModels(ApiSuccessResponseDto, HealthResponseDto)
@Controller("health")
export class HealthController {
  @ApiOperation({
    summary: "健康检查",
    description: "检查后端服务是否正常运行。",
  })
  @ApiWrappedOkResponse("服务正常", HealthResponseDto)
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "before-backend",
    };
  }
}
