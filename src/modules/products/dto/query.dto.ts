import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import {
  ProductCondition,
  ProductStatus,
  Gender,
  AuthenticationStatus,
} from '@/common/enums/product.enum';
import { Transform } from 'class-transformer';

/**
 * DTO for querying products with filters and pagination
 */
export class GetProductsQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @Min(0)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @Min(0)
  maxPrice?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  tags?: string[];

  @IsString()
  @IsOptional()
  sortBy?:
    | 'newest'
    | 'oldest'
    | 'price-low'
    | 'price-high'
    | 'popular'
    | 'trending' = 'newest';

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus = ProductStatus.ACTIVE;

  @IsEnum(AuthenticationStatus)
  @IsOptional()
  authenticationStatus?: AuthenticationStatus;

  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @Min(1900)
  @Max(new Date().getFullYear())
  yearPurchased?: number;

  @IsString()
  @IsOptional()
  location?: string;
}

/**
 * DTO for user's products query
 */
export class GetUserProductsQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  sortBy?: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'popular' =
    'newest';

  @IsString()
  @IsOptional()
  search?: string;
}

/**
 * DTO for search products with text search
 */
export class SearchProductsDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  maxPrice?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'relevance' | 'newest' | 'price-low' | 'price-high' | 'popular' =
    'relevance';
}

/**
 * DTO for product response to client
 */
export class ProductResponseDto {
  id: string;
  title: string;
  description: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  category: string;
  subCategory?: string;
  gender: Gender;
  sellerId: string;
  sellerName: string;
  isVerifiedSeller: boolean;
  originalPrice: number;
  sellingPrice: number;
  retailPrice?: number;
  currency: string;
  negotiable: boolean;
  condition: ProductCondition;
  yearPurchased?: number;
  purchaseLocation?: string;
  receiptAvailable: boolean;
  careInstructions?: string;
  flaws?: string[];
  size?: string;
  sizeType?: string;
  measurements?: any;
  materials?: string[];
  color: string;
  colors?: string[];
  pattern?: string;
  season?: string;
  tags?: string[];
  images: string[];
  authenticationStatus: AuthenticationStatus;
  authenticationCertificate?: string;
  slug: string;
  status: ProductStatus;
  featured: boolean;
  promoted: boolean;
  quantity: number;
  sold: boolean;
  shipping: any;
  shippingMethods?: string[];
  views: number;
  likes: number;
  saves: number;
  shares: number;
  inquiries: number;
  averageRating?: number;
  totalReviews?: number;
  keywords?: string[];
  seoTitle?: string;
  seoDescription?: string;
  location?: any;
  publishedAt?: Date;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  likedBy?: string[];
  savedBy?: string[];
}

/**
 * DTO for paginated product response
 */
export class PaginatedProductResponseDto {
  data: ProductResponseDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}
