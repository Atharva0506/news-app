import sys
import os

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

try:
    from app.core.config import settings
    print("Settings loaded successfully!")
    print(f"MAIL_USER={settings.MAIL_USER}")
    # Don't print the password, just verify it's set
    print(f"MAIL_PASS is set: {bool(settings.MAIL_PASS)}")
except Exception as e:
    print(f"Error loading settings: {e}")
    sys.exit(1)
