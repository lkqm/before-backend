import { Type, applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

import { ApiSuccessResponseDto } from "./api-response.dto";

export function ApiWrappedOkResponse<TModel extends Type<unknown>>(
  description: string,
  model: TModel,
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
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
    }),
  );
}
