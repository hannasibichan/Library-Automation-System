import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

# Load your .env file
load_dotenv()

app = Flask(__name__)

# Load settings from .env
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail = Mail(app)

print("\n--- EMAIL TESTER ---")
print(f"Connecting to: {app.config['MAIL_SERVER']}:{app.config['MAIL_PORT']} as {app.config['MAIL_USERNAME']}...")

with app.app_context():
    try:
        msg = Message(
            "Library System - Test Email",
            recipients=[app.config['MAIL_USERNAME']],
            body="If you see this, your email configuration is WORKING! Success!"
        )
        mail.send(msg)
        print("\nSUCCESS! A test email has been sent to your account.\n")
    except Exception as e:
        print("\nFAILED! Here is the exact error:")
        print("-" * 40)
        print(str(e))
        print("-" * 40)
        print("\nTip: Check for 'Authentication failed' or 'Connection refused'.\n")
