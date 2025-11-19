import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction } from '../../../common/enums';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({
    type: String,
    enum: AuditAction,
    required: true,
  })
  action: AuditAction;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  userEmail?: string;

  @Prop()
  userRole?: string;

  @Prop()
  entityType?: string; // 'User', 'Product', 'Order', etc.

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop()
  entityName?: string;

  @Prop()
  description: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Object })
  previousValues?: Record<string, any>;

  @Prop({ type: Object })
  newValues?: Record<string, any>;

  // Device & Request Information
  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop()
  deviceType?: string;

  @Prop()
  browser?: string;

  @Prop()
  operatingSystem?: string;

  @Prop()
  deviceFingerprint?: string;

  // Location Information
  @Prop({
    type: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
  })
  location?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };

  // Request Details
  @Prop()
  endpoint?: string;

  @Prop()
  httpMethod?: string;

  @Prop()
  statusCode?: number;

  @Prop()
  responseTime?: number;

  // Risk & Security
  @Prop({ default: 'low' })
  riskLevel: string; // low, medium, high, critical

  @Prop({ default: false })
  suspicious: boolean;

  @Prop([String])
  flags?: string[];

  @Prop()
  sessionId?: string;

  @Prop()
  requestId?: string;

  // Admin Information
  @Prop({ type: Types.ObjectId, ref: 'User' })
  performedByAdmin?: Types.ObjectId;

  @Prop()
  adminNotes?: string;

  @Prop({ default: false })
  reviewed: boolean;

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for performance and querying
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ ipAddress: 1 });
AuditLogSchema.index({ suspicious: 1 });
AuditLogSchema.index({ riskLevel: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userEmail: 1 });
AuditLogSchema.index({ sessionId: 1 });

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ suspicious: 1, riskLevel: 1, createdAt: -1 });
AuditLogSchema.index({ ipAddress: 1, createdAt: -1 });
