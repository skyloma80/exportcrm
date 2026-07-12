"""Field normalization and matching utilities.

Normalizes extracted document fields to match database schema
and handles fuzzy matching for names.
"""
from __future__ import annotations
import re
from typing import Any


def normalize_customer(raw: dict) -> dict:
    """Normalize extracted customer data to DB fields.

    Args:
        raw: Customer dict from parser (name, address, tax_id, contact)

    Returns:
        Normalized dict matching customers collection fields:
        {name, name_cn, country, address, tax_id, type}
    """
    name = _clean_name(raw.get("name", ""))
    address = raw.get("address", "")

    country = _extract_country(address, name)

    return {
        "name": name,
        "name_cn": "",
        "country": country,
        "address": address,
        "tax_id": raw.get("tax_id", ""),
        "type": _guess_customer_type(raw),
    }


def normalize_supplier(raw: dict) -> dict:
    """Normalize extracted supplier data to DB fields."""
    name = _clean_name(raw.get("name", ""))
    address = raw.get("address", "")
    country = _extract_country(address, name)

    return {
        "name": name,
        "name_cn": "",
        "country": country,
        "address": address,
        "type": "manufacturer",
    }


def normalize_items(raw_items: list[dict]) -> list[dict]:
    """Normalize extracted line items for DB comparison.

    Each item: {product_name, part_number, description, quantity, unit,
                unit_price, amount}
    """
    return [
        {
            "product_name": _clean_name(it.get("product_name", "")),
            "part_number": it.get("part_number", ""),
            "description": it.get("description", ""),
            "quantity": float(it.get("quantity", 0)),
            "unit": it.get("unit", "pcs"),
            "unit_price": float(it.get("unit_price", 0)),
            "amount": float(it.get("amount", 0)),
        }
        for it in raw_items
        if float(it.get("quantity", 0)) > 0
    ]


def _clean_name(name: str) -> str:
    """Clean and normalize a name string."""
    name = re.sub(r"\s+", " ", name).strip()
    return name[:200]


def _extract_country(address: str, name: str = "") -> str:
    """Extract country code from address or name."""
    combined = (address + " " + name).lower()
    country_map = {
        "china": "CN",
        "中国": "CN",
        "germany": "DE",
        "deutschland": "DE",
        "france": "FR",
        "united states": "US",
        "usa": "US",
        "united kingdom": "GB",
        "uk": "GB",
        "japan": "JP",
        "日本": "JP",
        "korea": "KR",
        "south korea": "KR",
        "italy": "IT",
        "spain": "ES",
        "netherlands": "NL",
        "vietnam": "VN",
        "thailand": "TH",
        "india": "IN",
        "australia": "AU",
        "canada": "CA",
        "brazil": "BR",
        "uae": "AE",
        "singapore": "SG",
        "malaysia": "MY",
        "indonesia": "ID",
    }

    for keyword, code in country_map.items():
        if keyword in combined:
            return code
    return ""


def _guess_customer_type(customer: dict) -> str:
    """Guess customer type."""
    combined = (
        customer.get("name", "") + " " + customer.get("address", "")
    ).lower()

    if any(k in combined for k in ["distributor", "dist", "贸易", "trading"]):
        return "distributor"
    if any(k in combined for k in ["agent", "agency", "代理"]):
        return "agent"
    return "direct"


def extract_part_number(text: str) -> str:
    """Try to extract a part number from product text."""
    matches = re.findall(r"[A-Z]{2,}\d{3,}", text)
    return matches[0] if matches else ""
