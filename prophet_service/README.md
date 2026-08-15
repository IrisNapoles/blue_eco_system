# Blue Eco Inventory — Forecasting Microservice

FastAPI service that wraps Facebook Prophet for sales forecasting.
Laravel calls this service with historical sales data and gets back
a forecast (predicted value + confidence interval) for future dates.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run locally

```bash
uvicorn main:app --reload --port 8001
```

Service will be available at http://127.0.0.1:8001

## Endpoints

- `GET /health` — health check
- `POST /forecast/overall` — overall daily sales forecast
- `POST /forecast/product` — per-product forecast (units sold)

### Example request body

```json
{
  "history": [
    {"date": "2026-07-01", "value": 3083.66},
    {"date": "2026-07-02", "value": 2715.01}
  ],
  "periods": 14
}
```

`periods` = how many days ahead to forecast (default 30).

For `/forecast/product`, also include `"product_id": 1` (and optionally `"product_name"`).

### Example response

```json
{
  "history_points_used": 28,
  "periods_forecasted": 14,
  "forecast": [
    {"date": "2026-07-29", "predicted": 3245.10, "lower_bound": 2800.00, "upper_bound": 3690.20}
  ],
  "warning": null
}
```

If fewer than 14 days of history are provided, `warning` will explain
that the forecast is a rough estimate only.

## Notes for Laravel integration

- This service does NOT touch the database. Laravel is responsible for
  pulling sales history from PostgreSQL and sending it in the request body.
- CORS is currently open (`allow_origins=["*"]`) for local dev — tighten
  this to your actual Laravel domain before deploying to production.
- Deploy target: Render (free tier works fine for a thesis demo).
