"""Mock Amadeus API integration for FlyTracker.

Provides realistic mock flight data with prices in BRL and miles,
simulating the Amadeus Flight Offers Search API.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from random import choice, randint, uniform

from models import (
    AirlineInfo,
    AirportInfo,
    Currency,
    Flight,
    FlightStatus,
    Price,
)

# ---------------------------------------------------------------------------
# Realistic lookup tables
# ---------------------------------------------------------------------------

_AIRLINES: dict[str, tuple[str, str]] = {
    "LA": ("LATAM Airlines", "LA"),
    "G3": ("Gol Linhas Aéreas", "G3"),
    "AD": ("Azul Linhas Aéreas", "AD"),
    "AA": ("American Airlines", "AA"),
    "UA": ("United Airlines", "UA"),
}

_AIRPORTS: dict[str, tuple[str, str]] = {
    "GRU": ("São Paulo/Guarulhos", "São Paulo"),
    "CGH": ("São Paulo/Congonhas", "São Paulo"),
    "GIG": ("Rio de Janeiro/Galeão", "Rio de Janeiro"),
    "SDU": ("Rio de Janeiro/Santos Dumont", "Rio de Janeiro"),
    "BSB": ("Brasília", "Brasília"),
    "CNF": ("Belo Horizonte/Confins", "Belo Horizonte"),
    "POA": ("Porto Alegre", "Porto Alegre"),
    "REC": ("Recife", "Recife"),
    "SSA": ("Salvador", "Salvador"),
    "FOR": ("Fortaleza", "Fortaleza"),
    "CWB": ("Curitiba", "Curitiba"),
    "FLN": ("Florianópolis", "Florianópolis"),
    "MAO": ("Manaus", "Manaus"),
    "BEL": ("Belém", "Belém"),
    "MIA": ("Miami", "Miami"),
    "FLL": ("Fort Lauderdale", "Fort Lauderdale"),
    "JFK": ("New York/JFK", "New York"),
    "MCO": ("Orlando", "Orlando"),
    "LIS": ("Lisboa", "Lisbon"),
    "MAD": ("Madrid", "Madrid"),
    "CDG": ("Paris/Charles de Gaulle", "Paris"),
}

# Base prices in BRL (random variation applied later)
_BASE_PRICES_BRL: dict[str, float] = {
    "GRU-GIG": 350.00,
    "GIG-GRU": 350.00,
    "GRU-BSB": 450.00,
    "BSB-GRU": 450.00,
    "GRU-REC": 600.00,
    "REC-GRU": 600.00,
    "GRU-SSA": 550.00,
    "SSA-GRU": 550.00,
    "GRU-FOR": 650.00,
    "FOR-GRU": 650.00,
    "GRU-POA": 500.00,
    "POA-GRU": 500.00,
    "GRU-CWB": 400.00,
    "CWB-GRU": 400.00,
    "GRU-MIA": 2500.00,
    "MIA-GRU": 2500.00,
    "GRU-JFK": 3000.00,
    "JFK-GRU": 3000.00,
    "GRU-MCO": 2800.00,
    "MCO-GRU": 2800.00,
    "GRU-LIS": 3500.00,
    "LIS-GRU": 3500.00,
    "GRU-MAD": 3600.00,
    "MAD-GRU": 3600.00,
    "GRU-CDG": 4000.00,
    "CDG-GRU": 4000.00,
    "CGH-SDU": 300.00,
    "SDU-CGH": 300.00,
    "CGH-GIG": 320.00,
    "GIG-CGH": 320.00,
    "GRU-CNF": 380.00,
    "CNF-GRU": 380.00,
}


def _random_flight_time() -> tuple[datetime, datetime, int]:
    """Generate realistic departure/arrival times and duration."""
    now = datetime.utcnow()
    dep_hour = randint(5, 22)
    dep = now.replace(hour=dep_hour, minute=choice([0, 15, 30, 45]), second=0, microsecond=0)

    # Duration between 50 min and 12 h
    duration = randint(50, 720)
    arr = dep + timedelta(minutes=duration)
    return dep, arr, duration


def _build_flight(  # noqa: PLR0913
    airline_key: str,
    flight_num: str,
    origin_code: str,
    dest_code: str,
    base_brl: float,
) -> Flight:
    """Construct a single Flight with randomised prices."""
    dep_time, arr_time, duration = _random_flight_time()
    variation = uniform(0.8, 1.4)
    price_brl_val = round(base_brl * variation, 2)
    miles_val = round(price_brl_val / uniform(0.015, 0.025), 0)  # ~1 mile = R$0.02

    airline_name, airline_iata = _AIRLINES[airline_key]
    origin_name, origin_city = _AIRPORTS[origin_code]
    dest_name, dest_city = _AIRPORTS[dest_code]

    return Flight(
        id=str(uuid.uuid4()),
        airline=AirlineInfo(code=airline_iata, name=airline_name),
        flight_number=f"{airline_iata}{flight_num}",
        departure=AirportInfo(code=origin_code, name=origin_name, city=origin_city),
        arrival=AirportInfo(code=dest_code, name=dest_name, city=dest_city),
        departure_time=dep_time,
        arrival_time=arr_time,
        duration_minutes=duration,
        status=choice(list(FlightStatus)),
        price_brl=Price(amount=Decimal(str(price_brl_val)), currency=Currency.BRL),
        price_miles=Price(amount=Decimal(str(int(miles_val))), currency=Currency.MILES),
        seats_available=randint(0, 120),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_flights(
    origin: str | None = None,
    destination: str | None = None,
    date: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Flight], int]:
    """Simulate Amadeus Flight Offers Search API.

    Returns (flights, total_count).
    Filters by origin/destination if provided (ignored if None).
    """
    # Collect matching route keys
    candidate_routes: list[str] = []
    for route in _BASE_PRICES_BRL:
        parts = route.split("-")
        o, d = parts[0], parts[1]
        if origin and o != origin.upper():
            continue
        if destination and d != destination.upper():
            continue
        candidate_routes.append(route)

    if not candidate_routes:
        return [], 0

    # Generate flights per matching route
    all_flights: list[Flight] = []
    for route in candidate_routes:
        parts = route.split("-")
        o_code, d_code = parts[0], parts[1]
        base = _BASE_PRICES_BRL[route]

        # 2-4 flights per route
        for _ in range(randint(2, 4)):
            airline_key = choice(list(_AIRLINES))
            flight_num = str(randint(1000, 9999))
            all_flights.append(_build_flight(airline_key, flight_num, o_code, d_code, base))

    # Sort by departure time
    all_flights.sort(key=lambda f: f.departure_time)

    total = len(all_flights)

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_flights[start:end]

    return paginated, total


def get_flight_by_id(flight_id: str) -> Flight | None:
    """Return a single flight by its ID (random generation for mock)."""
    # Simulate: search without filters, pick one
    flights, _ = search_flights(page=1, page_size=50)
    for f in flights:
        if f.id == flight_id:
            return f
    return None
