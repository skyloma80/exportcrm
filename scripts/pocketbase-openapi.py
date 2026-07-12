#!/usr/bin/env python3
"""Generate openapi.json from a running PocketBase instance."""

import argparse
import json
import os
import sys
from datetime import datetime

import requests

FIELD_TYPE_MAP = {
    "text":     {"type": "string"},
    "email":    {"type": "string", "format": "email"},
    "url":      {"type": "string", "format": "uri"},
    "password": {"type": "string", "writeOnly": True},
    "editor":   {"type": "string"},
    "json":     {"type": "object"},
    "number":   {"type": "number"},
    "bool":     {"type": "boolean"},
    "date":     {"type": "string", "format": "date-time"},
    "file":     {"type": "string", "format": "binary"},
    "select":   {"type": "string"},
    "relation": {"type": "string"},
    "autocomplete": {"type": "string"},
}

def get_admin_token(base_url, email, password):
    r = requests.post(f"{base_url}/api/collections/_superusers/auth-with-password",
                      json={"identity": email, "password": password})
    r.raise_for_status()
    data = r.json()
    return data["token"]

def fetch_collections(base_url, token):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{base_url}/api/collections?perPage=200", headers=headers)
    r.raise_for_status()
    items = r.json().get("items", [])
    # Also fetch each collection's full schema (includes field info)
    collections = []
    for col in items:
        cid = col["id"]
        cr = requests.get(f"{base_url}/api/collections/{cid}", headers=headers)
        if cr.ok:
            collections.append(cr.json())
        else:
            collections.append(col)
    return collections

def openapi_type(field):
    base = FIELD_TYPE_MAP.get(field.get("type"), {"type": "string"})
    if field.get("required"):
        return base
    return {"oneOf": [base, {"type": "null"}]}

def field_schema_properties(fields):
    props = {}
    required = []
    for f in fields:
        name = f.get("name", "unknown")
        props[name] = openapi_type(f)
        if f.get("required"):
            required.append(name)
    # system fields
    for sf in ("id", "created", "updated", "collectionId", "collectionName"):
        props.setdefault(sf, {"type": "string"})
    return props, required

def is_system_collection(col):
    return col.get("name", "").startswith("_")

def build_openapi(base_url, collections, title="PocketBase API", version="1.0.0"):
    spec = {
        "openapi": "3.1.0",
        "info": {
            "title": title,
            "version": version,
            "description": f"Auto-generated from {base_url} on {datetime.now().isoformat()}"
        },
        "servers": [{"url": base_url}],
        "paths": {},
        "components": {
            "securitySchemes": {
                "AdminToken": {
                    "type": "http",
                    "scheme": "bearer",
                    "description": "Superuser token from /api/collections/_superusers/auth-with-password"
                },
                "UserToken": {
                    "type": "http",
                    "scheme": "bearer",
                    "description": "User token from /api/collections/users/auth-with-password"
                }
            },
            "schemas": {}
        }
    }

    for col in collections:
        name = col.get("name", "unknown")
        schema_name = f"pb_{name}"
        fields = col.get("fields", [])
        props, required = field_schema_properties(fields)
        # id/created/updated are always present but not always required
        for sf in ("id", "created", "updated"):
            if sf not in required:
                required.append(sf)

        schema = {
            "type": "object",
            "properties": props,
        }
        if required:
            schema["required"] = list(set(required))
        spec["components"]["schemas"][schema_name] = schema

        # Build CRUD paths
        base = f"/api/collections/{name}/records"
        item_path = f"/api/collections/{name}/records/{{id}}"
        list_schema = {
            "type": "object",
            "properties": {
                "page": {"type": "integer"},
                "perPage": {"type": "integer"},
                "totalItems": {"type": "integer"},
                "totalPages": {"type": "integer"},
                "items": {
                    "type": "array",
                    "items": {"$ref": f"#/components/schemas/{schema_name}"}
                }
            }
        }

        # LIST
        spec["paths"][base] = {
            "get": {
                "summary": f"List {name} records",
                "operationId": f"list_{name}",
                "parameters": [
                    {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
                    {"name": "perPage", "in": "query", "schema": {"type": "integer", "default": 30}},
                    {"name": "sort", "in": "query", "schema": {"type": "string"}},
                    {"name": "filter", "in": "query", "schema": {"type": "string"}},
                    {"name": "expand", "in": "query", "schema": {"type": "string"}},
                    {"name": "fields", "in": "query", "schema": {"type": "string"}},
                ],
                "security": [{"AdminToken": []}, {"UserToken": []}],
                "responses": {
                    "200": {"description": "OK", "content": {"application/json": {"schema": list_schema}}}
                }
            },
            "post": {
                "summary": f"Create {name} record",
                "operationId": f"create_{name}",
                "security": [{"AdminToken": []}, {"UserToken": []}],
                "requestBody": {
                    "required": True,
                    "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{schema_name}"}}}
                },
                "responses": {
                    "201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{schema_name}"}}}}
                }
            }
        }

        # GET / PUT / PATCH / DELETE
        spec["paths"][item_path] = {
            "get": {
                "summary": f"Get {name} record by ID",
                "operationId": f"get_{name}",
                "parameters": [
                    {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}},
                    {"name": "expand", "in": "query", "schema": {"type": "string"}},
                    {"name": "fields", "in": "query", "schema": {"type": "string"}},
                ],
                "security": [{"AdminToken": []}, {"UserToken": []}],
                "responses": {
                    "200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{schema_name}"}}}}
                }
            },
            "patch": {
                "summary": f"Update {name} record",
                "operationId": f"update_{name}",
                "parameters": [
                    {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "security": [{"AdminToken": []}, {"UserToken": []}],
                "requestBody": {
                    "required": True,
                    "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{schema_name}"}}}
                },
                "responses": {
                    "200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{schema_name}"}}}}
                }
            },
            "delete": {
                "summary": f"Delete {name} record",
                "operationId": f"delete_{name}",
                "parameters": [
                    {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
                ],
                "security": [{"AdminToken": []}, {"UserToken": []}],
                "responses": {
                    "204": {"description": "No Content"}
                }
            }
        }

    # Auth endpoints (PocketBase v0.23+)
    for auth_name, auth_col in [("superuser_auth", "_superusers"), ("user_auth", "users")]:
        spec["paths"][f"/api/collections/{auth_col}/auth-with-password"] = {
            "post": {
                "summary": f"Authenticate as {auth_col.replace('_', ' ')}",
                "operationId": auth_name,
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "identity": {"type": "string"},
                                    "password": {"type": "string"}
                                },
                                "required": ["identity", "password"]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {"description": "OK"}
                }
            }
        }

    spec["paths"]["/api/health"] = {
        "get": {
            "summary": "Health check",
            "operationId": "health",
            "responses": {
                "200": {"description": "OK"}
            }
        }
    }

    return spec


def main():
    parser = argparse.ArgumentParser(description="Generate openapi.json from PocketBase")
    parser.add_argument("--url", default=os.getenv("CRM_API_URL", "http://127.0.0.1:8090"),
                        help="PocketBase URL (default: $CRM_API_URL or http://127.0.0.1:8090)")
    parser.add_argument("--email",
                        help="Admin email (default: $PB_ADMIN_EMAIL)")
    parser.add_argument("--password",
                        help="Admin password (default: $PB_ADMIN_PASSWORD)")
    parser.add_argument("--output", default="openapi.json",
                        help="Output file (default: openapi.json)")
    parser.add_argument("--include-system", action="store_true",
                        help="Include system collections (collections starting with _)")
    args = parser.parse_args()

    email = args.email or os.getenv("PB_ADMIN_EMAIL")
    password = args.password or os.getenv("PB_ADMIN_PASSWORD")

    if not email or not password:
        print("ERROR: Admin email and password required.", file=sys.stderr)
        print("Set PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD env vars or pass --email / --password", file=sys.stderr)
        sys.exit(1)

    base_url = args.url.rstrip("/")

    print(f"Authenticating to {base_url} ...")
    token = get_admin_token(base_url, email, password)

    print("Fetching collections ...")
    collections = fetch_collections(base_url, token)

    if not args.include_system:
        before = len(collections)
        collections = [c for c in collections if not is_system_collection(c)]
        print(f"  Found {before} collections, excluded {before - len(collections)} system collections")
    else:
        print(f"  Found {len(collections)} collections")

    print("Building OpenAPI spec ...")
    spec = build_openapi(base_url, collections)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)

    print(f"Done → {args.output}")
    print(f"  Paths: {len(spec['paths'])}")
    print(f"  Schemas: {len(spec['components']['schemas'])}")


if __name__ == "__main__":
    main()
