"""Exchange rate management using PocketBase cache.

Rates are stored in exchange_rate_cache collection and can be
manually refreshed or queried from an external API.
"""
from __future__ import annotations

import os
import sys
import json
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))

try:
    from call_api import call_api
except ImportError:
    call_api = None


def _pb_list(collection: str, filter_str: str = "") -> list[dict]:
    """List records from PocketBase collection."""
    if call_api is None:
        return []
    params = {"perPage": "100"}
    if filter_str:
        params["filter"] = filter_str
    result = call_api("GET", collection, params=params)
    return result.get("items", [])


def _pb_create(collection: str, data: dict) -> dict:
    """Create record in PocketBase collection."""
    if call_api is None:
        return {}
    return call_api("POST", collection, body=data)


def _pb_update(collection: str, record_id: str, data: dict) -> dict:
    """Update record in PocketBase collection."""
    if call_api is None:
        return {}
    return call_api("PATCH", f"{collection}/{record_id}", body=data)


def get_rate(from_currency: str, to_currency: str) -> dict:
    """Get exchange rate, checking cache first.

    Args:
        from_currency: Source currency (e.g. "USD")
        to_currency: Target currency (e.g. "EUR")

    Returns:
        Dict with rate, source, cached_at
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return {"rate": 1.0, "source": "identity", "cached_at": datetime.now().isoformat()}

    cache_filter = f'from_currency="{from_currency}"&&to_currency="{to_currency}"'
    cached = _pb_list("exchange_rate_cache", cache_filter)

    if cached:
        entry = cached[0]
        cached_at = entry.get("cached_at", "")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
                if datetime.now(cached_time.tzinfo) - cached_time < timedelta(hours=24):
                    return {
                        "rate": float(entry.get("rate", 1.0)),
                        "source": entry.get("source", "cache"),
                        "cached_at": cached_at,
                    }
            except (ValueError, TypeError):
                pass

    rate_data = _fetch_external_rate(from_currency, to_currency)
    if rate_data:
        _update_cache(from_currency, to_currency, rate_data)
        return rate_data

    return {"rate": 1.0, "source": "fallback", "cached_at": datetime.now().isoformat()}


def _fetch_external_rate(from_currency: str, to_currency: str) -> dict | None:
    """Fetch rate from free API (frankfurter.app)."""
    try:
        url = f"https://api.frankfurter.app/latest?from={from_currency}&to={to_currency}"
        req = Request(url, headers={"User-Agent": "AlustarsCRM/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            rate = data.get("rates", {}).get(to_currency)
            if rate:
                return {
                    "rate": float(rate),
                    "source": "frankfurter.app",
                    "cached_at": datetime.now().isoformat(),
                }
    except (HTTPError, Exception):
        pass
    return None


def _update_cache(from_currency: str, to_currency: str, rate_data: dict):
    """Update or create cache entry."""
    cache_filter = f'from_currency="{from_currency}"&&to_currency="{to_currency}"'
    cached = _pb_list("exchange_rate_cache", cache_filter)

    update_data = {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": rate_data["rate"],
        "source": rate_data.get("source", "api"),
        "cached_at": rate_data.get("cached_at", datetime.now().isoformat()),
    }

    if cached:
        _pb_update("exchange_rate_cache", cached[0]["id"], update_data)
    else:
        _pb_create("exchange_rate_cache", update_data)


def list_rates(base_currency: str = "USD") -> list[dict]:
    """List all cached rates for a base currency."""
    filter_str = f'from_currency="{base_currency}"'
    cached = _pb_list("exchange_rate_cache", filter_str)
    return [
        {
            "from": r.get("from_currency"),
            "to": r.get("to_currency"),
            "rate": r.get("rate"),
            "source": r.get("source"),
            "cached_at": r.get("cached_at"),
        }
        for r in cached
    ]
