"""
Importa os 11 CSVs do Seats.aero e gera award_data.json no formato rico
que o frontend do FlyTracker espera, com TODAS as colunas.
"""
import csv, json, os, re
from collections import defaultdict

CSV_DIR = "/opt/data/cache/documents"
OUTPUT = os.path.join(os.path.dirname(__file__), "award_data.json")

CABIN_MAP = {
    "Economy": "economy",
    "Premium Economy": "premium_economy",
    "Business": "business",
    "First": "first_class",
}

def parse_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def safe_int(v):
    try:
        return int(float(v)) if v else None
    except:
        return None

def safe_float(v):
    try:
        return float(v) if v else None
    except:
        return None

def main():
    all_rows = []
    for fname in sorted(os.listdir(CSV_DIR)):
        if fname.endswith(".csv") and "seats.aero" in fname:
            path = os.path.join(CSV_DIR, fname)
            rows = parse_csv(path)
            print(f"  {fname}: {len(rows)} rows")
            all_rows.extend(rows)
    
    print(f"\nTotal: {len(all_rows)} rows from CSVs")
    
    # Agrupar por rota + cabine
    # Formato: award_data[rota][cabine] = [ {...}, {...} ]
    award_data = defaultdict(lambda: defaultdict(list))
    
    for r in all_rows:
        origin = r.get("Origin Airport", "").strip().upper()
        dest = r.get("Destination Airport", "").strip().upper()
        program = r.get("Mileage Program", "").strip()
        date = r.get("Date", "").strip()
        
        if not origin or not dest or not program:
            continue
        
        route = f"{origin}-{dest}"
        
        # Processa cada cabine
        for cabin_label, cabin_key in CABIN_MAP.items():
            miles = safe_int(r.get(f"{cabin_label} Miles"))
            direct_miles = safe_int(r.get(f"{cabin_label} Direct Miles"))
            seats = safe_int(r.get(f"{cabin_label} Seats"))
            direct_seats = safe_int(r.get(f"{cabin_label} Direct Seats"))
            carriers = r.get(f"{cabin_label} Carriers", "").strip()
            direct_carriers = r.get(f"{cabin_label} Direct Carriers", "").strip()
            taxes = safe_float(r.get(f"{cabin_label} Taxes"))
            tax_currency = r.get(f"{cabin_label} Taxes Currency", "BRL").strip()
            
            # Só inclui se tiver dados relevantes
            if miles is None:
                continue
            
            # Determina disponibilidade baseada em assentos
            if seats and seats > 0:
                availability = "high" if seats >= 3 else "medium"
            elif direct_seats and direct_seats > 0:
                availability = "medium"
            else:
                availability = "low"
            
            # Converte taxas para BRL (aproximado se USD)
            if tax_currency == "USD" and taxes:
                taxes_brl = round(taxes * 5.5)  # câmbio aproximado
            else:
                taxes_brl = round(taxes) if taxes else 0
            
            entry = {
                "program": program,
                "miles": miles,
                "direct_miles": direct_miles,
                "seats": seats,
                "direct_seats": direct_seats,
                "carriers": carriers,
                "direct_carriers": direct_carriers,
                "taxes": taxes_brl,
                "tax_currency": tax_currency,
                "cabin": cabin_key,
                "availability": availability,
                "date": date,
                "source": "seats_aero_csv"
            }
            award_data[route][cabin_key].append(entry)
    
    # Converte defaultdict pra dict normal
    result = {
        "award": {k: dict(v) for k, v in sorted(award_data.items())},
        "meta": {
            "total_rows": len(all_rows),
            "total_routes": len(award_data),
            "source": "seats.aero CSV exports",
            "generated_at": __import__('datetime').datetime.now().isoformat()
        }
    }
    
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Dados salvos em {OUTPUT}")
    
    # Estatísticas
    total_entries = sum(len(items) for route in award_data.values() for items in route.values())
    print(f"  Rotas: {len(award_data)}")
    print(f"  Entradas: {total_entries}")
    
    # Amostra
    for route in sorted(award_data.keys())[:5]:
        cabins = list(award_data[route].keys())
        print(f"  {route}: {cabins} ({sum(len(award_data[route][c]) for c in cabins)} entries)")

if __name__ == "__main__":
    main()
