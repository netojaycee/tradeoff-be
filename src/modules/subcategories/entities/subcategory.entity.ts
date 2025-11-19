import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubcategoryDocument = Subcategory & Document;

/**
 * Subcategory Entity - Represents product subcategories under parent categories
 *
 * Example hierarchy:
 * - Clothing (Category)
 *   - Tops (Subcategory)
 *   - Dresses (Subcategory)
 *   - Bottoms (Subcategory)
 * - Shoes (Category)
 *   - Heels (Subcategory)
 *   - Flats (Subcategory)
 *   - Sneakers (Subcategory)
 */
@Schema({
  timestamps: true,
  collection: 'subcategories',
})
export class Subcategory extends Document {
  /**
   * Subcategory name (e.g., 'Tops', 'Dresses', 'Heels')
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  name: string;

  /**
   * URL-friendly slug for the subcategory
   * Format: lowercase-with-hyphens (no random suffix for categories)
   */
  @Prop({
    type: String,
    required: true,
    lowercase: true,
  })
  slug: string;

  /**
   * Reference to parent Category
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: Types.ObjectId;

  /**
   * Human-readable description of the subcategory
   */
  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  description?: string;

  /**
   * Icon or image identifier for the subcategory
   */
  @Prop({
    type: String,
    required: false,
  })
  icon?: string;

  /**
   * Display order for sorting in UI
   */
  @Prop({
    type: Number,
    default: 0,
  })
  order: number;

  /**
   * Whether the subcategory is active
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  /**
   * Count of products in this subcategory
   */
  @Prop({
    type: Number,
    default: 0,
  })
  productCount: number;

  /**
   * Metadata for SEO optimization
   */
  @Prop({
    type: {
      metaTitle: { type: String, required: false },
      metaDescription: { type: String, required: false },
      metaKeywords: [{ type: String }],
    },
    required: false,
  })
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };

  /**
   * Timestamp when the subcategory was created
   */
  createdAt: Date;

  /**
   * Timestamp when the subcategory was last updated
   */
  updatedAt: Date;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);

// Add indexes for performance
SubcategorySchema.index({ name: 1 });
SubcategorySchema.index({ slug: 1 });
SubcategorySchema.index({ categoryId: 1 });
SubcategorySchema.index({ isActive: 1, order: 1 });
SubcategorySchema.index({ categoryId: 1, isActive: 1 });
