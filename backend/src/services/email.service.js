const nodemailer = require('nodemailer');
const env = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
    this._initTransporter();
  }

  _initTransporter() {
    if (env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(env.SMTP_PORT || '465', 10),
        secure: parseInt(env.SMTP_PORT || '465', 10) === 465,
        auth: {
          user: env.SMTP_USER || 'gospeedy.admin@gmail.com',
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log(`📧 EmailService initialized with sender: ${env.SMTP_USER || 'gospeedy.admin@gmail.com'}`);
    } else {
      console.warn('⚠️  EmailService: SMTP_PASS not set in .env. Emails will be logged to console in Dev Mock mode.');
    }
  }

  /**
   * Send a 6-digit password reset OTP email
   * @param {string} toEmail - Recipient email
   * @param {string} otp - 6 digit numeric code
   * @param {string} userName - Name of the user
   */
  async sendOtpEmail(toEmail, otp, userName = 'User') {
    const sender = process.env.EMAIL_FROM || `"GoSpeedy EV Fleet" <gospeedy.admin@gmail.com>`;
    const subject = `${otp} is your GoSpeedy password reset code`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1222; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1222; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #131d35; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Brand Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); width: 36px; height: 36px; border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 900; font-size: 20px;">
                    ⚡
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1;">
                      Go<span style="color: #34d399;">Speedy</span>
                    </div>
                    <div style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px;">
                      EV FLEET FINANCE
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-top: 28px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">Password Reset Verification</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                Hello <strong>${userName}</strong>, we received a request to reset your GoSpeedy account password.
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding: 28px 0;">
              <div style="display: inline-block; background: #070c18; border: 2px dashed #10b981; border-radius: 16px; padding: 18px 36px; text-align: center;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #34d399; font-family: monospace;">
                  ${otp}
                </span>
              </div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600;">
                ⏱️ This code will expire in <strong style="color: #f1f5f9;">10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="background-color: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 14px 18px; text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                🔒 <strong>Security Tip:</strong> Never share this OTP with anyone, including GoSpeedy staff. If you did not request this password reset, your account is still secure and you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 28px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                This is an automated notification from GoSpeedy EV Fleet Management Portal.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
                Sent from: ${env.SMTP_USER || 'gospeedy.admin@gmail.com'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // If transporter is ready, send real email
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: sender,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        console.log(`✅ [EmailService] OTP email delivered to ${toEmail} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error(`❌ [EmailService Error] Failed to send email to ${toEmail}:`, err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    } else {
      // Dev mock fallback
      console.log(`\n=============================================================`);
      console.log(`📨 [DEV MOCK EMAIL] To: ${toEmail}`);
      console.log(`🔐 [RESET OTP CODE]: >>> ${otp} <<< (Valid for 10 minutes)`);
      console.log(`💡 Configure SMTP_PASS in backend/.env to send real Gmail emails!`);
      console.log(`=============================================================\n`);
      return { success: true, mock: true };
    }
  }
}

module.exports = new EmailService();
