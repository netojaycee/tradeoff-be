import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Gender } from '@/common/enums/product.enum';

export type CategoryDocument = Category & Document;

/**
 * Category Entity - Represents main product categories in the marketplace
 * Top-level categories (e.g., Electronics, Clothing, Jewelry)
 * Subcategories are managed through the Subcategory model
 */
@Schema({
  timestamps: true,
  collection: 'categories',
})
export class Category extends Document {
  /**
   * Category name (e.g., "Electronics", "Clothing", "Jewelry")
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  /**
   * URL-friendly slug for the category
   * Format: lowercase-with-hyphens (e.g., "electronics", "luxury-watches")
   */
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  })
  slug: string;

  /**
   * Human-readable description of the category
   */
  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  description?: string;

  /**
   * Gender filter for this category if applicable
   * Values: "MEN", "WOMEN", "UNISEX"
   */
  @Prop({
    type: String,
    enum: Gender,
    required: false,
  })
  gender?: Gender;

  /**
   * Category image/banner URL for display
   */
  @Prop({
    type: String,
    required: false,
  })
  image?: string;

  /**
   * Category icon identifier or URL (for UI display)
   */
  @Prop({
    type: String,
    required: false,
  })
  icon?: string;

  /**
   * Whether the category is active and visible in the marketplace
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  /**
   * Sort order for displaying categories (lower numbers display first)
   */
  @Prop({
    type: Number,
    default: 0,
  })
  sortOrder: number;

  /**
   * SEO keywords for the category
   */
  @Prop({
    type: [String],
    required: false,
  })
  keywords?: string[];

  /**
   * SEO page title for the category
   */
  @Prop({
    type: String,
    required: false,
  })
  seoTitle?: string;

  /**
   * SEO meta description for the category
   */
  @Prop({
    type: String,
    required: false,
  })
  seoDescription?: string;

  /**
   * Total number of products in this category (including inactive)
   * Updated automatically when products are created/deleted
   */
  @Prop({
    type: Number,
    default: 0,
  })
  productCount: number;

  /**
   * Number of active/listed products in this category
   * Updated automatically when product status changes
   */
  @Prop({
    type: Number,
    default: 0,
  })
  activeProductCount: number;

  /**
   * Timestamp when the category was created
   */
  createdAt: Date;

  /**
   * Timestamp when the category was last updated
   */
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Create indexes for performance optimization
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ name: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ gender: 1 });
CategorySchema.index({ isActive: 1, sortOrder: 1 });
CategorySchema.index({ name: 'text', description: 'text', keywords: 'text' });
