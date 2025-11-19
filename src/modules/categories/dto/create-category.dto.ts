import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Gender } from 'src/common/enums/product.enum';

/**
 * DTO for creating a new category
 */
export class CreateCategoryDto {
  /**
   * Category name (required)
   * Example: "Electronics", "Clothing", "Jewelry"
   */
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  name: string;

  /**
   * Category slug - URL friendly version
   * Example: "electronics", "clothing", "jewelry"
   * If not provided, will be auto-generated from name
   */
  @IsOptional()
  @IsString()
  slug?: string;

  /**
   * Category description
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  /**
   * Gender filter for this category (if applicable)
   * From Gender enum: "MEN", "WOMEN", "UNISEX"
   */
  @IsOptional()
  @IsString()
  gender?: Gender;

  /**
   * Category image/thumbnail URL
   */
  @IsOptional()
  @IsString()
  image?: string;

  /**
   * Category icon identifier or URL
   */
  @IsOptional()
  @IsString()
  icon?: string;

  /**
   * Whether the category is active/visible
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Sort order for displaying categories
   * Lower numbers display first
   */
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  /**
   * SEO keywords for the category
   */
  @IsOptional()
  @IsArray()
  keywords?: string[];

  /**
   * SEO title for the category
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  /**
   * SEO meta description for the category
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;
}
