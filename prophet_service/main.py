"""
Blue Eco Inventory — Sales Forecasting Microservice
-----------------------------------------------------
Small FastAPI service that wraps Facebook Prophet. Laravel calls this
service with historical sales data (pulled from PostgreSQL) and gets
back a forecast (predicted values + confidence interval) for the next
N days.

This service does NOT talk to the database directly — Laravel is the
only thing that has DB access. This keeps a single source of truth and
means this service can be deployed anywhere (e.g. Render) without
needing DB credentials.

Run locally:
    uvicorn main:app --reload --port 8001

Endpoints:
    GET  /health
    POST /forecast/overall   -> overall daily sales forecast
    POST /forecast/product   -> per-product daily units-sold forecast
"""

from datetime import date
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prophet import Prophet
from pydantic import BaseModel, Field

app = FastAPI(title="Blue Eco Inventory — Forecasting Service", version="1.0.0")

# Allow calls from the Laravel backend (and locally from React during dev).
# Tighten this to your actual Laravel domain once deployed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class HistoryPoint(BaseModel):
    # "ds" and "y" are Prophet's expected column names (date, value).
    # We accept friendlier names from Laravel and rename internally.
    date: date
    value: float = Field(..., description="Sales amount (or units sold) for this date")


class ForecastRequest(BaseModel):
    history: list[HistoryPoint] = Field(
        ..., min_length=2, description="Historical daily data points, oldest first"
    )
    periods: int = Field(30, ge=1, le=365, description="How many days ahead to forecast")
    product_id: Optional[int] = None
    product_name: Optional[str] = None


class ForecastPoint(BaseModel):
    date: date
    predicted: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    history_points_used: int
    periods_forecasted: int
    forecast: list[ForecastPoint]
    warning: Optional[str] = None


# ---------------------------------------------------------------------------
# Core forecasting logic
# ---------------------------------------------------------------------------

MIN_RECOMMENDED_POINTS = 14  # ~2 weeks of daily data for a even half-decent trend


def run_prophet_forecast(history: list[HistoryPoint], periods: int) -> tuple[pd.DataFrame, Optional[str]]:
    df = pd.DataFrame([{"ds": h.date, "y": h.value} for h in history])
    df = df.groupby("ds", as_index=False)["y"].sum()  # collapse dupe dates just in case
    df = df.sort_values("ds")

    warning = None
    if len(df) < MIN_RECOMMENDED_POINTS:
        warning = (
            f"Only {len(df)} historical data point(s) provided. Prophet works best with "
            f"{MIN_RECOMMENDED_POINTS}+ days of history — treat this forecast as a rough "
            "estimate only, it will get more accurate as more sales data accumulates."
        )

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=len(df) >= MIN_RECOMMENDED_POINTS,
        yearly_seasonality=False,
        interval_width=0.80,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    # Only return the future portion (not the historical fit).
    last_history_date = df["ds"].max()
    forecast_only = forecast[forecast["ds"] > pd.Timestamp(last_history_date)]

    # Sales/units can't be negative — clip.
    forecast_only = forecast_only.copy()
    for col in ["yhat", "yhat_lower", "yhat_upper"]:
        forecast_only[col] = forecast_only[col].clip(lower=0)

    return forecast_only, warning


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast/overall", response_model=ForecastResponse)
def forecast_overall(payload: ForecastRequest):
    try:
        forecast_df, warning = run_prophet_forecast(payload.history, payload.periods)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Forecasting failed: {e}")

    points = [
        ForecastPoint(
            date=row.ds.date(),
            predicted=round(float(row.yhat), 2),
            lower_bound=round(float(row.yhat_lower), 2),
            upper_bound=round(float(row.yhat_upper), 2),
        )
        for row in forecast_df.itertuples()
    ]

    return ForecastResponse(
        history_points_used=len(payload.history),
        periods_forecasted=payload.periods,
        forecast=points,
        warning=warning,
    )


@app.post("/forecast/product", response_model=ForecastResponse)
def forecast_product(payload: ForecastRequest):
    if payload.product_id is None:
        raise HTTPException(status_code=422, detail="product_id is required for per-product forecasts")

    try:
        forecast_df, warning = run_prophet_forecast(payload.history, payload.periods)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Forecasting failed: {e}")

    points = [
        ForecastPoint(
            date=row.ds.date(),
            predicted=round(float(row.yhat), 2),
            lower_bound=round(float(row.yhat_lower), 2),
            upper_bound=round(float(row.yhat_upper), 2),
        )
        for row in forecast_df.itertuples()
    ]

    return ForecastResponse(
        product_id=payload.product_id,
        product_name=payload.product_name,
        history_points_used=len(payload.history),
        periods_forecasted=payload.periods,
        forecast=points,
        warning=warning,
    )
