import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderItemDocument = OrderItem & Document;

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId;

  // Product Information (snapshot at time of order)
  @Prop({ required: true })
  productTitle: string;

  @Prop()
  productImage: string;

  @Prop()
  productBrand: string;

  @Prop()
  productSize?: string;

  @Prop()
  productCondition: string;

  @Prop()
  productCategory: string;

  @Prop()
  productSubcategory?: string;

  // Quantity and Pricing
  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalPrice: number; // unitPrice * quantity

  @Prop({ default: 0 })
  shippingCost: number;

  @Prop({ default: 0 })
  itemServiceFee: number; // Platform fee for this item

  @Prop({ default: 0 })
  itemTaxes: number; // Taxes for this item

  @Prop({ required: true })
  itemTotal: number; // totalPrice + shippingCost + itemServiceFee + itemTaxes

  // Seller Information
  @Prop()
  sellerName: string;

  @Prop()
  sellerEmail: string;

  @Prop()
  sellerPhone?: string;

  // Seller Revenue & Payout
  @Prop({ required: true })
  sellerRevenue: number; // Amount seller receives (after platform fees)

  @Prop({ default: false })
  sellerPaid: boolean;

  @Prop()
  sellerPayoutReference?: string;

  @Prop()
  sellerPaidAt?: Date;

  // Item Status (can be different from main order status)
  @Prop({ default: 'pending' })
  itemStatus:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';

  @Prop()
  trackingNumber?: string;

  @Prop()
  carrierName?: string;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  // Reviews (item-specific)
  @Prop()
  buyerRating?: number;

  @Prop()
  buyerReview?: string;

  @Prop()
  buyerReviewedAt?: Date;

  // Product availability check
  @Prop({ default: true })
  available: boolean;

  @Prop()
  availabilityMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Indexes for efficient queries
OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ productId: 1 });
OrderItemSchema.index({ sellerId: 1 });
OrderItemSchema.index({ itemStatus: 1 });
OrderItemSchema.index({ sellerPaid: 1 });
OrderItemSchema.index({ createdAt: -1 });

// Compound indexes
OrderItemSchema.index({ orderId: 1, itemStatus: 1 });
OrderItemSchema.index({ sellerId: 1, sellerPaid: 1 });
OrderItemSchema.index({ sellerId: 1, itemStatus: 1, createdAt: -1 });
