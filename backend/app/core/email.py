import resend
import logging
from app.core.config import settings
from ratelimit import limits, sleep_and_retry

# Configure Resend
resend.api_key = settings.RESEND_API_KEY

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    @sleep_and_retry
    @limits(calls=10, period=1)  # Rate limit: 10 calls per second
    def send_email(to_email: str, subject: str, html_content: str):
        """
        Sends an email using Resend API.
        """
        try:
            # Dev Mode Redirect (Now disabled to allow sending to any real email)
            if settings.APP_ENV != "production":
                html_content = f"""
                <div style="background: #fff3cd; color: #856404; padding: 10px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                    <strong>🚧 DEV MODE TESTING</strong><br/>
                    Original Recipient: {to_email}
                </div>
                {html_content}
                """
                # to_email = settings.TEST_EMAIL_RECIPIENT

            r = resend.Emails.send({
                "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM_EMAIL}>",
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            return r
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return None

    @staticmethod
    def _email_wrapper(inner_html: str) -> str:
        """Wraps email content in a branded, responsive layout."""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>NewsAI</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#030712 0%,#0f172a 100%);padding:32px 40px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:36px;height:36px;background-color:#10B981;border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;font-weight:700;color:#ffffff;padding:0;">N</td>
                  <td style="padding-left:12px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">NewsAI</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              {inner_html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e4e4e7;padding-top:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;">© 2025 NewsAI — AI-Powered News Intelligence</p>
                    <p style="margin:0;font-size:11px;color:#d4d4d8;">You received this email because an account was created with this address.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    @staticmethod
    def send_verification_email(to_email: str, token: str):
        """
        Sends a verification email with a link.
        """
        verify_url = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/verify-email?token={token}"

        subject = "Verify your email — NewsAI"
        inner = f"""
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Welcome to NewsAI 👋</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6;">
                Thanks for signing up! Verify your email address to unlock AI-powered news summaries, bias detection, and personalized feeds.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background-color:#10B981;border-radius:10px;text-align:center;">
                    <a href="{verify_url}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;">Or copy and paste this URL into your browser:</p>
              <p style="margin:0 0 28px;font-size:13px;color:#10B981;word-break:break-all;line-height:1.5;">
                <a href="{verify_url}" style="color:#10B981;text-decoration:underline;">{verify_url}</a>
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:10px;padding:16px 20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#71717a;">⏱ This link expires in 24 hours</p>
                    <p style="margin:0;font-size:12px;color:#a1a1aa;">If you didn't create a NewsAI account, you can safely ignore this email.</p>
                  </td>
                </tr>
              </table>
"""
        return EmailService.send_email(to_email, subject, EmailService._email_wrapper(inner))

    @staticmethod
    def send_password_reset_email(to_email: str, token: str):
        """
        Sends a password reset email.
        """
        reset_url = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/reset-password?token={token}"

        subject = "Reset your password — NewsAI"
        inner = f"""
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Reset Your Password 🔒</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6;">
                We received a request to reset the password for your NewsAI account. Click the button below to choose a new password.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background-color:#18181b;border-radius:10px;text-align:center;">
                    <a href="{reset_url}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;">Or copy and paste this URL into your browser:</p>
              <p style="margin:0 0 28px;font-size:13px;color:#10B981;word-break:break-all;line-height:1.5;">
                <a href="{reset_url}" style="color:#10B981;text-decoration:underline;">{reset_url}</a>
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:10px;padding:16px 20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;">🔐 Security Notice</p>
                    <p style="margin:0;font-size:12px;color:#b91c1c;">This link expires in 1 hour. If you didn't request a password reset, please ignore this email — your account is safe.</p>
                  </td>
                </tr>
              </table>
"""
        return EmailService.send_email(to_email, subject, EmailService._email_wrapper(inner))
