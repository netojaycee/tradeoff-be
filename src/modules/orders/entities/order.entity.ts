import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from 'src/common/enums/order.enum';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  // Order Totals and Summary
  @Prop({ required: true })
  subtotal: number; // Sum of all items before fees and taxes

  @Prop({ default: 0 })
  totalShippingCost: number; // Total shipping for all items

  @Prop({ default: 0 })
  totalServiceFee: number; // Platform service fee (3.5% of subtotal)

  @Prop({ default: 0 })
  totalTaxes: number; // Total taxes (7.5% of subtotal + fees)

  @Prop({ required: true })
  totalAmount: number; // Final amount to be paid

  @Prop({ required: true })
  itemCount: number; // Total number of items in order

  @Prop({ required: true })
  sellerCount: number; // Number of unique sellers

  @Prop({ default: 'NGN' })
  currency: string;

  // Multi-Seller Support
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  sellerIds: Types.ObjectId[]; // Array of all sellers in this order

  @Prop({
    type: [
      {
        sellerId: { type: Types.ObjectId, ref: 'User' },
        sellerName: String,
        itemCount: Number,
        revenue: Number, // Amount seller will receive
        serviceFee: Number, // Platform fee from this seller's items
        paid: { type: Boolean, default: false },
        payoutReference: String,
        paidAt: Date,
      },
    ],
    default: [],
  })
  sellerPayouts: {
    sellerId: Types.ObjectId;
    sellerName: string;
    itemCount: number;
    revenue: number;
    serviceFee: number;
    paid: boolean;
    payoutReference?: string;
    paidAt?: Date;
  }[];

  // Payment Information
  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: PaymentMethod,
  })
  paymentMethod?: PaymentMethod;

  @Prop()
  paymentReference?: string;

  @Prop()
  paymentGateway?: string; // 'paystack', 'flutterwave', etc.

  @Prop()
  paidAt?: Date;

  // Shipping Information
  @Prop({
    type: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    required: true,
  })
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Prop()
  shippingMethod?: string;

  @Prop()
  trackingNumber?: string;

  @Prop()
  carrierName?: string;

  @Prop()
  estimatedDelivery?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  // Order Management
  @Prop()
  confirmedAt?: Date;

  @Prop()
  processingAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  // Reviews and Feedback
  @Prop()
  buyerRating?: number;

  @Prop()
  buyerReview?: string;

  @Prop()
  buyerReviewedAt?: Date;

  @Prop()
  sellerRating?: number;

  @Prop()
  sellerReview?: string;

  @Prop()
  sellerReviewedAt?: Date;

  // Dispute and Resolution
  @Prop({ default: false })
  disputed: boolean;

  @Prop()
  disputeReason?: string;

  @Prop()
  disputeOpenedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  disputeOpenedBy?: Types.ObjectId;

  @Prop()
  disputeResolvedAt?: Date;

  @Prop()
  disputeResolution?: string;

  // Admin and Notes
  @Prop()
  adminNotes?: string;

  @Prop()
  buyerNotes?: string;

  @Prop()
  sellerNotes?: string;

  @Prop([String])
  statusHistory?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ sellerIds: 1 }); // Multi-seller support
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ disputed: 1 });
OrderSchema.index({ itemCount: 1 });
OrderSchema.index({ sellerCount: 1 });

// Compound indexes
OrderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerIds: 1, status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, status: 1 });
OrderSchema.index({ sellerCount: 1, status: 1 });
