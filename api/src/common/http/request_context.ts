import type { Request } from 'express';

// The parts of a request a service may need for auditing, without handing it `req` itself.
export interface RequestContext {
  requestId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

export function getRequestContext(req: Request): RequestContext {
  return {
    requestId: String(req.id),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')?.slice(0, 255),
  };
}

// The request fields every audit event stores.
export function toAuditContext(context: RequestContext) {
  return { requestId: context.requestId, ipAddress: context.ipAddress };
}
