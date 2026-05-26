import { Type } from "@nestjs/common";
import { ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

import { ApiSuccessResponseDto } from "./api-response.dto";

export function ApiWrappedOkResponse<TModel extends Type<unknown>>(
  description: string,
  model: TModel,
) {
  return ApiOkResponse({
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(model) },
          },
        },
      ],
    },
  });
}
