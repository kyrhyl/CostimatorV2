import AuditLog, { type AuditStatus } from '@/models/AuditLog';

type RequestLike = {
  url: string;
  method?: string;
  headers?: Headers;
};

const REDACT_KEYS = ['password', 'passwordhash', 'token', 'secret', 'authorization', 'cookie'];

export interface AuditActor {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export interface AuditRequestContext {
  route: string;
  method: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditEventInput {
  actor?: AuditActor;
  action: string;
  entityType: string;
  entityId?: string;
  projectId?: string;
  summary?: string;
  status?: AuditStatus;
  request?: RequestLike;
  context?: Partial<AuditRequestContext>;
  changes?: {
    before?: unknown;
    after?: unknown;
    fields?: Record<string, { before: unknown; after: unknown }>;
  };
  metadata?: Record<string, unknown>;
  error?: string;
}

export function buildAuditActor(user: {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
} | null): AuditActor {
  if (!user) {
    return { userId: 'system', name: 'system', roles: [] };
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles || [],
  };
}

export function buildAuditContext(request: RequestLike): AuditRequestContext {
  const url = new URL(request.url);
  const headers = request.headers;

  return {
    route: url.pathname,
    method: request.method || 'GET',
    requestId:
      headers?.get('x-request-id') ||
      headers?.get('x-correlation-id') ||
      headers?.get('x-vercel-id') ||
      undefined,
    ip:
      headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers?.get('x-real-ip') ||
      undefined,
    userAgent: headers?.get('user-agent') || undefined,
  };
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return REDACT_KEYS.some(fragment => normalized.includes(fragment));
}

export function sanitizeForAudit(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForAudit(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(record)) {
      if (shouldRedactKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      sanitized[key] = sanitizeForAudit(item);
    }

    return sanitized;
  }

  return value;
}

export function diffAuditFields(before: unknown, after: unknown): Record<string, { before: unknown; after: unknown }> {
  const safeBefore = (sanitizeForAudit(before) || {}) as Record<string, unknown>;
  const safeAfter = (sanitizeForAudit(after) || {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(safeBefore), ...Object.keys(safeAfter)]);
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const key of keys) {
    const left = safeBefore[key];
    const right = safeAfter[key];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changes[key] = { before: left, after: right };
    }
  }

  return changes;
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const baseContext = input.request ? buildAuditContext(input.request) : undefined;
    const context = {
      route: input.context?.route || baseContext?.route || 'unknown',
      method: input.context?.method || baseContext?.method || 'UNKNOWN',
      requestId: input.context?.requestId || baseContext?.requestId || '',
      ip: input.context?.ip || baseContext?.ip || '',
      userAgent: input.context?.userAgent || baseContext?.userAgent || '',
    };

    const actor = (sanitizeForAudit(input.actor || { userId: 'system', name: 'system', roles: [] }) || {}) as AuditActor;
    const changes = input.changes ? (sanitizeForAudit(input.changes) as any) : undefined;
    const metadata = input.metadata ? (sanitizeForAudit(input.metadata) as any) : undefined;

    await AuditLog.create({
      actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || '',
      projectId: input.projectId || '',
      summary: input.summary || '',
      route: context.route,
      method: context.method,
      status: input.status || 'success',
      requestId: context.requestId,
      ip: context.ip,
      userAgent: context.userAgent,
      changes,
      metadata,
      error: input.error || '',
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}
