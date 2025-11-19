import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductCategory,
  ProductCondition,
  Gender,
  AuthenticationStatus,
} from 'src/common/enums/product.enum';

/**
 * DTO for shipping information
 */
export class ShippingDto {
  @IsNumber()
  @Min(0)
  domestic: number;

  @IsNumber()
  @Min(0)
  international: number;

  @IsBoolean()
  @IsOptional()
  free?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  freeThreshold?: number;
}

/**
 * DTO for measurements
 */
export class MeasurementsDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  chest?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  waist?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hips?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shoulders?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sleeves?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  length?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  inseam?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  rise?: number;
}

/**
 * DTO for creating a new product
 */
export class CreateProductDto {
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description: string;

  @IsString()
  @MinLength(2)
  brand: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsString()
  @IsOptional()
  subCategoryId?: string; // Reference to SubCategory MongoDB ObjectId

  @IsEnum(Gender)
  gender: Gender;

  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  retailPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string = 'NGN';

  @IsBoolean()
  @IsOptional()
  negotiable?: boolean = false;

  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @IsNumber()
  @IsOptional()
  @Min(1900)
  @Max(new Date().getFullYear())
  yearPurchased?: number;

  @IsString()
  @IsOptional()
  purchaseLocation?: string;

  @IsBoolean()
  @IsOptional()
  receiptAvailable?: boolean = false;

  @IsString()
  @IsOptional()
  careInstructions?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  flaws?: string[];

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  sizeType?: string; // US, UK, EU, etc.

  @ValidateNested()
  @Type(() => MeasurementsDto)
  @IsOptional()
  measurements?: MeasurementsDto;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  materials?: string[];

  @IsString()
  color: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  colors?: string[];

  @IsString()
  @IsOptional()
  pattern?: string;

  @IsString()
  @IsOptional()
  season?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  primaryImage: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  additionalImages?: string[];

  @IsEnum(AuthenticationStatus)
  @IsOptional()
  authenticationStatus?: AuthenticationStatus = AuthenticationStatus.PENDING;

  @IsString()
  @IsOptional()
  authenticationCertificate?: string;

  @IsString()
  @IsOptional()
  entrupyId?: string;

  @IsString()
  @IsOptional()
  realAuthId?: string;

  @ValidateNested()
  @Type(() => ShippingDto)
  shipping: ShippingDto;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  shippingMethods?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shippingWeight?: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;
}

/**
 * DTO for updating an existing product
 */
export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(20)
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsNumber()
  @IsOptional()
  @Min(0)
  originalPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sellingPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  retailPrice?: number;

  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;

  @IsString()
  @IsOptional()
  size?: string;

  @ValidateNested()
  @Type(() => MeasurementsDto)
  @IsOptional()
  measurements?: MeasurementsDto;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  materials?: string[];

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  colors?: string[];

  @IsString()
  @IsOptional()
  pattern?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  flaws?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  @IsString()
  @IsOptional()
  primaryImage?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  additionalImages?: string[];

  @ValidateNested()
  @Type(() => ShippingDto)
  @IsOptional()
  shipping?: ShippingDto;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  shippingMethods?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;
}
