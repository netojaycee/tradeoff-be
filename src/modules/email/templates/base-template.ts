/**
 * Base email template for TradeOff
 * Responsive design that works across all email clients
 * Main brand color: #38BDF8
 */

export interface EmailTemplateData {
  title: string;
  firstName: string;
  preheader?: string;
  content: string;
  actionButton?: {
    text: string;
    url: string;
  };
  footerText?: string;
}

export function createBaseEmailTemplate(data: EmailTemplateData): string {
  const {
    title,
    firstName,
    preheader = '',
    content,
    actionButton,
    footerText = 'Best regards,<br>The TradeOff Team',
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
        }
        
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        
        img {
            border: 0;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
            max-width: 100%;
            height: auto;
        }
        
        /* Container styles */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        /* Header styles */
        .email-header {
            background: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            text-decoration: none;
            letter-spacing: -0.025em;
            margin-bottom: 8px;
            display: inline-block;
        }
        
        .tagline {
            color: #e0f2fe;
            font-size: 14px;
            font-weight: 500;
        }
        
        /* Content styles */
        .email-content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 24px;
        }
        
        .content-text {
            font-size: 16px;
            line-height: 1.7;
            color: #475569;
            margin-bottom: 32px;
        }
        
        /* Button styles */
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            border: none;
            box-shadow: 0 4px 6px -1px rgba(56, 189, 248, 0.3);
            transition: all 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 15px -3px rgba(56, 189, 248, 0.4);
        }
        
        /* Code styles */
        .verification-code {
            background-color: #f1f5f9;
            border: 2px dashed #38BDF8;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
        }
        
        .code-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .code-value {
            font-size: 24px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
        }
        
        /* Footer styles */
        .email-footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-text {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
        }
        
        .footer-links {
            margin-bottom: 20px;
        }
        
        .footer-link {
            color: #38BDF8;
            text-decoration: none;
            margin: 0 15px;
            font-size: 14px;
        }
        
        .footer-link:hover {
            text-decoration: underline;
        }
        
        .footer-bottom {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            .email-header,
            .email-content,
            .email-footer {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }
            
            .logo {
                font-size: 28px !important;
            }
            
            .greeting {
                font-size: 16px !important;
            }
            
            .content-text {
                font-size: 15px !important;
            }
            
            .cta-button {
                padding: 14px 24px !important;
                font-size: 15px !important;
            }
            
            .code-value {
                font-size: 20px !important;
                letter-spacing: 2px !important;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-container {
                background-color: #1e293b !important;
            }
            
            .email-content {
                background-color: #1e293b !important;
            }
            
            .greeting {
                color: #f1f5f9 !important;
            }
            
            .content-text {
                color: #cbd5e1 !important;
            }
            
            .verification-code {
                background-color: #334155 !important;
                border-color: #38BDF8 !important;
            }
            
            .code-value {
                color: #f1f5f9 !important;
            }
        }
    </style>
</head>
<body>
    ${preheader ? `<div style="display: none; mso-hide: all; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <div class="email-container">
                    <!-- Header -->
                    <div class="email-header">
                        <a href="#" class="logo">TradeOff</a>
                        <div class="tagline">Luxury Fashion Marketplace</div>
                    </div>
                    
                    <!-- Content -->
                    <div class="email-content">
                        <div class="greeting">Hi ${firstName},</div>
                        <div class="content-text">${content}</div>
                        
                        ${
                          actionButton
                            ? `
                        <div class="button-container">
                            <a href="${actionButton.url}" class="cta-button">${actionButton.text}</a>
                        </div>
                        `
                            : ''
                        }
                    </div>
                    
                    <!-- Footer -->
                    <div class="email-footer">
                        <div class="footer-text">${footerText}</div>
                        
                        <div class="footer-links">
                            <a href="#" class="footer-link">Help Center</a>
                            <a href="#" class="footer-link">Contact Us</a>
                            <a href="#" class="footer-link">Privacy Policy</a>
                        </div>
                        
                        <div class="footer-bottom">
                            © ${new Date().getFullYear()} TradeOff. All rights reserved.<br>
                            This email was sent to you because you have an account with TradeOff.<br>
                            If you no longer wish to receive these emails, you can <a href="#" style="color: #38BDF8;">unsubscribe here</a>.
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}
