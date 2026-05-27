import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, catchError, finalize, throwError } from "rxjs";

type HttpRequest = {
  id?: string;
  method?: string;
  url?: string;
};

type HttpResponse = {
  statusCode?: number;
};

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    let errorStatus: number | undefined;
    let hasError = false;

    return next.handle().pipe(
      catchError((error: unknown) => {
        hasError = true;
        errorStatus =
          error instanceof HttpException ? error.getStatus() : undefined;
        return throwError(() => error);
      }),
      finalize(() => {
        const method = request.method ?? "-";
        const url = request.url ?? "-";

        if (shouldSkip(url)) {
          return;
        }

        const durationMs = Date.now() - startedAt;
        const statusCode =
          errorStatus ?? (hasError ? 500 : response.statusCode ?? 200);
        const requestId = request.id ? ` ${request.id}` : "";
        const message = `[HTTP] ${method} ${url} ${statusCode} ${durationMs}ms${requestId}`;

        if (statusCode >= 500) {
          this.logger.error(message);
        } else if (statusCode >= 400) {
          this.logger.warn(message);
        } else {
          this.logger.log(message);
        }
      }),
    );
  }
}

function shouldSkip(url: string) {
  return url === "/health" || url.startsWith("/health?");
}
