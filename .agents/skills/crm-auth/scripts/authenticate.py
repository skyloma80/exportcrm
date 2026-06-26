#!/usr/bin/env python3
"""
CRM Authentication Helper
Provides PocketBase API CRUD operations for Hermes agents.
"""
import os, sys, json, urllib.request, urllib.error

CRM_API_URL = os.environ.get("CRM_API_URL", "http://localhost:8090")
CRM_API_TOKEN = os.environ.get("CRM_API_TOKEN")

if not CRM_API_TOKEN:
    print("ERROR: CRM_API_TOKEN not set", file=sys.stderr)
    sys.exit(1)

def headers():
    return {
        "Authorization": f"Bearer {CRM_API_TOKEN}",
        "Content-Type": "application/json",
    }

def list_records(collection, params="perPage=100&sort=-created"):
    url = f"{CRM_API_URL}/api/collections/{collection}/records?{params}"
    req = urllib.request.Request(url, headers=headers())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def get_record(collection, record_id, expand=""):
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    if expand:
        url += f"?expand={expand}"
    req = urllib.request.Request(url, headers=headers())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def create_record(collection, data):
    url = f"{CRM_API_URL}/api/collections/{collection}/records"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=headers(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def update_record(collection, record_id, data):
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=headers(), method="PATCH")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def delete_record(collection, record_id):
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    req = urllib.request.Request(url, headers=headers(), method="DELETE")
    with urllib.request.urlopen(req) as r:
        return r.status == 204

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    col = sys.argv[2] if len(sys.argv) > 2 else ""
    rid = sys.argv[3] if len(sys.argv) > 3 else ""
    
    if cmd == "list" and col:
        result = list_records(col)
    elif cmd == "get" and col and rid:
        result = get_record(col, rid)
    elif cmd == "create" and col:
        data = json.loads(sys.stdin.read())
        result = create_record(col, data)
    elif cmd == "update" and col and rid:
        data = json.loads(sys.stdin.read())
        result = update_record(col, rid, data)
    elif cmd == "delete" and col and rid:
        result = delete_record(col, rid)
    else:
        print("Usage: authenticate.py <list|get|create|update|delete> <collection> [id]")
        sys.exit(1)
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
