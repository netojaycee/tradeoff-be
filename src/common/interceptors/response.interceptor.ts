import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/common.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Check if response has pagination metadata
        const hasPagination = data && (
          'total' in data ||
          'page' in data ||
          'limit' in data ||
          'pages' in data ||
          'hasMore' in data
        );

        // If paginated, extract pagination info and put in meta
        if (hasPagination) {
          const meta = {
            total: data.total,
            page: data.page,
            limit: data.limit,
            pages: data.pages,
            hasMore: data.hasMore,
            ...data.meta, // Preserve any existing meta
          };

          return {
            success: true,
            message: data?.message || 'Operation successful',
            data: data.data, // Only the actual data array
            meta,
            timestamp: new Date().toISOString(),
          };
        }

        // Non-paginated response
        return {
          success: true,
          message: data?.message || 'Operation successful',
          data: data?.data || data,
          meta: data?.meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
