import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus, PaymentMethod } from 'src/common/enums/order.enum';

export type PaymentDocument = Payment & Document;

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  STRIPE = 'stripe',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: PaymentGateway,
    required: true,
  })
  gateway: PaymentGateway;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Prop({
    type: String,
    enum: PaymentMethod,
  })
  method?: PaymentMethod;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ default: 0 })
  fees: number;

  @Prop()
  netAmount?: number;

  @Prop()
  gatewayTransactionId?: string;

  @Prop()
  gatewayReference?: string;

  @Prop()
  authorizationUrl?: string;

  @Prop()
  accessCode?: string;

  @Prop()
  gatewayResponse?: string;

  @Prop()
  failureReason?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  failedAt?: Date;

  // Customer Information (from gateway)
  @Prop({
    type: {
      email: String,
      firstName: String,
      lastName: String,
      phone: String,
      customerId: String,
      customerCode: String,
    },
  })
  customer?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    customerId?: string;
    customerCode?: string;
  };

  // Authorization Information (for card payments)
  @Prop({
    type: {
      authorizationCode: String,
      bin: String,
      last4: String,
      expMonth: String,
      expYear: String,
      channel: String,
      cardType: String,
      bank: String,
      countryCode: String,
      brand: String,
      reusable: Boolean,
      signature: String,
      accountName: String,
    },
  })
  authorization?: {
    authorizationCode: string;
    bin: string;
    last4: string;
    expMonth: string;
    expYear: string;
    channel: string;
    cardType: string;
    bank: string;
    countryCode: string;
    brand: string;
    reusable: boolean;
    signature: string;
    accountName?: string;
  };

  // Gateway Metadata
  @Prop({ type: Object })
  gatewayMetadata?: any;

  @Prop({ type: Object })
  webhookData?: any;

  // Risk and Fraud Detection
  @Prop()
  ipAddress?: string;

  @Prop()
  riskAction?: string;

  @Prop({ default: false })
  flagged: boolean;

  @Prop()
  flaggedReason?: string;

  // Refund Information
  @Prop({ default: false })
  refunded: boolean;

  @Prop()
  refundedAmount?: number;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundReference?: string;

  @Prop()
  refundReason?: string;

  // Fees Breakdown
  @Prop({
    type: {
      gatewayFee: Number,
      processingFee: Number,
      transactionFee: Number,
      vatOnFee: Number,
    },
  })
  feesBreakdown?: {
    gatewayFee: number;
    processingFee: number;
    transactionFee: number;
    vatOnFee: number;
  };

  // Callback URLs
  @Prop()
  callbackUrl?: string;

  @Prop()
  webhookUrl?: string;

  // Retry Information
  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  lastRetryAt?: Date;

  @Prop({ default: 5 })
  maxRetries: number;

  // Notification Status
  @Prop({ default: false })
  customerNotified: boolean;

  @Prop({ default: false })
  merchantNotified: boolean;

  // Timestamps
  @Prop()
  initiatedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  expiredAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ gateway: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ gatewayTransactionId: 1 });
PaymentSchema.index({ gatewayReference: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ paidAt: -1 });

// Compound indexes
PaymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ gateway: 1, status: 1 });
PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ status: 1, gateway: 1, createdAt: -1 });
