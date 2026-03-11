import mongoose, { Document, Model, Schema } from 'mongoose';

export type AuditStatus = 'success' | 'failed';

export interface IAuditActor {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export interface IAuditLog extends Document {
  actor: IAuditActor;
  action: string;
  entityType: string;
  entityId?: string;
  projectId?: string;
  summary?: string;
  route: string;
  method: string;
  status: AuditStatus;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  changes?: {
    before?: unknown;
    after?: unknown;
    fields?: Record<string, { before: unknown; after: unknown }>;
  };
  metadata?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      userId: { type: String, default: '' },
      email: { type: String, default: '' },
      name: { type: String, default: '' },
      roles: { type: [String], default: [] },
    },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, default: '', index: true },
    projectId: { type: String, default: '', index: true },
    summary: { type: String, default: '' },
    route: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    status: { type: String, enum: ['success', 'failed'], required: true, index: true },
    requestId: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    changes: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'auditlogs',
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ 'actor.userId': 1, createdAt: -1 });
AuditLogSchema.index({ projectId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
