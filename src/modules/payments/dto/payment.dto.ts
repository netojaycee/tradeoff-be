import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUrl,
  Min,
} from 'class-validator';
import { PaymentGateway } from '../entities/payment.entity';

/**
 * DTO for initializing payment
 */
export class InitializePaymentDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentGateway)
  @IsOptional()
  gateway?: PaymentGateway = PaymentGateway.PAYSTACK;

  @IsUrl()
  @IsOptional()
  callbackUrl?: string;
}

/**
 * Response DTO for payment initialization
 */
export class PaymentInitializationResponseDto {
  success: boolean;
  message: string;
  data: {
    reference: string;
    authorizationUrl: string;
    accessCode?: string;
    orderId: string;
    amount: number;
    currency: string;
  };
}

/**
 * DTO for PayStack webhook
 */
export class PayStackWebhookDto {
  @IsString()
  event: string;

  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    fees: number;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
  };
}

/**
 * DTO for payment verification
 */
export class VerifyPaymentDto {
  @IsString()
  reference: string;
}

/**
 * Response DTO for payment verification
 */
export class PaymentVerificationResponseDto {
  success: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paidAt?: Date;
    gatewayResponse: string;
    orderId: string;
  };
}

/**
 * DTO for refund request
 */
export class RefundPaymentDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Response DTO for payment details
 */
export class PaymentResponseDto {
  id: string;
  reference: string;
  orderId: string;
  userId: string;
  gateway: PaymentGateway;
  status: string;
  method?: string;
  amount: number;
  currency: string;
  fees: number;
  netAmount?: number;
  gatewayTransactionId?: string;
  authorizationUrl?: string;
  gatewayResponse?: string;
  paidAt?: Date;
  customer?: any;
  authorization?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for webhook signature verification
 */
export class WebhookSignatureDto {
  @IsString()
  signature: string;

  @IsString()
  payload: string;
}
