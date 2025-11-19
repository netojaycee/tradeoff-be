import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  createVerificationEmailTemplate,
  createWelcomeEmailTemplate,
  createPasswordResetEmailTemplate,
} from './templates/auth-templates';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('EMAIL_API_KEY');
    const emailAddress = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@fevico.com.ng',
    );
    const senderName = this.configService.get<string>(
      'EMAIL_FROM_NAME',
      'TradeOff',
    );

    // Format email with configurable sender name
    this.fromEmail = `${senderName} <${emailAddress}>`;

    if (!apiKey) {
      this.logger.error('EMAIL_API_KEY is not configured');
      throw new Error('Email service not configured');
    }

    this.resend = new Resend(apiKey);
    this.logger.log(
      `Email service initialized with Resend - From: ${this.fromEmail}`,
    );
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (result.error) {
        this.logger.error('Failed to send email:', result.error);
        return false;
      }

      this.logger.log(
        `Email sent successfully to ${options.to} with ID: ${result.data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Error sending email:', error);
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationCode: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${frontendUrl}/verify-email?code=${verificationCode}&email=${encodeURIComponent(email)}`;

    const html = createVerificationEmailTemplate(
      firstName,
      verificationCode,
      verificationUrl,
    );

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - TradeOff',
      html,
      text: `Welcome to TradeOff! Please verify your email using this code: ${verificationCode}. Or visit: ${verificationUrl}`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const html = createWelcomeEmailTemplate(firstName);

    return this.sendEmail({
      to: email,
      subject: 'Welcome to TradeOff - Your Account is Ready!',
      html,
      text: `Welcome to TradeOff, ${firstName}! Your account has been verified and you can now start exploring our luxury fashion marketplace.`,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetCode: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3049',
    );
    const resetUrl = `${frontendUrl}/auth/reset-password?code=${resetCode}&email=${encodeURIComponent(email)}`;

    const html = createPasswordResetEmailTemplate(
      firstName,
      resetCode,
      resetUrl,
    );

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - TradeOff',
      html,
      text: `Password reset requested for your TradeOff account. Use this code: ${resetCode}. Or visit: ${resetUrl}`,
    });
  }

  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
    firstName: string,
  ): Promise<boolean> {
    const html = `
      <p>Hello ${firstName},</p>
      <p>This email confirms that your TradeOff account email has been changed from ${oldEmail} to ${newEmail}.</p>
      <p>If you didn't make this change, please contact our support team immediately.</p>
      <p>Best regards,<br>The TradeOff Team</p>
    `;

    return this.sendEmail({
      to: oldEmail,
      subject: 'Email Address Changed - TradeOff',
      html,
      text: `Your TradeOff account email has been changed from ${oldEmail} to ${newEmail}. If you didn't make this change, please contact support.`,
    });
  }

  async sendSecurityAlert(
    email: string,
    firstName: string,
    activity: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const html = `
      <p>Hello ${firstName},</p>
      <p>We detected ${activity} on your TradeOff account.</p>
      ${ipAddress ? `<p>IP Address: ${ipAddress}</p>` : ''}
      <p>If this wasn't you, please secure your account immediately by changing your password.</p>
      <p>Best regards,<br>The TradeOff Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Security Alert - TradeOff',
      html,
      text: `Security alert: ${activity} detected on your TradeOff account. If this wasn't you, please change your password immediately.`,
    });
  }

  sendOrderConfirmationEmail(
    email: string,
    firstName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _orderDetails: any,
  ): void {
    // TODO: Implement order confirmation template
    console.log(`Sending order confirmation email to ${email}`);
    console.log(`Hello ${firstName}, your order has been confirmed`);
  }

  sendSellerNotificationEmail(
    email: string,
    firstName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _notification: any,
  ): void {
    // TODO: Implement seller notification template
    console.log(`Sending seller notification email to ${email}`);
    console.log(`Hello ${firstName}, you have a new notification`);
  }
}
