import { HttpException, HttpStatus } from "@nestjs/common";

export enum AppErrorCode {
  InvalidParams = 1001,
  UserNotFound = 2001,
  WechatLoginFailed = 3001,
  WechatNotConfigured = 3002,
  Unauthorized = 3003,
  Forbidden = 3004,
  AiCreditExhausted = 4001,
  AiRequestInProgress = 4002,
  ImageTooLarge = 4101,
  AiProviderNotConfigured = 5001,
  AiProviderError = 5002,
  AiInvalidResponse = 5003,
}

export class AppException extends HttpException {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}
