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
            # Dev Mode Redirect
            if settings.APP_ENV != "production":
                html_content = f"""
                <div style="background: #fff3cd; color: #856404; padding: 10px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                    <strong>🚧 DEV MODE REDIRECT</strong><br/>
                    Original Recipient: {to_email}
                </div>
                {html_content}
                """
                to_email = settings.TEST_EMAIL_RECIPIENT
                
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
    def send_verification_email(to_email: str, token: str):
        """
        Sends a verification email with a link.
        """
        # TODO: Move URL construction to a utility or config
        verify_url = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/verify-email?token={token}"
        
        subject = "Verify your email address"
        html_content = f"""
        <h1>Welcome to {settings.PROJECT_NAME}!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="{verify_url}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: {verify_url}</p>
        <p>This link will expire in 24 hours.</p>
        """
        return EmailService.send_email(to_email, subject, html_content)

    @staticmethod
    def send_password_reset_email(to_email: str, token: str):
        """
        Sends a password reset email.
        """
        reset_url = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/reset-password?token={token}"
        
        subject = "Reset your password"
        html_content = f"""
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="{reset_url}" style="padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy this link: {reset_url}</p>
        <p>If you didn't request this, please ignore this email.</p>
        """
        return EmailService.send_email(to_email, subject, html_content)

    @staticmethod
    def send_error_alert(error_message: str, endpoint: str = "Unknown", method: str = ""):
        """
        Sends an error alert email to the admin.
        """
        from datetime import datetime
        admin_email = "atharvan.coder@gmail.com"
        subject = f"🚨 [{settings.PROJECT_NAME}] Backend Error Alert"
        html_content = f"""
        <h2 style="color: #dc3545;">Backend Error Alert</h2>
        <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">Endpoint:</td><td style="padding: 8px;">{method} {endpoint}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Time:</td><td style="padding: 8px;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Error:</td><td style="padding: 8px; color: #dc3545;">{error_message}</td></tr>
        </table>
        <p style="color: #6c757d; font-size: 12px;">This is an automated alert from the {settings.PROJECT_NAME} backend.</p>
        """
        try:
            EmailService.send_email(admin_email, subject, html_content)
        except Exception:
            logger.error(f"Failed to send error alert email for: {error_message}")
