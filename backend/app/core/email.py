from typing import List
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
from pathlib import Path

conf = ConnectionConfig(
    MAIL_USERNAME = settings.MAIL_USER,
    MAIL_PASSWORD = settings.MAIL_PASS,
    MAIL_FROM = settings.MAIL_USER,
    MAIL_PORT = settings.MAIL_PORT,
    MAIL_SERVER = settings.MAIL_SERVER,
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

async def send_email(email_to: List[EmailStr], subject: str, html_content: str):
    message = MessageSchema(
        subject=subject,
        recipients=email_to,
        body=html_content,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_verification_email(email_to: str, token: str):
    link = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/verify-email?token={token}"
    subject = "Verify your email"
    html = f"""
    <h1>Verify your email</h1>
    <p>Please click the link below to verify your email address:</p>
    <a href="{link}">{link}</a>
    """
    await send_email([email_to], subject, html)

async def send_reset_password_email(email_to: str, token: str):
    link = f"{settings.FRONTEND_ORIGIN.split(',')[0]}/reset-password?token={token}"
    subject = "Reset your password"
    html = f"""
    <h1>Reset Password</h1>
    <p>Click the link below to reset your password:</p>
    <a href="{link}">{link}</a>
    <p>If you didn't request this, please ignore.</p>
    """
    await send_email([email_to], subject, html)
