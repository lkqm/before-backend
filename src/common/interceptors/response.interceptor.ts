import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

type WrappedResponse<T> = {
  code: number;
  message: string;
  data: T;
  requestId?: string;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<WrappedResponse<T>> {
    const request = context.switchToHttp().getRequest<{ id?: string }>();
    const response = context.switchToHttp().getResponse<{
      statusCode?: number;
      status?: (code: number) => unknown;
      code?: (code: number) => unknown;
    }>();

    if (response.statusCode === 201) {
      if (typeof response.status === 'function') {
        response.status(200);
      } else {
        response.code?.(200);
      }
    }

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data,
        requestId: request.id,
      })),
    );
  }
}
