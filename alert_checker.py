"""Alert checker — lê emails do Gmail via Composio."""
import asyncio
import os
import re
from datetime import datetime

USER_ID = os.getenv("GMAIL_ENTITY", "pg-test-0b63b0ba-9503-4607-8921-3f03394aa1ed")
ALERTA_INTERVAL = int(os.getenv("ALERTA_INTERVAL_HORAS", "2"))

HAS_COMPOSIO = False
try:
    from composio import Composio
    HAS_COMPOSIO = bool(os.getenv("COMPOSIO_API_KEY", ""))
except ImportError:
    print("⚠️ composio not installed")

SQL_CREATE_ALERTAS = """
CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    origem VARCHAR(3),
    destino VARCHAR(3),
    milhas_max INTEGER,
    programa VARCHAR(100),
    classe VARCHAR(20),
    email_origem VARCHAR(255),
    data_viagem DATE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    processado BOOLEAN DEFAULT FALSE
);
"""


async def init_alertas_table(engine):
    """Ensure alertas table exists."""
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text(SQL_CREATE_ALERTAS))
        print("✅ alertas table ready")
    except Exception as e:
        print(f"⚠️ Could not create alertas table: {e}")


def extract_visible_text(html: str) -> str:
    """Strip HTML/CSS and decode entities to get visible text."""
    if not html:
        return ""
    # Remove script/style blocks
    text = re.sub(r'<(?:script|style)[^>]*>.*?</(?:script|style)>', '', html, flags=re.DOTALL | re.I)
    # Remove all HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Decode common entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = text.replace('&lt;', '<').replace('&gt;', '>')
    text = re.sub(r'&#\d+;', ' ', text)
    text = re.sub(r'&[a-z]+;', ' ', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_alert_email(subject: str, body: str) -> list[dict]:
    """Extrai alertas do assunto/corpo do email (formato Seats.aero)."""
    alerts = []
    visible = extract_visible_text(f"{subject} {body}")
    if not visible:
        return alerts

    # Route: "from GRU to JFK" or "GRU→JFK"
    route_match = re.search(
        r'(?:(?:from\s+)?(?P<orig>[A-Z]{3})\s*(?:[→➡>\-]|\s+to\s+)\s*(?P<dest>[A-Z]{3}))', visible, re.I
    )
    if not route_match:
        return alerts
    orig = route_match.group("orig")
    dest = route_match.group("dest")

    # Miles/points: "28,000 points" or "28.000 milhas"
    miles_match = re.search(r'(\d[\d,.]*)\s*(?:points|pts|milhas|miles|mi)', visible, re.I)
    miles = int(re.sub(r'[^0-9]', '', miles_match.group(1))) if miles_match else None

    # Airline/program: "with Air France/KLM Flying Blue" or similar
    prog_match = re.search(
        r'(?:with|via|da|do)\s+([A-Za-zÀ-ÿ&.\s/]{3,60}?)(?:\s+in\s+|\s+for\s+|\.)', visible, re.I
    )
    prog = prog_match.group(1).strip() if prog_match else None

    # Class: economy, premium, business, first, executiva
    cls_match = re.search(
        r'(?:(?:in|class|cabin|classe)\s+)?(economy|econômica|econ|premium|executiva|business|first|primeira)',
        visible, re.I
    )
    cls = cls_match.group(1).lower() if cls_match else "economy"
    cls_map = {"econômica": "economy", "econ": "economy",
               "executiva": "business", "primeira": "first"}
    cls = cls_map.get(cls, cls)

    # Date: YYYY-MM-DD
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', visible)
    data_viagem = date_match.group(1) if date_match else None

    alerts.append({
        "origem": orig, "destino": dest, "milhas_max": miles,
        "programa": prog, "classe": cls,
        "data_viagem": data_viagem,
        "email_origem": "alert@seats.aero",
    })
    return alerts


async def check_alerts(redis_client, engine):
    """Fetch unread Gmail emails, parse, store."""
    if not HAS_COMPOSIO:
        print("ℹ️ Composio not configured — skipping alert check")
        return

    try:
        composio = Composio()
        print("📧 Checking Gmail for alert emails...")

        result = composio.tools.execute(
            slug="GMAIL_FETCH_EMAILS",
            arguments={"user_id": "me", "max_results": 10},
            user_id=USER_ID,
            dangerously_skip_version_check=True,
        )

        if isinstance(result, dict):
            messages = result.get("data", {}).get("messages", [])
        else:
            print(f"⚠️ Unexpected response type: {type(result)}")
            return

        if not messages:
            print("ℹ️ No new emails found")
            return

        print(f"📧 Found {len(messages)} email(s) to process")
        from sqlalchemy import text
        new_alerts = 0
        msg_ids_to_mark = []

        for msg in messages:
            subject = msg.get("subject", "") or ""
            msg_id = msg.get("messageId", "") or msg.get("id", "")
            print(f"  → Subject: {subject[:80]}")

            alerts = parse_alert_email(subject, msg.get("messageText", "") or msg.get("snippet", "") or "")
            if not alerts:
                print("     ⏭️  Not an award alert")
                continue

            with engine.connect() as conn:
                existing = conn.execute(
                    text("SELECT id FROM alertas WHERE email_origem = :e AND criado_em > NOW() - INTERVAL '24 hours' LIMIT 1"),
                    {"e": f"gmail_{msg_id}"}
                ).fetchone()

            if existing:
                print("     ⏭️  Already processed")
                continue

            for alert in alerts:
                with engine.begin() as conn:
                    conn.execute(
                        text("""INSERT INTO alertas (origem, destino, milhas_max, programa, classe, data_viagem, email_origem)
                                VALUES (:o, :d, :m, :p, :c, :dv, :e)"""),
                        {"o": alert["origem"], "d": alert["destino"],
                         "m": alert["milhas_max"], "p": alert["programa"],
                         "c": alert["classe"], "dv": alert["data_viagem"],
                         "e": f"gmail_{msg_id}"}
                    )
                new_alerts += 1
                detail = f"{alert['origem']}→{alert['destino']}"
                if alert["milhas_max"]:
                    detail += f" {alert['milhas_max']}mi"
                if alert["programa"]:
                    detail += f" {alert['programa']}"
                print(f"     ✅ {detail}")
            msg_ids_to_mark.append(msg_id)

        if msg_ids_to_mark:
            try:
                composio.tools.execute(
                    slug="GMAIL_BATCH_MODIFY_MESSAGES",
                    arguments={"user_id": "me", "messageIds": msg_ids_to_mark, "removeLabelIds": ["UNREAD"]},
                    user_id=USER_ID,
                    dangerously_skip_version_check=True,
                )
                print(f"     📭 {len(msg_ids_to_mark)} email(s) marked as read")
            except Exception as e:
                print(f"     ⚠️ Could not mark as read: {e}")

        print(f"✅ Alert check complete — {new_alerts} new alerts stored")

    except Exception as e:
        print(f"⚠️ Alert check failed: {e}")


async def alert_loop(redis_client, engine):
    """Background loop every ALERTA_INTERVAL hours."""
    while True:
        await check_alerts(redis_client, engine)
        await asyncio.sleep(ALERTA_INTERVAL * 3600)
