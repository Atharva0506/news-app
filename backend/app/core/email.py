import resend
from app.core.config import settings
from ratelimit import limits, sleep_and_retry

# Configure Resend
resend.api_key = settings.RESEND_API_KEY

class EmailService:
    @staticmethod
    @sleep_and_retry
    @limits(calls=10, period=1)  # Rate limit: 10 calls per second
    def send_email(to_email: str, subject: str, html_content: str):
        """
        Sends an email using Resend API.
        """
        try:
            r = resend.Emails.send({
                "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM_EMAIL}>",
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            return r
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            # In production, you might want to log this properly or re-raise
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
