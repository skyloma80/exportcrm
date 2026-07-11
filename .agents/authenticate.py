"""
CRM Auth Module — PocketBase API client for Hermes agents.

Usage (Python):
    export CRM_API_URL=http://42.194.150.84:8091
    export CRM_API_TOKEN=***
    
    from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete
    
    customers = pb_list("customers", "sort=-created")
    customer = pb_get("customers", "RECORD_ID")
    new = pb_create("customers", {"name": "New Co"})
    pb_update("customers", "RECORD_ID", {"name": "Updated"})
    pb_delete("customers", "RECORD_ID")

Usage (CLI):
    python authenticate.py list customers
    python authenticate.py get customers RECORD_ID
    echo '{"name":"Test"}' | python authenticate.py create customers
    python authenticate.py update customers RECORD_ID < data.json
    python authenticate.py delete customers RECORD_ID
"""
import os, sys, json, urllib.request, urllib.error

CRM_API_URL = os.environ.get("CRM_API_URL", "http://42.194.150.84:8091")
CRM_API_TOKEN = os.environ.get("CRM_API_TOKEN", "")
CRM_USER = os.environ.get("CRM_USER", "")
CRM_PASS = os.environ.get("CRM_PASS", "")

if not CRM_API_TOKEN and CRM_USER and CRM_PASS:
    # Auto-auth: login with CRM user credentials
    try:
        url = f"{CRM_API_URL}/api/collections/users/auth-with-password"
        body = json.dumps({"identity": CRM_USER, "password": CRM_PASS}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            CRM_API_TOKEN = data["token"]
            _USER_ID = data["record"]["id"]
    except Exception as e:
        pass

if not CRM_API_TOKEN:
    print("WARNING: CRM_API_TOKEN not set. Set CRM_API_TOKEN or CRM_USER/CRM_PASS.", file=sys.stderr)

def _headers():
    return {
        "Authorization": f"Bearer {CRM_API_TOKEN}",
        "Content-Type": "application/json",
    }

def _request(url, method="GET", data=None):
    """Unified HTTP request with error handling."""
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=_headers(), method=method)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            if text:
                return json.loads(text)
            return {"status": r.status}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        raise RuntimeError(f"PB API {method} {url}: {e.code} - {err_body}")

def pb_list(collection, params="perPage=100&sort=-created"):
    """List records from a PocketBase collection."""
    url = f"{CRM_API_URL}/api/collections/{collection}/records?{params}"
    return _request(url)

def pb_get(collection, record_id, expand=""):
    """Get a single record by ID."""
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    if expand:
        url += f"?expand={expand}"
    return _request(url)

def pb_create(collection, data):
    """Create a new record."""
    url = f"{CRM_API_URL}/api/collections/{collection}/records"
    return _request(url, "POST", data)

def pb_update(collection, record_id, data):
    """Update an existing record."""
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    return _request(url, "PATCH", data)

def pb_delete(collection, record_id):
    """Delete a record. Returns True on success."""
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    try:
        _request(url, "DELETE")
        return True
    except:
        return False

def pb_get_first(collection, filter_str=""):
    """Get the first record matching a filter."""
    params = "perPage=1&sort=-created"
    if filter_str:
        params += f"&filter={urllib.parse.quote(filter_str)}" if hasattr(urllib, 'parse') else f"&filter={filter_str}"
    result = pb_list(collection, params)
    items = result.get("items", [])
    return items[0] if items else None

def pb_count(collection, filter_str=""):
    """Get count of records matching a filter."""
    params = "perPage=1"
    if filter_str:
        params += f"&filter={filter_str}"
    result = pb_list(collection, params)
    return result.get("totalItems", 0)

# ============================================================================
# CLI Entry Point
# ============================================================================
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1]
    col = sys.argv[2]
    rid = sys.argv[3] if len(sys.argv) > 3 else ""
    
    try:
        if cmd == "list":
            params = sys.argv[4] if len(sys.argv) > 4 else "perPage=100&sort=-created"
            result = pb_list(col, params)
        elif cmd == "get" and rid:
            expand = sys.argv[4] if len(sys.argv) > 4 else ""
            result = pb_get(col, rid, expand)
        elif cmd == "create":
            data = json.loads(sys.stdin.read())
            result = pb_create(col, data)
        elif cmd == "update" and rid:
            data = json.loads(sys.stdin.read())
            result = pb_update(col, rid, data)
        elif cmd == "delete" and rid:
            result = {"deleted": pb_delete(col, rid)}
        elif cmd == "count":
            flt = sys.argv[3] if len(sys.argv) > 3 else ""
            result = {"count": pb_count(col, flt)}
        elif cmd == "first":
            flt = sys.argv[3] if len(sys.argv) > 3 else ""
            result = pb_get_first(col, flt)
        else:
            print(f"Unknown command: {cmd}")
            sys.exit(1)
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
