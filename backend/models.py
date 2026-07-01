"""Pydantic models for FlyTracker."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Currency(str, Enum):
    BRL = "BRL"
    MILES = "MILES"


class FlightStatus(str, Enum):
    ON_TIME = "on_time"
    DELAYED = "delayed"
    CANCELLED = "cancelled"
    BOARDING = "boarding"
    DEPARTED = "departed"


class AirlineInfo(BaseModel):
    code: str = Field(..., description="IATA airline code, e.g. 'LA'")
    name: str = Field(..., description="Full airline name")


class AirportInfo(BaseModel):
    code: str = Field(..., description="IATA airport code, e.g. 'GRU'")
    name: str = Field(..., description="Full airport name")
    city: str = Field(..., description="City name")


class Price(BaseModel):
    amount: Decimal = Field(..., decimal_places=2)
    currency: Currency


class Flight(BaseModel):
    """Represents a flight offer returned by the Amadeus mock."""

    id: str = Field(..., description="Unique flight identifier")
    airline: AirlineInfo
    flight_number: str = Field(..., description="e.g. 'LA1234'")
    departure: AirportInfo
    arrival: AirportInfo
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    status: FlightStatus = FlightStatus.ON_TIME
    price_brl: Price = Field(default_factory=lambda: Price(amount=Decimal("0"), currency=Currency.BRL))
    price_miles: Price = Field(default_factory=lambda: Price(amount=Decimal("0"), currency=Currency.MILES))
    seats_available: int = Field(default=0, ge=0)


class FlightSearchResponse(BaseModel):
    """Response wrapper for flight search results."""

    flights: list[Flight]
    total: int
    page: int = 1
    page_size: int = 10


class FlightSearchParams(BaseModel):
    """Query parameters for GET /api/flights."""

    origin: Optional[str] = Field(default=None, description="IATA origin airport code")
    destination: Optional[str] = Field(default=None, description="IATA destination airport code")
    date: Optional[str] = Field(default=None, description="Departure date (YYYY-MM-DD)")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)


class AlertType(str, Enum):
    PRICE_DROP = "price_drop"
    MILES_PROMO = "miles_promo"
    NEW_ROUTE = "new_route"
    STATUS_CHANGE = "status_change"


class AlertChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class AlertCreate(BaseModel):
    """Request body for POST /api/alerts."""

    origin: str = Field(..., min_length=3, max_length=3, description="IATA origin code")
    destination: str = Field(..., min_length=3, max_length=3, description="IATA destination code")
    alert_type: AlertType
    channel: AlertChannel = AlertChannel.EMAIL
    target_price_brl: Optional[Decimal] = Field(
        default=None, decimal_places=2, description="Trigger when price drops below this (BRL)"
    )
    target_price_miles: Optional[Decimal] = Field(
        default=None, decimal_places=2, description="Trigger when price drops below this (miles)"
    )
    email: Optional[str] = Field(default=None, description="Contact email for the alert")


class Alert(BaseModel):
    """Represents a saved price/status alert."""

    id: str
    origin: str
    destination: str
    alert_type: AlertType
    channel: AlertChannel
    target_price_brl: Optional[Decimal] = None
    target_price_miles: Optional[Decimal] = None
    email: Optional[str] = None
    created_at: datetime
    active: bool = True


class AlertCreateResponse(BaseModel):
    """Response after creating an alert."""

    alert: Alert
    message: str = "Alert created successfully"
