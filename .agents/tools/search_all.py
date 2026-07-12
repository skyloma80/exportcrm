"""Search a keyword across all business collections.

Returns matching records grouped by collection.
"""
from __future__ import annotations

from call_api import call_api


_SEARCHABLE_FIELDS = {
    "customers": ["name", "name_cn", "code", "country"],
    "suppliers": ["name", "name_cn", "code", "country"],
    "products": ["name", "name_cn", "code", "part_number"],
    "projects": ["name", "name_cn", "code"],
    "quotations": ["code"],
    "so": ["code", "customer_name"],
    "po": ["code", "supplier_name"],
    "shipments": ["code"],
}


def search_all(query: str, limit_per_collection: int = 3) -> dict[str, list[dict]]:
    """Search across all business collections for a keyword.

    Args:
        query: Search term (case-insensitive partial match)
        limit_per_collection: Max results per collection

    Returns:
        Dict of {collection_name: [matching_records]}
    """
    results: dict[str, list[dict]] = {}
    for collection, fields in _SEARCHABLE_FIELDS.items():
        conditions = "||".join(f'{f}~"{query}"' for f in fields)
        resp = call_api("GET", collection, params={
            "filter": conditions,
            "perPage": str(limit_per_collection),
            "sort": "-created",
        })
        items = resp.get("items", [])
        if items:
            results[collection] = items
    return results
