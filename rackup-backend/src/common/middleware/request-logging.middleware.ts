import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const correlationId =
      (req as Request & { correlationId?: string }).correlationId ?? '-';

    res.on('finish', () => {
      const ms = Date.now() - start;
      this.logger.log(
        JSON.stringify({
          correlationId,
          method: req.method,
          path: req.originalUrl ?? req.url,
          status: res.statusCode,
          durationMs: ms,
        }),
      );
    });

    next();
  }
}
