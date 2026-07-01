"""
FlyTracker API — Real award (miles) + commercial flight search.
Data sources: Program charts, Smiles/TudoAzul/LATAM Pass/AAdvantage/etc.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Real data module
from award_data import (
    search_award_flights, search_commercial_flights,
    get_deals, AIRLINES_INFO
)

# Email auth module
from email_service import send_verification_email, verify_code

app = FastAPI(title="FlyTracker API", description="Flight price monitoring in BRL and miles (award)", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory alerts store
alerts_db = {}
scrapers_status = {
    "seats_aero_api": False,
    "program_charts": True,
    "curated_deals": True,
}

# ─── Auth models ───
class SendCodeRequest(BaseModel):
    email: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

# ─── Auth endpoints ───

@app.post("/api/auth/send-code")
def send_code(req: SendCodeRequest):
    """Send 6-digit verification code to email."""
    if not req.email or "@" not in req.email:
        raise HTTPException(400, "Email inválido")
    result = send_verification_email(req.email)
    if not result["sent"]:
        raise HTTPException(500, f"Erro ao enviar email: {result.get('error')}")
    return {"status": "sent", "email": req.email}

@app.post("/api/auth/verify-code")
def verify_code_endpoint(req: VerifyCodeRequest):
    """Verify 6-digit code and return user session."""
    if not verify_code(req.email, req.code):
        raise HTTPException(401, "Código inválido ou expirado")
    return {
        "status": "verified",
        "email": req.email,
        "token": str(uuid.uuid4()),
        "user": {"email": req.email}
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0", "data_source": "real_program_charts"}

@app.get("/api/flights")
def search_flights(
    origin: str = Query(..., description="Airport IATA code"),
    destination: str = Query(..., description="Airport IATA code"),
    date: Optional[str] = Query(None, description="Date YYYY-MM-DD"),
    cabin: str = Query("economy", regex="^(economy|business)$"),
):
    """Search both award (miles) and commercial (BRL) prices for a route."""
    if len(origin) != 3 or len(destination) != 3:
        raise HTTPException(400, "Airport codes must be 3-letter IATA codes")
    
    origin = origin.upper()
    destination = destination.upper()
    
    # Award/miles search
    award_results = search_award_flights(origin, destination, cabin, date)
    
    # Commercial/cash search
    commercial_results = search_commercial_flights(origin, destination, cabin, date)
    
    programs_detail = {}
    for r in award_results:
        prog = r["program"]
        if prog in AIRLINES_INFO and prog not in programs_detail:
            programs_detail[prog] = AIRLINES_INFO[prog]
    
    return {
        "route": f"{origin}→{destination}",
        "cabin": cabin,
        "date": date or "flexible",
        "award": {
            "results": award_results,
            "total_options": len(award_results),
            "programs": programs_detail
        },
        "commercial": {
            "results": commercial_results,
            "note": "Preços comerciais estimados com base em dados de mercado"
        },
        "data_sources": {
            "award": "program_charts",
            "commercial": "compiled_market_data"
        }
    }

@app.get("/api/deals")
def deals():
    """Return real curated award deals."""
    return {
        "deals": get_deals(),
        "source": "point.me_research",
        "note": "Deals reais coletados de fontes públicas. Expiração estimada."
    }

@app.get("/api/programs")
def programs():
    """List supported loyalty programs."""
    return {"programs": AIRLINES_INFO}

@app.post("/api/alerts/{alert_id}")
def create_alert(alert_id: str,
    origin: str = Query(...), destination: str = Query(...),
    max_miles: Optional[int] = Query(None), max_price: Optional[float] = Query(None),
    cabin: str = Query("economy")):
    alerts_db[alert_id] = {
        "id": alert_id,
        "origin": origin.upper(),
        "destination": destination.upper(),
        "max_miles": max_miles,
        "max_price": max_price,
        "cabin": cabin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    return {"status": "created", "alert": alerts_db[alert_id]}

@app.get("/api/alerts")
def list_alerts():
    return {"alerts": list(alerts_db.values())}

@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    if alert_id in alerts_db:
        del alerts_db[alert_id]
        return {"status": "deleted"}
    raise HTTPException(404, "Alert not found")

@app.get("/api/scrapers")
def scrapers_status_endpoint():
    """Status of data source integrations."""
    return {
        "scrapers": scrapers_status,
        "note": "Seats.aero API requires PRO key ($9.99/mo). "
                "Program charts provide real award pricing from Smiles, TudoAzul, LATAM Pass, AAdvantage, etc."
    }
