import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  ValidateNested,
  Min,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@/common/enums/order.enum';

/**
 * DTO for shipping address
 */
export class ShippingAddressDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(2)
  state: string;

  @IsString()
  @MinLength(2)
  country: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}

/**
 * DTO for individual order items (cart items)
 */
export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  selectedSize?: string; // For products with size variants

  @IsString()
  @IsOptional()
  @MaxLength(200)
  itemNotes?: string; // Special instructions for this item
}

/**
 * DTO for creating a new multi-product order
 */
export class CreateOrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]; // Array of products with quantities

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  buyerNotes?: string;

  @IsString()
  @IsOptional()
  couponCode?: string; // Discount coupon if available

  // Payment will be handled separately via payment service
}

/**
 * DTO for updating order status
 */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  carrierName?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

/**
 * DTO for order cancellation
 */
export class CancelOrderDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

/**
 * DTO for order review
 */
export class ReviewOrderDto {
  @IsNumber()
  @Min(1)
  @Min(5)
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  review?: string;
}

/**
 * DTO for dispute
 */
export class CreateDisputeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}

/**
 * DTO for query parameters
 */
export class GetOrdersQueryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'newest' | 'oldest' | 'amount-high' | 'amount-low' = 'newest';
}

/**
 * Response DTO for individual order items
 */
export class OrderItemResponseDto {
  id: string;
  productId: string;
  sellerId: string;

  // Product snapshot
  productTitle: string;
  productImage: string;
  productBrand: string;
  productSize?: string;
  productCondition: string;
  productCategory: string;

  // Quantity and pricing
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shippingCost: number;
  itemServiceFee: number;
  itemTaxes: number;
  itemTotal: number;

  // Seller info
  sellerName: string;
  sellerEmail: string;
  sellerRevenue: number;
  sellerPaid: boolean;

  // Item status
  itemStatus: string;
  trackingNumber?: string;
  carrierName?: string;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Reviews
  buyerRating?: number;
  buyerReview?: string;

  available: boolean;
  availabilityMessage?: string;
}

/**
 * Response DTO for multi-product order details
 */
export class OrderResponseDto {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: OrderStatus;

  // Order totals
  subtotal: number;
  totalShippingCost: number;
  totalServiceFee: number;
  totalTaxes: number;
  totalAmount: number;
  currency: string;
  itemCount: number;
  sellerCount: number;

  // Items in this order
  items: OrderItemResponseDto[];

  // Seller information
  sellerIds: string[];
  sellerPayouts: {
    sellerId: string;
    sellerName: string;
    itemCount: number;
    revenue: number;
    serviceFee: number;
    paid: boolean;
    payoutReference?: string;
    paidAt?: Date;
  }[];

  // Payment
  paymentStatus: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: Date;

  // Shipping
  shippingAddress: any;
  shippingMethod?: string;
  estimatedDelivery?: Date;

  // Status history
  confirmedAt?: Date;
  processingAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  // Reviews (overall order)
  buyerRating?: number;
  buyerReview?: string;

  // Dispute
  disputed: boolean;
  disputeReason?: string;

  // Notes
  buyerNotes?: string;
  adminNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for calculating order totals before creation
 */
export class CalculateOrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;
}

/**
 * Response DTO for order calculation
 */
export class OrderCalculationResponseDto {
  items: {
    productId: string;
    productTitle: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    shippingCost: number;
    itemServiceFee: number;
    itemTaxes: number;
    itemTotal: number;
    sellerId: string;
    sellerName: string;
    available: boolean;
    availabilityMessage?: string;
  }[];

  subtotal: number;
  totalShippingCost: number;
  totalServiceFee: number;
  totalTaxes: number;
  couponDiscount: number;
  totalAmount: number;
  currency: string;
  itemCount: number;
  sellerCount: number;

  unavailableItems: string[]; // Product IDs of unavailable items
  errors: string[];
}

/**
 * Paginated orders response
 */
export class PaginatedOrdersResponseDto {
  data: OrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

/**
 * DTO for updating item in order
 */
export class UpdateOrderItemDto {
  @IsString()
  itemId: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  carrierName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  cancellationReason?: string;
}

/**
 * DTO for seller payout
 */
export class ProcessSellerPayoutDto {
  @IsString()
  sellerId: string;

  @IsString()
  payoutReference: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
