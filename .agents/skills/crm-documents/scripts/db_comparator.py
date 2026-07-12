"""Database comparison and diff reporting.

Compares extracted document data against PocketBase collections
and generates actionable diff reports.
"""
from __future__ import annotations
import os
import sys
import difflib
from typing import Any

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))

try:
    from call_api import call_api
except ImportError:
    call_api = None


def _search(collection: str, filter_str: str) -> list[dict]:
    """Search records in PocketBase collection."""
    if call_api is None:
        return []
    try:
        result = call_api("GET", collection, params={
            "filter": filter_str,
            "perPage": "10",
            "sort": "-created",
        })
        return result.get("items", [])
    except Exception:
        return []


def _search_customers(name: str, tax_id: str = "") -> list[dict]:
    """Search for customer by name and/or tax_id."""
    name_clean = name.strip().replace('"', '\\"')

    if tax_id:
        filter_str = f'tax_id="{tax_id}"'
        results = _search("customers", filter_str)
        if results:
            return results

    if name_clean:
        filter_str = f'name~"{name_clean}" || name_cn~"{name_clean}"'
        results = _search("customers", filter_str)
        if results:
            return results

        # Try code match
        code_part = name_clean.split()[0] if name_clean else ""
        if code_part:
            filter_str = f'code~"{code_part}"'
            results = _search("customers", filter_str)
            if results:
                return results

    return []


def _search_suppliers(name: str) -> list[dict]:
    """Search for supplier by name."""
    name_clean = name.strip().replace('"', '\\"')
    if name_clean:
        filter_str = f'name~"{name_clean}" || name_cn~"{name_clean}"'
        results = _search("suppliers", filter_str)
        if results:
            return results

        code_part = name_clean.split()[0] if name_clean else ""
        if code_part:
            filter_str = f'code~"{code_part}"'
            results = _search("suppliers", filter_str)
            if results:
                return results

    return []


def _search_products(name: str, part_number: str = "") -> list[dict]:
    """Search for product by name or part_number."""
    name_clean = name.strip().replace('"', '\\"')
    pn_clean = part_number.strip().replace('"', '\\"')

    if pn_clean:
        filter_str = f'part_number="{pn_clean}"'
        results = _search("products", filter_str)
        if results:
            return results

    if name_clean:
        filter_str = f'name~"{name_clean}" || name_cn~"{name_clean}"'
        results = _search("products", filter_str)
        if results:
            return results

    return []


def _fuzzy_match(name_a: str, name_b: str, threshold: float = 0.6) -> bool:
    """Fuzzy match two names using difflib."""
    return difflib.SequenceMatcher(None, name_a.lower(), name_b.lower()).ratio() >= threshold


def compare_with_db(parsed_data: dict) -> dict:
    """Compare extracted document data against database.

    Args:
        parsed_data: Output from parse_excel() or parse_pdf()

    Returns:
        Diff report:
        {
            "doc_type": str,
            "doc_code": str,
            "customer": {"status", "db_record", "suggestion", "diff_fields"},
            "supplier": {...},  # only for PO
            "products": [{"name", "status", "db_record", "suggestion"}],
            "price_mismatches": [...],
            "summary": {"total_items", "matched", "to_create", "to_update"}
        }
    """
    doc_type = parsed_data.get("doc_type", "unknown")
    doc_code = parsed_data.get("doc_code", "")

    customer_report = _compare_customer(parsed_data.get("customer", {}))
    supplier_report = {}
    if doc_type == "po":
        supplier_report = _compare_supplier(parsed_data.get("supplier", {}))

    items = parsed_data.get("items", [])
    product_reports = []
    price_mismatches = []

    for item in items:
        prod_report = _compare_product(item)
        product_reports.append(prod_report)

        if prod_report["status"] == "found" and item.get("unit_price"):
            unit_price = float(item["unit_price"])
            db_price = prod_report.get("price_in_db")
            if db_price is not None and abs(db_price - unit_price) / max(db_price, 1) > 0.1:
                price_mismatches.append({
                    "product_name": item.get("product_name", ""),
                    "doc_price": unit_price,
                    "db_price": db_price,
                    "diff_pct": round((unit_price - db_price) / db_price * 100, 1),
                })

    matched = sum(1 for p in product_reports if p["status"] == "found")
    to_create = sum(1 for p in product_reports if p["status"] == "not_found")
    to_update = sum(1 for p in product_reports if p["status"] == "partial_match")

    return {
        "doc_type": doc_type,
        "doc_code": doc_code,
        "customer": customer_report,
        "supplier": supplier_report,
        "products": product_reports,
        "price_mismatches": price_mismatches,
        "summary": {
            "total_items": len(items),
            "matched": matched,
            "to_create": to_create,
            "to_update": to_update,
        },
    }


def _compare_customer(raw_customer: dict) -> dict:
    """Compare customer data against database."""
    try:
        from field_extractor import normalize_customer, _clean_name
    except ImportError:
        from .field_extractor import normalize_customer, _clean_name

    if not raw_customer or not raw_customer.get("name"):
        return {"status": "no_data", "db_record": None,
                "suggestion": "skip", "diff_fields": []}

    name = _clean_name(raw_customer.get("name", ""))
    tax_id = raw_customer.get("tax_id", "")

    matches = _search_customers(name, tax_id)

    if matches:
        best = matches[0]
        fields = _find_diffs(raw_customer, best)
        if fields:
            return {
                "status": "name_match",
                "db_record": {"id": best["id"], "name": best.get("name", ""),
                               "code": best.get("code", ""),
                               "country": best.get("country", "")},
                "suggestion": "update",
                "diff_fields": fields,
            }
        return {
            "status": "found",
            "db_record": {"id": best["id"], "name": best.get("name", ""),
                           "code": best.get("code", "")},
            "suggestion": "link",
            "diff_fields": [],
        }

    return {
        "status": "not_found",
        "db_record": None,
        "suggestion": "create",
        "diff_fields": ["name", "address", "country"],
    }


def _compare_supplier(raw_supplier: dict) -> dict:
    """Compare supplier data against database."""
    from .field_extractor import normalize_supplier, _clean_name

    if not raw_supplier or not raw_supplier.get("name"):
        return {"status": "no_data", "db_record": None,
                "suggestion": "skip", "diff_fields": []}

    name = _clean_name(raw_supplier.get("name", ""))
    matches = _search_suppliers(name)

    if matches:
        best = matches[0]
        return {
            "status": "found",
            "db_record": {"id": best["id"], "name": best.get("name", ""),
                           "code": best.get("code", "")},
            "suggestion": "link",
            "diff_fields": [],
        }

    return {
        "status": "not_found",
        "db_record": None,
        "suggestion": "create",
        "diff_fields": ["name", "address", "country"],
    }


def _compare_product(item: dict) -> dict:
    """Compare a product item against database."""
    from .field_extractor import extract_part_number

    name = item.get("product_name", "")
    if not name:
        return {"name": "", "status": "no_data",
                "suggestion": "skip", "db_record": None}

    pn = item.get("part_number", "") or extract_part_number(name)
    matches = _search_products(name, pn)

    if matches:
        best = matches[0]
        price = None
        for field in ["unit_price", "cost_price"]:
            val = best.get(field)
            if val:
                price = float(val)
                break

        return {
            "name": name,
            "status": "found",
            "db_record": {"id": best["id"], "name": best.get("name", ""),
                           "code": best.get("code", ""),
                           "part_number": best.get("part_number", "")},
            "suggestion": "link",
            "price_in_db": price,
        }

    # Search without fuzzy match - check if any product contains a keyword
    keywords = _extract_keywords(name)
    for kw in keywords:
        filter_str = f'name~"{kw}" || name_cn~"{kw}"'
        results = _search("products", filter_str)
        if results:
            return {
                "name": name,
                "status": "partial_match",
                "db_record": {"id": results[0]["id"],
                               "name": results[0].get("name", ""),
                               "code": results[0].get("code", "")},
                "suggestion": "review",
                "matched_by": kw,
            }

    return {
        "name": name,
        "status": "not_found",
        "db_record": None,
        "suggestion": "create",
    }


def _find_diffs(raw: dict, db_record: dict) -> list[str]:
    """Find fields that differ between document and DB."""
    diffs = []
    field_map = {"address": "address", "tax_id": "tax_id"}

    for doc_field, db_field in field_map.items():
        doc_val = (raw.get(doc_field) or "").strip().lower()
        db_val = (db_record.get(db_field) or "").strip().lower()
        if doc_val and db_val and doc_val != db_val:
            diffs.append(db_field)

    return diffs


def _extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from product name."""
    words = text.split()
    return [w for w in words if len(w) > 2][:3]
