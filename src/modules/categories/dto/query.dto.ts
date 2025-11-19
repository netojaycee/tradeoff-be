import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query DTO for fetching categories with filters and pagination
 */
export class GetCategoriesQueryDto {
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
   * Filter by active status
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /**
   * Sort by field (name, createdAt, sortOrder, productCount)
   */
  @IsOptional()
  @IsString()
  sortBy?: string = 'sortOrder';

  /**
   * Sort order: 'asc' or 'desc'
   */
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';

  /**
   * Filter by gender if applicable
   */
  @IsOptional()
  @IsString()
  gender?: string;

  /**
   * Search term (searches in name, description, keywords)
   */
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Response DTO for a single category
 */
export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  gender?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  keywords?: string[];
  seoTitle?: string;
  seoDescription?: string;
  productCount: number;
  activeProductCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for category list
 */
export class PaginatedCategoryResponseDto {
  data: CategoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
