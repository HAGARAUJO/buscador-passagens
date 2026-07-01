"""Email service for FlyTracker — SMTP Hostinger."""
import smtplib, random, string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = "smtp.hostinger.com"
SMTP_PORT = 465
SMTP_USER = "haroldo.marinho@pelagussolucoesdigitais.com"
SMTP_PASS = "X/xuH?&P3Fh3"
FROM_EMAIL = "FlyTracker <haroldo.marinho@pelagussolucoesdigitais.com>"

# In-memory verification codes
codes = {}

def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_verification_email(to_email):
    """Send a 6-digit verification code to the user's email."""
    code = generate_code()
    codes[to_email] = code

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{{font-family:'Inter',-apple-system,sans-serif;background:#0a0e27;color:#e2e8f0;margin:0;padding:0}}
.container{{max-width:480px;margin:0 auto;padding:2rem 1.5rem}}
.logo{{font-size:1.5rem;font-weight:800;text-align:center;margin-bottom:1.5rem}}
.logo span{{color:#818cf8}}
h1{{font-size:1.2rem;font-weight:700;text-align:center;margin-bottom:.5rem}}
p{{font-size:.9rem;color:#94a3b8;text-align:center;line-height:1.5;margin-bottom:1.5rem}}
.code-box{{background:linear-gradient(135deg,#1a1f4a,#111640);border:1px solid rgba(99,102,241,.2);border-radius:16px;padding:1.5rem;text-align:center;margin-bottom:1.5rem}}
.code{{font-size:2.5rem;font-weight:800;letter-spacing:.25em;color:#818cf8}}
.footer{{font-size:.75rem;color:#64748b;text-align:center}}
.footer a{{color:#818cf8;text-decoration:none}}
</style></head>
<body>
<div class="container">
<div class="logo">🛩️ <span>Fly</span>Tracker</div>
<h1>Código de verificação</h1>
<p>Use o código abaixo para acessar sua conta no FlyTracker. Ele expira em 10 minutos.</p>
<div class="code-box">
<div class="code">{code}</div>
</div>
<div class="footer">
Se você não solicitou este código, ignore este email.<br>
FlyTracker — Milhas + Passagens Aéreas
</div>
</div>
</body>
</html>"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Seu código FlyTracker: {code}"
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg.attach(MIMEText(f"Seu código FlyTracker é: {code}", 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return {"sent": True, "email": to_email}
    except Exception as e:
        return {"sent": False, "error": str(e)}

def verify_code(email, code):
    """Verify a 6-digit code."""
    stored = codes.get(email)
    if stored and stored == code:
        del codes[email]
        return True
    return False
