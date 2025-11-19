import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new subcategory
 */
export class CreateSubcategoryDto {
  /**
   * Subcategory name (required)
   * Example: "Tops", "Heels", "Dresses"
   */
  @IsString()
  @MinLength(2, { message: 'Subcategory name must be at least 2 characters' })
  @MaxLength(100, {
    message: 'Subcategory name cannot exceed 100 characters',
  })
  name: string;

  /**
   * Subcategory slug - URL friendly version
   * Example: "tops", "heels", "dresses"
   * If not provided, will be auto-generated from name
   */
  @IsOptional()
  @IsString()
  slug?: string;

  /**
   * Parent category ID (required)
   * Reference to the Category document this subcategory belongs to
   */
  @IsString()
  categoryId: string;

  /**
   * Subcategory description
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description cannot exceed 500 characters',
  })
  description?: string;

  /**
   * Subcategory icon identifier or URL
   */
  @IsOptional()
  @IsString()
  icon?: string;

  /**
   * Display order for sorting subcategories
   * Lower numbers display first
   */
  @IsOptional()
  @IsNumber()
  order?: number;

  /**
   * Whether the subcategory is active/visible
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * SEO keywords for the subcategory
   */
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];

  /**
   * SEO title for the subcategory
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaTitle?: string;

  /**
   * SEO meta description for the subcategory
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;
}
