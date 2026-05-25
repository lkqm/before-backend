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
