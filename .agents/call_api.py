"""
Generic PocketBase API caller with OpenAPI schema validation.

Usage:
    call_api("GET", "customers")
    call_api("GET", "customers", params={"filter": 'country="US"'})
    call_api("POST", "customers", body={"name": "ABC", "code": "C001"})
    call_api("PATCH", "customers/RECORD_ID", body={"name": "New Name"})
    call_api("DELETE", "customers/RECORD_ID")
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from authenticate import CRM_API_URL, _headers


_openapi: dict | None = None


def _load_openapi() -> dict:
    """Load OpenAPI spec from .agents/openapi.json (cached)."""
    global _openapi
    if _openapi is not None:
        return _openapi
    path = Path(__file__).parent / "openapi.json"
    if not path.exists():
        _openapi = {}
        return _openapi
    with open(path) as f:
        _openapi = json.load(f)
    return _openapi


def _find_endpoint_schema(endpoint: str, method: str) -> dict | None:
    """Find the OpenAPI schema for a given endpoint and method.

    endpoint format: "customers", "customers/{id}", "so/RECORD_ID"
    """
    spec = _load_openapi()
    if not spec:
        return None

    paths = spec.get("paths", {})
    # Normalize: "customers" → "/api/collections/customers/records"
    # "customers/RECORD_ID" → "/api/collections/customers/records/{id}"
    parts = endpoint.strip("/").split("/")
    collection = parts[0]
    path_key = f"/api/collections/{collection}/records"
    if len(parts) > 1:
        path_key += "/{id}"

    path_schema = paths.get(path_key)
    if not path_schema:
        # Try without /api prefix
        path_key = f"/{endpoint}"
        path_schema = paths.get(path_key)

    if path_schema:
        return path_schema.get(method.lower())

    return None


def _validate_body(endpoint: str, method: str, body: dict | None):
    """Validate request body against OpenAPI schema."""
    if body is None:
        return
    method_schema = _find_endpoint_schema(endpoint, method)
    if not method_schema:
        return

    request_body = method_schema.get("requestBody", {})
    content = request_body.get("content", {})
    json_content = content.get("application/json", {})
    schema = json_content.get("schema")
    if not schema:
        return

    # Resolve $ref if needed
    if "$ref" in schema:
        ref_path = schema["$ref"].lstrip("#/").split("/")
        spec = _load_openapi()
        components = spec.get("components", {})
        resolved = components
        for part in ref_path:
            resolved = resolved.get(part, {})
        schema = resolved

    required_fields = schema.get("required", [])
    properties = schema.get("properties", {})

    errors = []
    for field in required_fields:
        if field not in body:
            errors.append(f"field '{field}' is required")

    for key, val in body.items():
        prop = properties.get(key)
        if prop:
            prop_type = prop.get("type", "string")

            if prop_type == "number" and not isinstance(val, (int, float)):
                errors.append(f"field '{key}' should be number, got {type(val).__name__}")
            elif prop_type == "integer" and not isinstance(val, int):
                errors.append(f"field '{key}' should be integer, got {type(val).__name__}")
            elif prop_type == "boolean" and not isinstance(val, bool):
                errors.append(f"field '{key}' should be boolean, got {type(val).__name__}")
            elif prop_type == "array" and not isinstance(val, list):
                errors.append(f"field '{key}' should be array, got {type(val).__name__}")

            if "enum" in prop:
                if val not in prop["enum"]:
                    errors.append(f"field '{key}' must be one of {prop['enum']}, got '{val}'")

    if errors:
        raise ValueError(f"Body validation failed for {method} {endpoint}:\n  " + "\n  ".join(errors))


def call_api(
    method: str,
    endpoint: str,
    params: dict[str, str] | None = None,
    body: dict | None = None,
) -> Any:
    """Generic PocketBase API caller.

    Args:
        method: HTTP method (GET, POST, PATCH, DELETE)
        endpoint: Endpoint path like "customers", "customers/{id}", "so/RECORD_ID"
                  or full path like "api/disk/list"
        params: URL query parameters (filter, sort, expand, fields, etc.)
        body: Request body for POST/PATCH

    Returns:
        Parsed JSON response. For lists: dict with items, totalItems, etc.
        For single records: dict with record fields.

    Raises:
        ValueError: If body fails OpenAPI validation
        RuntimeError: If API returns non-2xx status
    """
    # Determine full URL
    if endpoint.startswith("api/") or endpoint.startswith("/api/"):
        # Full API path - use as-is
        path = endpoint.lstrip("/")
    else:
        # Collection-relative path: "customers" or "customers/{id}"
        parts = endpoint.strip("/").split("/")
        collection = parts[0]
        if len(parts) > 1:
            path = f"api/collections/{collection}/records/{parts[1]}"
        else:
            path = f"api/collections/{collection}/records"

    url = f"{CRM_API_URL.rstrip('/')}/{path}"

    # Append query params
    if params:
        query_parts = []
        for k, v in params.items():
            if v is not None:
                from urllib.parse import quote
                query_parts.append(f"{k}={quote(str(v))}")
        if query_parts:
            url += "?" + "&".join(query_parts)

    # Validate body against OpenAPI schema
    _validate_body(endpoint, method, body)

    # Make request
    data_bytes = json.dumps(body).encode() if body else None
    req = Request(url, data=data_bytes, headers=_headers(), method=method.upper())

    try:
        with urlopen(req) as r:
            text = r.read().decode()
            return json.loads(text) if text else {"success": True}
    except HTTPError as e:
        err_body = e.read().decode()
        raise RuntimeError(f"API {method} {path}: {e.code} - {err_body}")
