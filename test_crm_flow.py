#!/usr/bin/env python3
"""
CRM Self-Test — end-to-end PocketBase connectivity + CRUD read checks.
Run:
  $env:CRM_USER="271341794@qq.com"
  $env:CRM_PASS="08065711jern"
  python D:\exportcrm\test_crm_flow.py
"""
import os, sys, json, urllib.request, urllib.error

PB = os.environ.get("CRM_API_URL", "http://localhost:8090")
USER = os.environ.get("CRM_USER", "")
PASS = os.environ.get("CRM_PASS", "")


def pp(label, obj):
    print(f"\n===== {label} =====")
    if obj is None:
        print("None")
    elif isinstance(obj, (dict, list)):
        print(json.dumps(obj, indent=2, ensure_ascii=False))
    else:
        print(obj)


def admin_token() -> str:
    if not USER or not PASS:
        raise SystemExit("ERROR: Set CRM_USER and CRM_PASS env vars first.")
    data = json.dumps({"identity": USER, "password": PASS}).encode()
    req = urllib.request.Request(
        f"{PB}/api/collections/_superusers/auth-with-password",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        body = json.loads(r.read())
    token = body.get("token")
    if not token:
        raise SystemExit(f"ERROR: No token in response: {body}")
    return token


def get_json(token, path):
    url = f"{PB}{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as r:
            if r.status == 204:
                return None
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {e.status} GET {url}: {msg}")


def main():
    pp("ENV", {"PB": PB, "USER": USER, "PASS_SET": bool(PASS)})

    print("\n>> Authenticating...")
    token = admin_token()
    pp("Auth status", "OK")
    pp("Token prefix", f"{token[:12]}... (len={len(token)})")

    collections = [
        "customers",
        "customer_tracking",
        "customer_activities",
        "suppliers",
        "products",
        "projects",
        "quotations",
        "so",
        "po",
        "shipments",
    ]
    for col in collections:
        try:
            res = get_json(token, f"/api/collections/{col}/records?perPage=1&sort=-created")
            pp(f"Collection {col}", res)
        except Exception as e:
            pp(f"Collection {col} ERROR", str(e))

    try:
        allc = get_json(token, "/api/collections")
        items = allc.get("items", []) if isinstance(allc, dict) else []
        pp("All collections", {"total": len(items), "names": [c.get("name") for c in items]})
    except Exception as e:
        pp("All collections ERROR", str(e))

    pp("DONE", "Self-test complete")

if __name__ == "__main__":
    main()
