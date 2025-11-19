import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  InitializePaymentDto,
  PaymentInitializationResponseDto,
  VerifyPaymentDto,
  PaymentVerificationResponseDto,
  PayStackWebhookDto,
  RefundPaymentDto,
  PaymentResponseDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@/common/enums';
import { Public } from '@/common/decorators/public.decorator';

/**
 * Payments Controller
 * Handles payment initialization, verification, and webhooks
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initialize payment for an order
   * POST /payments/initialize
   * Creates payment session and returns PayStack authorization URL
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Body() initializeDto: InitializePaymentDto,
    @Request() req,
    @Headers('origin') origin?: string,
  ): Promise<PaymentInitializationResponseDto> {
    const userId = req.user.sub;
    return this.paymentsService.initializePayment(
      initializeDto,
      userId,
      origin,
    );
  }

  /**
   * Verify payment status
   * POST /payments/verify
   * Checks payment status with PayStack and updates order
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() verifyDto: VerifyPaymentDto,
  ): Promise<PaymentVerificationResponseDto> {
    return this.paymentsService.verifyPayment(verifyDto);
  }

  /**
   * PayStack webhook endpoint
   * POST /payments/webhook/paystack
   * Receives payment notifications from PayStack
   */
  @Post('webhook/paystack')
  @Public()
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ message: string }> {
    try {
      if (!signature) {
        throw new BadRequestException('Missing PayStack signature');
      }

      // Get raw body for signature verification
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Missing request body');
      }

      // Parse webhook data
      const webhookData: PayStackWebhookDto = JSON.parse(rawBody.toString());

      // Process webhook
      await this.paymentsService.handlePayStackWebhook(webhookData, signature);

      return { message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw new BadRequestException(
        `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get payment details
   * GET /payments/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPayment(
    @Param('id') paymentId: string,
    @Request() req,
  ): Promise<PaymentResponseDto> {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new BadRequestException('Payment ID parameter is required');
    }

    const userId = req.user.role === 'admin' ? undefined : req.user.sub;
    return this.paymentsService.getPayment(paymentId, userId);
  }

  /**
   * Refund payment (admin only)
   * POST /payments/:id/refund
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') paymentId: string,
    @Body() refundDto: RefundPaymentDto,
    @Request() req,
  ): Promise<any> {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new BadRequestException('Payment ID parameter is required');
    }

    // Override paymentId from URL param
    refundDto.paymentId = paymentId;

    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.paymentsService.refundPayment(refundDto, userId, userRole);
  }

  /**
   * Get payment statistics (admin only)
   * GET /payments/stats/summary
   */
  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getPaymentStats(): Promise<any> {
    // This would be implemented in PaymentsService
    // For now, return a placeholder
    return {
      message: 'Payment statistics functionality coming soon',
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalRevenue: 0,
      totalFees: 0,
      refundedAmount: 0,
    };
  }

  /**
   * Get user's payment history
   * GET /payments/my/history
   */
  @Get('my/history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMyPayments(@Request() req): Promise<any> {
    const userId = req.user.sub;
    console.log(userId);
    // This would be implemented in PaymentsService
    // For now, return a placeholder
    return {
      message: 'Payment history functionality coming soon',
      data: [],
      total: 0,
    };
  }

  /**
   * Test webhook endpoint (development only)
   * POST /payments/webhook/test
   */
  @Post('webhook/test')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/require-await
  async testWebhook(@Body() testData: any): Promise<{ message: string }> {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test webhook not available in production');
    }

    console.log('Test webhook received:', testData);
    return { message: 'Test webhook processed successfully' };
  }

  /**
   * Health check for payment service
   * GET /payments/health
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/require-await
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
