import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface PayStackInitializePaymentDto {
  email: string;
  amount: number; // Amount in kobo (NGN * 100)
  reference: string;
  callback_url: string;
  metadata?: any;
  currency?: string;
}

export interface PayStackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PayStackVerifyResponse {
  status: boolean;
  message: string;
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
    log: any;
    fees: number;
    fees_split: any;
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
      international_format_phone: string | null;
    };
    plan: any;
    split: any;
    order_id: any;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

@Injectable()
export class PayStackService {
  private readonly apiClient: AxiosInstance;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

    if (!this.secretKey) {
      throw new Error('PayStack secret key is not configured');
    }

    this.apiClient = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Initialize payment with PayStack
   */
  async initializePayment(
    paymentData: PayStackInitializePaymentDto,
  ): Promise<PayStackInitializeResponse> {
    try {
      const response = await this.apiClient.post('/transaction/initialize', {
        email: paymentData.email,
        amount: paymentData.amount,
        reference: paymentData.reference,
        callback_url: paymentData.callback_url,
        metadata: paymentData.metadata || {},
        currency: paymentData.currency || 'NGN',
      });

      return response.data;
    } catch (error) {
      console.error(
        'PayStack initialization error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Payment initialization failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Verify payment with PayStack
   */
  async verifyPayment(reference: string): Promise<PayStackVerifyResponse> {
    try {
      const response = await this.apiClient.get(
        `/transaction/verify/${reference}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        'PayStack verification error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Payment verification failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payload, 'utf-8')
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(
        `/transaction/${transactionId}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        'PayStack get transaction error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get transaction: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    params: {
      perPage?: number;
      page?: number;
      customer?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {},
  ): Promise<any> {
    try {
      const response = await this.apiClient.get('/transaction', { params });
      return response.data;
    } catch (error) {
      console.error(
        'PayStack list transactions error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to list transactions: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(
    transactionId: string,
    amount?: number,
  ): Promise<any> {
    try {
      const payload: any = { transaction: transactionId };
      if (amount) {
        payload.amount = amount;
      }

      const response = await this.apiClient.post('/refund', payload);
      return response.data;
    } catch (error) {
      console.error(
        'PayStack refund error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Refund failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create customer
   */
  async createCustomer(customerData: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const response = await this.apiClient.post('/customer', customerData);
      return response.data;
    } catch (error) {
      console.error(
        'PayStack create customer error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to create customer: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get customer by email or customer code
   */
  async getCustomer(emailOrCode: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/customer/${emailOrCode}`);
      return response.data;
    } catch (error) {
      console.error(
        'PayStack get customer error:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get customer: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Generate reference number
   */
  generateReference(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Convert Naira to Kobo (PayStack expects amount in kobo)
   */
  nairaToKobo(nairaAmount: number): number {
    return Math.round(nairaAmount * 100);
  }

  /**
   * Convert Kobo to Naira
   */
  koboToNaira(koboAmount: number): number {
    return koboAmount / 100;
  }
}
