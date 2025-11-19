import { createBaseEmailTemplate } from './base-template';

export function createVerificationEmailTemplate(
  firstName: string,
  verificationCode: string,
  verificationUrl: string,
): string {
  const content = `
    <div>
      <p>Welcome to TradeOff! We're excited to have you join our luxury fashion marketplace.</p>
      
      <p>To complete your registration and start exploring exclusive fashion pieces, please verify your email address using the code below:</p>
      
      <div class="verification-code">
        <div class="code-label">Your verification code:</div>
        <div class="code-value">${verificationCode}</div>
      </div>
      
      <p>You can also click the button below to verify your email automatically:</p>
    </div>
  `;

  return createBaseEmailTemplate({
    title: 'Verify Your Email - TradeOff',
    firstName,
    preheader: 'Complete your registration with TradeOff',
    content,
    actionButton: {
      text: 'Verify Email Address',
      url: verificationUrl,
    },
    footerText: `
      <strong>Important:</strong> This verification code expires in 24 hours.<br>
      If you didn't create an account with TradeOff, you can safely ignore this email.<br><br>
      Best regards,<br>The TradeOff Team
    `,
  });
}

export function createWelcomeEmailTemplate(firstName: string): string {
  const content = `
    <div>
      <p>🎉 <strong>Congratulations!</strong> Your TradeOff account has been successfully verified.</p>
      
      <p>You now have access to our curated collection of luxury fashion items from verified sellers around the world. Here's what you can do:</p>
      
      <ul style="margin: 20px 0; padding-left: 20px; color: #475569;">
        <li style="margin-bottom: 8px;"><strong>Browse & Shop:</strong> Discover authentic designer pieces</li>
        <li style="margin-bottom: 8px;"><strong>Sell Your Items:</strong> Turn your closet into cash</li>
        <li style="margin-bottom: 8px;"><strong>Get Verified:</strong> Build trust with our verification system</li>
        <li style="margin-bottom: 8px;"><strong>Track Orders:</strong> Monitor your purchases and sales</li>
      </ul>
      
      <p>Ready to start your luxury fashion journey?</p>
    </div>
  `;

  return createBaseEmailTemplate({
    title: "Welcome to TradeOff - Let's Get Started!",
    firstName,
    preheader: 'Your account is ready! Start exploring luxury fashion.',
    content,
    actionButton: {
      text: 'Start Shopping',
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    footerText: `
      Need help getting started? Check out our <a href="#" style="color: #38BDF8;">beginner's guide</a> or <a href="#" style="color: #38BDF8;">contact our support team</a>.<br><br>
      Best regards,<br>The TradeOff Team
    `,
  });
}

export function createPasswordResetEmailTemplate(
  firstName: string,
  resetCode: string,
  resetUrl: string,
): string {
  const content = `
    <div>
      <p>We received a request to reset your password for your TradeOff account.</p>
      
      <p>Use the verification code below to reset your password:</p>
      
      <div class="verification-code">
        <div class="code-label">Your password reset code:</div>
        <div class="code-value">${resetCode}</div>
      </div>
      
      <p>Or click the button below to reset your password automatically:</p>
      
      <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Security Notice:</strong> This code expires in 1 hour for your security.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  return createBaseEmailTemplate({
    title: 'Reset Your Password - TradeOff',
    firstName,
    preheader: 'Reset your TradeOff account password securely',
    content,
    actionButton: {
      text: 'Reset Password',
      url: resetUrl,
    },
    footerText: `
      <strong>Security Tip:</strong> Never share your reset code with anyone.<br>
      TradeOff will never ask for your password via email.<br><br>
      Best regards,<br>The TradeOff Team
    `,
  });
}
