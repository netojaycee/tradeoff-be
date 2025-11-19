import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Payment,
  PaymentDocument,
  PaymentGateway,
} from './entities/payment.entity';
import { Order, OrderDocument } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { PayStackService } from './services/paystack.service';
import {
  InitializePaymentDto,
  PaymentInitializationResponseDto,
  VerifyPaymentDto,
  PaymentVerificationResponseDto,
  PayStackWebhookDto,
  RefundPaymentDto,
  PaymentResponseDto,
} from './dto/payment.dto';
import { PaymentStatus, PaymentMethod } from '@/common/enums/order.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly payStackService: PayStackService,
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize payment for an order
   */
  async initializePayment(
    initializeDto: InitializePaymentDto,
    userId: string,
    origin?: string,
  ): Promise<PaymentInitializationResponseDto> {
    try {
      // Validate order
      if (!Types.ObjectId.isValid(initializeDto.orderId)) {
        throw new BadRequestException('Invalid order ID format');
      }

      const order = await this.orderModel.findById(initializeDto.orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check if user is the buyer
      if (order.buyerId.toString() !== userId) {
        throw new BadRequestException('You can only pay for your own orders');
      }

      // Check if order is already paid
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        throw new ConflictException('Order has already been paid');
      }

      // Check for existing pending payment
      const existingPayment = await this.paymentModel.findOne({
        orderId: order._id,
        status: PaymentStatus.PENDING,
      });

      if (existingPayment) {
        // Return existing payment if still valid (less than 30 minutes old)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (existingPayment.createdAt > thirtyMinutesAgo) {
          return {
            success: true,
            message: 'Payment already initialized',
            data: {
              reference: existingPayment.reference,
              authorizationUrl: existingPayment.authorizationUrl!,
              accessCode: existingPayment.accessCode,
              orderId: (order._id as Types.ObjectId).toString(),
              amount: existingPayment.amount,
              currency: existingPayment.currency,
            },
          };
        } else {
          // Mark old payment as expired
          await this.paymentModel.findByIdAndUpdate(existingPayment._id, {
            status: PaymentStatus.FAILED,
            failureReason: 'Payment expired',
            failedAt: new Date(),
          });
        }
      }

      // Generate payment reference
      const reference = this.payStackService.generateReference('PAY');

      // Prepare callback URL
      const callbackUrl =
        initializeDto.callbackUrl || `${origin}/checkout/callback`;

      // Initialize payment with gateway
      let paymentResponse: any;
      const gateway: PaymentGateway =
        initializeDto.gateway || PaymentGateway.PAYSTACK;

      switch (gateway) {
        case PaymentGateway.PAYSTACK:
          paymentResponse = await this.initializePayStackPayment(
            order,
            reference,
            callbackUrl,
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported payment gateway: ${gateway}`,
          );
      }

      // Save payment record
      const payment = new this.paymentModel({
        reference,
        orderId: order._id,
        userId: new Types.ObjectId(userId),
        gateway,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
        currency: order.currency,
        authorizationUrl: paymentResponse.authorization_url,
        accessCode: paymentResponse.access_code,
        callbackUrl,
        initiatedAt: new Date(),
        gatewayMetadata: paymentResponse,
      });

      await payment.save();

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          reference,
          authorizationUrl: paymentResponse.authorization_url,
          accessCode: paymentResponse.access_code,
          orderId: (order._id as Types.ObjectId).toString(),
          amount: order.totalAmount,
          currency: order.currency,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(
    verifyDto: VerifyPaymentDto,
  ): Promise<PaymentVerificationResponseDto> {
    try {
      // Find payment record
      const payment = await this.paymentModel.findOne({
        reference: verifyDto.reference,
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      // Skip verification if already completed
      if (payment.status === PaymentStatus.COMPLETED) {
        return {
          success: true,
          message: 'Payment already verified',
          data: {
            reference: payment.reference,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            paidAt: payment.paidAt,
            gatewayResponse: payment.gatewayResponse!,
            orderId: payment.orderId.toString(),
          },
        };
      }

      // Verify with gateway
      let verificationResult: any;
      switch (payment.gateway) {
        case PaymentGateway.PAYSTACK:
          verificationResult = await this.payStackService.verifyPayment(
            verifyDto.reference,
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported payment gateway: ${payment.gateway}`,
          );
      }

      // Process verification result
      await this.processPaymentVerification(payment, verificationResult);

      const updatedPayment = await this.paymentModel.findById(payment._id);

      return {
        success: true,
        message:
          updatedPayment!.status === PaymentStatus.COMPLETED
            ? 'Payment verified successfully'
            : 'Payment verification failed',
        data: {
          reference: updatedPayment!.reference,
          status: updatedPayment!.status,
          amount: updatedPayment!.amount,
          currency: updatedPayment!.currency,
          paidAt: updatedPayment!.paidAt,
          gatewayResponse: updatedPayment!.gatewayResponse!,
          orderId: updatedPayment!.orderId.toString(),
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle PayStack webhook
   */
  async handlePayStackWebhook(
    webhookData: PayStackWebhookDto,
    signature: string,
  ): Promise<void> {
    try {
      // Verify webhook signature
      const isValidSignature = this.payStackService.verifyWebhookSignature(
        JSON.stringify(webhookData),
        signature,
      );

      if (!isValidSignature) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // Process webhook based on event type
      switch (webhookData.event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(webhookData.data);
          break;
        case 'charge.failed':
          await this.handleFailedPayment(webhookData.data);
          break;
        default:
          console.log(`Unhandled webhook event: ${webhookData.event}`);
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw new BadRequestException(
        `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get payment details
   */
  async getPayment(
    paymentId: string,
    userId?: string,
  ): Promise<PaymentResponseDto> {
    try {
      if (!Types.ObjectId.isValid(paymentId)) {
        throw new BadRequestException('Invalid payment ID format');
      }

      const payment = await this.paymentModel
        .findById(paymentId)
        .populate('orderId')
        .lean()
        .exec();

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Check access permissions
      if (userId && payment.userId.toString() !== userId) {
        throw new BadRequestException(
          'You do not have permission to view this payment',
        );
      }

      return this.mapPaymentToResponseDto(payment);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(
    refundDto: RefundPaymentDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const payment = await this.paymentModel.findById(refundDto.paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Check permissions
      if (userRole !== 'admin' && payment.userId.toString() !== userId) {
        throw new BadRequestException(
          'You do not have permission to refund this payment',
        );
      }

      // Check if payment can be refunded
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed payments can be refunded',
        );
      }

      if (payment.refunded) {
        throw new ConflictException('Payment has already been refunded');
      }

      // Process refund based on gateway
      let refundResult: any;
      switch (payment.gateway) {
        case PaymentGateway.PAYSTACK:
          refundResult = await this.payStackService.refundTransaction(
            payment.gatewayTransactionId!,
            refundDto.amount,
          );
          break;
        default:
          throw new BadRequestException(
            `Refunds not supported for gateway: ${payment.gateway}`,
          );
      }

      // Update payment record
      payment.refunded = true;
      payment.refundedAmount = refundDto.amount || payment.amount;
      payment.refundedAt = new Date();
      payment.refundReason = refundDto.reason;
      payment.status = PaymentStatus.REFUNDED;

      await payment.save();

      return {
        success: true,
        message: 'Refund processed successfully',
        data: refundResult,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Private helper methods
   */
  private async initializePayStackPayment(
    order: OrderDocument,
    reference: string,
    callbackUrl: string,
  ): Promise<any> {
    const amountInKobo = this.payStackService.nairaToKobo(order.totalAmount);

    const paymentData = {
      email: order.shippingAddress.email,
      amount: amountInKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        orderId: (order._id as Types.ObjectId).toString(),
        orderNumber: order.orderNumber,
        itemCount: order.itemCount,
        sellerCount: order.sellerCount,
        buyerId: order.buyerId.toString(),
        sellerIds:
          order.sellerIds?.map((id: any) => (id as string).toString()) || [],
        multiProduct: order.itemCount > 1,
        multiSeller: order.sellerCount > 1,
        subtotal: order.subtotal,
        shippingCost: order.totalShippingCost,
        serviceFee: order.totalServiceFee,
        taxes: order.totalTaxes,
      },
    };

    const response = await this.payStackService.initializePayment(paymentData);
    if (!response.status) {
      throw new BadRequestException('Failed to initialize PayStack payment');
    }

    return response.data;
  }

  private async processPaymentVerification(
    payment: any,
    verificationResult: any,
  ): Promise<void> {
    const isSuccessful =
      verificationResult.status && verificationResult.data.status === 'success';

    if (isSuccessful) {
      // Update payment as successful
      await this.paymentModel.findByIdAndUpdate(payment._id, {
        status: PaymentStatus.COMPLETED,
        gatewayTransactionId: verificationResult.data.id,
        gatewayReference: verificationResult.data.reference,
        gatewayResponse: verificationResult.data.gateway_response,
        method: this.mapPayStackChannelToMethod(
          verificationResult.data.channel,
        ),
        fees: this.payStackService.koboToNaira(
          verificationResult.data.fees || 0,
        ),
        netAmount:
          payment.amount -
          this.payStackService.koboToNaira(verificationResult.data.fees || 0),
        paidAt: new Date(verificationResult.data.paid_at),
        completedAt: new Date(),
        customer: {
          email: verificationResult.data.customer.email,
          firstName: verificationResult.data.customer.first_name,
          lastName: verificationResult.data.customer.last_name,
          phone: verificationResult.data.customer.phone,
          customerId: verificationResult.data.customer.id,
          customerCode: verificationResult.data.customer.customer_code,
        },
        authorization: verificationResult.data.authorization,
        webhookData: verificationResult.data,
        ipAddress: verificationResult.data.ip_address,
        riskAction: verificationResult.data.customer.risk_action,
      });

      // Update order payment status
      await this.ordersService.confirmPayment(payment.orderId, {
        reference: payment.reference,
        method: this.mapPayStackChannelToMethod(
          verificationResult.data.channel,
        ),
        gateway: payment.gateway,
      });
    } else {
      // Update payment as failed
      await this.paymentModel.findByIdAndUpdate(payment._id, {
        status: PaymentStatus.FAILED,
        gatewayResponse: verificationResult.data.gateway_response,
        failureReason: verificationResult.data.message,
        failedAt: new Date(),
      });
    }
  }

  private async handleSuccessfulPayment(paymentData: any): Promise<void> {
    try {
      const payment = await this.paymentModel.findOne({
        reference: paymentData.reference,
      });

      if (payment && payment.status === PaymentStatus.PENDING) {
        await this.processPaymentVerification(payment, {
          status: true,
          data: paymentData,
        });
      }
    } catch (error) {
      console.error('Failed to handle successful payment webhook:', error);
    }
  }

  private async handleFailedPayment(paymentData: any): Promise<void> {
    try {
      const payment = await this.paymentModel.findOne({
        reference: paymentData.reference,
      });

      if (payment && payment.status === PaymentStatus.PENDING) {
        await this.paymentModel.findByIdAndUpdate(payment._id, {
          status: PaymentStatus.FAILED,
          gatewayResponse: paymentData.gateway_response,
          failureReason: paymentData.message,
          failedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to handle failed payment webhook:', error);
    }
  }

  private mapPayStackChannelToMethod(channel: string): PaymentMethod {
    switch (channel?.toLowerCase()) {
      case 'card':
        return PaymentMethod.CARD;
      case 'bank':
      case 'bank_transfer':
        return PaymentMethod.BANK_TRANSFER;
      case 'ussd':
      case 'mobile_money':
        return PaymentMethod.WALLET;
      default:
        return PaymentMethod.CARD;
    }
  }

  private mapPaymentToResponseDto(payment: any): PaymentResponseDto {
    return {
      id: payment._id?.toString() || payment.id,
      reference: payment.reference,
      orderId: payment.orderId?.toString(),
      userId: payment.userId?.toString(),
      gateway: payment.gateway,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      fees: payment.fees,
      netAmount: payment.netAmount,
      gatewayTransactionId: payment.gatewayTransactionId,
      authorizationUrl: payment.authorizationUrl,
      gatewayResponse: payment.gatewayResponse,
      paidAt: payment.paidAt,
      customer: payment.customer,
      authorization: payment.authorization,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
