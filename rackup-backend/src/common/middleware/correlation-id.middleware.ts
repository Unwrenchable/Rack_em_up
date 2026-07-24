import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(CORRELATION_HEADER);
    const id = incoming && incoming.trim() ? incoming.trim() : randomUUID();
    (req as Request & { correlationId?: string }).correlationId = id;
    res.setHeader(CORRELATION_HEADER, id);
    next();
  }
}
