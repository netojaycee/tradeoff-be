import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query DTO for fetching subcategories with filters and pagination
 */
export class GetSubcategoriesQueryDto {
  /**
   * Page number for pagination (1-indexed)
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  /**
   * Number of items per page
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  /**
   * Filter by parent category ID
   */
  @IsOptional()
  @IsString()
  categoryId?: string;

  /**
   * Filter by active status
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /**
   * Sort by field (name, createdAt, order, productCount)
   */
  @IsOptional()
  @IsString()
  sortBy?: string = 'order';

  /**
   * Sort order: 'asc' or 'desc'
   */
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';

  /**
   * Search term (searches in name, description)
   */
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Response DTO for a single subcategory
 */
export class SubcategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  productCount: number;
  metaKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for subcategory list
 */
export class PaginatedSubcategoryResponseDto {
  data: SubcategoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
