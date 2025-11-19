import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop([
    {
      productId: { type: Types.ObjectId, ref: 'Product', required: true },
      productTitle: { type: String, required: true },
      productImage: String,
      productBrand: String,
      productSize: String,
      price: { type: Number, required: true },
      sellerId: { type: Types.ObjectId, ref: 'User', required: true },
      sellerName: String,
      addedAt: { type: Date, default: Date.now },
      quantity: { type: Number, default: 1, min: 1 },
      available: { type: Boolean, default: true },
      shippingCost: { type: Number, default: 0 },
    },
  ])
  items: Array<{
    productId: Types.ObjectId;
    productTitle: string;
    productImage?: string;
    productBrand?: string;
    productSize?: string;
    price: number;
    sellerId: Types.ObjectId;
    sellerName?: string;
    addedAt: Date;
    quantity: number;
    available: boolean;
    shippingCost: number;
  }>;

  @Prop({ default: 0 })
  totalItems: number;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: 0 })
  totalShipping: number;

  @Prop()
  lastUpdated: Date;

  @Prop()
  expiresAt?: Date; // For guest carts

  createdAt: Date;
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

// Indexes
CartSchema.index({ userId: 1 }, { unique: true });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CartSchema.index({ 'items.productId': 1 });
CartSchema.index({ lastUpdated: -1 });
