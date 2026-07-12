"""Calculation engine for CRM operations.

Provides line item calculations, margin analysis, CBM volume,
and currency conversion.
"""
from __future__ import annotations

import math
from typing import Any


def calc_line_items(items: list[dict]) -> dict:
    """Calculate line item subtotals and grand total.

    Args:
        items: List of dicts with keys: description, quantity, unit_price
               Optional: discount, tax_rate

    Returns:
        Dict with items (with amount), subtotal, discount, tax, total
    """
    result_items = []
    subtotal = 0.0

    for item in items:
        qty = float(item.get("quantity", 0))
        price = float(item.get("unit_price", 0))
        amount = round(qty * price, 2)
        subtotal += amount

        result_items.append({
            "description": item.get("description", ""),
            "quantity": qty,
            "unit_price": price,
            "amount": amount,
        })

    discount_rate = float(items[0].get("discount", 0)) if items else 0
    tax_rate = float(items[0].get("tax_rate", 0)) if items else 0

    discount_amount = round(subtotal * discount_rate / 100, 2)
    after_discount = subtotal - discount_amount
    tax_amount = round(after_discount * tax_rate / 100, 2)
    total = round(after_discount + tax_amount, 2)

    return {
        "items": result_items,
        "subtotal": subtotal,
        "discount_rate": discount_rate,
        "discount_amount": discount_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total": total,
    }


def calc_margin(selling_price: float, cost_price: float,
                quantity: int = 1) -> dict:
    """Calculate profit margin and markup.

    Args:
        selling_price: Unit selling price
        cost_price: Unit cost price
        quantity: Number of units

    Returns:
        Dict with profit, margin_percent, markup_percent
    """
    sell_total = selling_price * quantity
    cost_total = cost_price * quantity
    profit = sell_total - cost_total

    margin_pct = (profit / sell_total * 100) if sell_total else 0
    markup_pct = (profit / cost_total * 100) if cost_total else 0

    return {
        "selling_price": selling_price,
        "cost_price": cost_price,
        "quantity": quantity,
        "selling_total": round(sell_total, 2),
        "cost_total": round(cost_total, 2),
        "profit": round(profit, 2),
        "margin_percent": round(margin_pct, 2),
        "markup_percent": round(markup_pct, 2),
    }


def calc_cbm(length_mm: float, width_mm: float, height_mm: float,
             quantity: int) -> dict:
    """Calculate volume in CBM (cubic meters).

    Args:
        length_mm: Box length in mm
        width_mm: Box width in mm
        height_mm: Box height in mm
        quantity: Number of boxes

    Returns:
        Dict with cbm_per_box and total_cbm
    """
    cbm_per_box = (length_mm * width_mm * height_mm) / 1e9
    total_cbm = cbm_per_box * quantity

    return {
        "dimensions": f"{length_mm}x{width_mm}x{height_mm}mm",
        "quantity": quantity,
        "cbm_per_box": round(cbm_per_box, 6),
        "total_cbm": round(total_cbm, 4),
    }


def calc_exchange(amount: float, from_currency: str, to_currency: str,
                  rate: float | None = None) -> dict:
    """Convert currency amount.

    Args:
        amount: Amount to convert
        from_currency: Source currency code (e.g. "USD")
        to_currency: Target currency code (e.g. "EUR")
        rate: Exchange rate (if None, will query PocketBase)

    Returns:
        Dict with conversion result
    """
    if rate is None:
        try:
            from currency import get_rate
        except ImportError:
            from .currency import get_rate
        rate_result = get_rate(from_currency, to_currency)
        rate = rate_result.get("rate", 1.0)

    result = round(amount * rate, 2)

    return {
        "amount": amount,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": rate,
        "result": result,
    }


def calc_multi_currency_totals(items: list[dict],
                               target_currency: str = "USD") -> dict:
    """Sum items across different currencies with conversion.

    Args:
        items: List of dicts with keys: amount, currency
        target_currency: Currency to sum in

    Returns:
        Dict with per-currency subtotals and grand total
    """
    try:
        from currency import get_rate
    except ImportError:
        from .currency import get_rate

    currency_totals: dict[str, float] = {}
    for item in items:
        cur = item.get("currency", target_currency)
        amt = float(item.get("amount", 0))
        currency_totals[cur] = currency_totals.get(cur, 0) + amt

    converted = {}
    grand_total = 0.0
    for cur, total in currency_totals.items():
        if cur == target_currency:
            converted[cur] = {"total": total, "converted": total}
            grand_total += total
        else:
            rate_result = get_rate(cur, target_currency)
            rate = rate_result.get("rate", 1.0)
            conv = round(total * rate, 2)
            converted[cur] = {"total": total, "rate": rate, "converted": conv}
            grand_total += conv

    return {
        "target_currency": target_currency,
        "by_currency": converted,
        "grand_total": round(grand_total, 2),
    }
