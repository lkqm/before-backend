import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { AppException } from '../errors/app.exception';

type ErrorResponse = {
  code: number;
  message: string;
  data: null;
  requestId?: string;
};

const statusToCode: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: 1001,
  [HttpStatus.NOT_FOUND]: 2001,
  [HttpStatus.TOO_MANY_REQUESTS]: 4001,
  [HttpStatus.PAYLOAD_TOO_LARGE]: 4101,
  [HttpStatus.INTERNAL_SERVER_ERROR]: 5000,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (statusCode: number) => { send: (body: ErrorResponse) => void };
    }>();
    const request = context.getRequest<{ id?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawMessage =
      exception instanceof HttpException
        ? exception.message
        : 'internal server error';

    response.status(status).send({
      code:
        exception instanceof AppException
          ? exception.code
          : statusToCode[status] ?? 5000,
      message: rawMessage,
      data: null,
      requestId: request.id,
    });
  }
}
