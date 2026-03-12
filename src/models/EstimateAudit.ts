import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AuditRecommendation = 'pass' | 'fail' | 'needs_revision';
export type AuditStatus = 'draft' | 'submitted';

export interface IEstimateAudit extends Document {
  projectId: mongoose.Types.ObjectId;
  estimateId: mongoose.Types.ObjectId;
  auditorId: mongoose.Types.ObjectId;
  checklist: {
    prescribedFormat: boolean;
    arithmeticAccuracy: boolean;
    valueConsistency: boolean;
    scopeCompleteness: boolean;
  };
  findings: string;
  recommendation?: AuditRecommendation;
  status: AuditStatus;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EstimateAuditSchema = new Schema<IEstimateAudit>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    estimateId: {
      type: Schema.Types.ObjectId,
      ref: 'CostEstimate',
      required: true,
      index: true,
    },
    auditorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    checklist: {
      prescribedFormat: { type: Boolean, default: false },
      arithmeticAccuracy: { type: Boolean, default: false },
      valueConsistency: { type: Boolean, default: false },
      scopeCompleteness: { type: Boolean, default: false },
    },
    findings: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    recommendation: {
      type: String,
      enum: ['pass', 'fail', 'needs_revision'],
      required: false,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'draft',
      index: true,
    },
    submittedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true },
);

EstimateAuditSchema.index({ projectId: 1, estimateId: 1, createdAt: -1 });
EstimateAuditSchema.index({ estimateId: 1, auditorId: 1, createdAt: -1 });

const EstimateAudit: Model<IEstimateAudit> =
  mongoose.models.EstimateAudit || mongoose.model<IEstimateAudit>('EstimateAudit', EstimateAuditSchema);

export default EstimateAudit;
