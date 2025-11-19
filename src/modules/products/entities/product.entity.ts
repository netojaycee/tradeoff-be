import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ProductStatus,
  ProductCondition,
  AuthenticationStatus,
  Gender,
} from 'src/common/enums/product.enum';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  @Prop({ required: true })
  brand: string;

  @Prop()
  model?: string;

  @Prop()
  serialNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subcategory' })
  subCategory?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Gender,
    required: true,
  })
  gender: Gender;

  // Seller Information
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId;

  @Prop()
  sellerName: string;

  @Prop({ default: false })
  isVerifiedSeller: boolean;

  // Pricing
  @Prop({ required: true })
  originalPrice: number;

  @Prop({ required: true })
  sellingPrice: number;

  @Prop()
  retailPrice?: number;

  @Prop()
  currency: string = 'NGN';

  @Prop({ default: false })
  negotiable: boolean;

  // Product Condition & Details
  @Prop({
    type: String,
    enum: ProductCondition,
    required: true,
  })
  condition: ProductCondition;

  @Prop()
  yearPurchased?: number;

  @Prop()
  purchaseLocation?: string;

  @Prop()
  receiptAvailable: boolean = false;

  @Prop()
  careInstructions?: string;

  @Prop([String])
  flaws?: string[];

  // Size & Measurements
  @Prop()
  size?: string;

  @Prop()
  sizeType?: string; // US, UK, EU, etc.

  @Prop({
    type: {
      chest: Number,
      waist: Number,
      hips: Number,
      shoulders: Number,
      sleeves: Number,
      length: Number,
      inseam: Number,
      rise: Number,
    },
  })
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    shoulders?: number;
    sleeves?: number;
    length?: number;
    inseam?: number;
    rise?: number;
  };

  // Materials & Details
  @Prop([String])
  materials?: string[];

  @Prop()
  color: string;

  @Prop([String])
  colors?: string[];

  @Prop()
  pattern?: string;

  @Prop()
  season?: string;

  @Prop([String])
  tags?: string[];

  // Images
  @Prop({ type: [String], required: true })
  images: string[];

  // Authentication & Verification
  @Prop({
    type: String,
    enum: AuthenticationStatus,
    default: AuthenticationStatus.PENDING,
  })
  authenticationStatus: AuthenticationStatus;

  @Prop()
  authenticationCertificate?: string;

  @Prop()
  entrupyId?: string;

  @Prop()
  realAuthId?: string;

  @Prop({
    type: {
      service: String, // 'entrupy', 'real_authentication', etc.
      certificateId: String,
      verifiedAt: Date,
      verifiedBy: String,
      confidence: Number,
      notes: String,
    },
  })
  verificationDetails?: {
    service: string;
    certificateId: string;
    verifiedAt: Date;
    verifiedBy: string;
    confidence: number;
    notes: string;
  };

  // Product Status
  @Prop({
    type: String,
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: false })
  promoted: boolean;

  @Prop()
  promotedUntil?: Date;

  // Inventory
  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: false })
  sold: boolean;

  @Prop()
  soldAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  buyerId?: Types.ObjectId;

  // Shipping
  @Prop({ default: 0 })
  shippingWeight?: number;

  @Prop({
    type: {
      domestic: Number,
      international: Number,
      free: { type: Boolean, default: false },
      freeThreshold: Number,
    },
    default: { domestic: 0, international: 0, free: false },
  })
  shipping: {
    domestic: number;
    international: number;
    free: boolean;
    freeThreshold?: number;
  };

  @Prop([String])
  shippingMethods?: string[];

  // Engagement Metrics
  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  saves: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ default: 0 })
  inquiries: number;

  @Prop([Types.ObjectId])
  likedBy?: Types.ObjectId[];

  @Prop([Types.ObjectId])
  savedBy?: Types.ObjectId[];

  // Reviews (for sold items)
  @Prop({ default: 0 })
  averageRating?: number;

  @Prop({ default: 0 })
  totalReviews?: number;

  // Admin & Moderation
  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop([String])
  reportReasons?: string[];

  // SEO & Search
  @Prop([String])
  keywords?: string[];

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  // Location
  @Prop({
    type: {
      city: { type: String, required: false },
      state: { type: String, required: false },
      country: { type: String, required: false },
    },
    required: false,
  })
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  // Timestamps
  @Prop()
  publishedAt?: Date;

  @Prop()
  lastViewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes for performance and search
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ sellerId: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ subCategory: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ authenticationStatus: 1 });
ProductSchema.index({ condition: 1 });
ProductSchema.index({ gender: 1 });
ProductSchema.index({ sellingPrice: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ publishedAt: -1 });
ProductSchema.index({ views: -1 });
ProductSchema.index({ likes: -1 });

// Text search index
ProductSchema.index({
  title: 'text',
  description: 'text',
  brand: 'text',
  tags: 'text',
  keywords: 'text',
});

// Compound indexes for common queries
ProductSchema.index({ status: 1, category: 1, createdAt: -1 });
ProductSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ authenticationStatus: 1, status: 1 });
ProductSchema.index({ featured: 1, status: 1, createdAt: -1 });
