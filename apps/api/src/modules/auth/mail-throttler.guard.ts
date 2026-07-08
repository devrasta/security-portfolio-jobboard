import { ExecutionContext, Injectable } from '@nestjs/common';

import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';

@Injectable()
export class MailThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(`${req.ip}-${req.body?.email || ''}`);
  }

  getLimit(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (throttler.name === 'loginByEmail') {
      const tracker = request.body.email || request.ip;
      return super.handleRequest({
        ...request,
        limit,
        ttl,
        generateKey: () => tracker,
      });
    }
    return super.handleRequest({ ...request, limit, ttl, throttler });
  }
}
