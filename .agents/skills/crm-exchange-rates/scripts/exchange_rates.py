#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, CRM_API_URL, _headers

def get_rate(base, target):
    rates = pb_list("exchange_rate_cache", f"filter=(base_currency='{base}'&&target_currency='{target}')")
    item = rates.get("items", [{}])[0]
    return {"from": base, "to": target, "rate": float(item.get("rate", 0)), "updated": item.get("fetched_at", "")}

def refresh():
    url = f"{CRM_API_URL}/api/exchange-rates/refresh"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def convert(amount, from_curr, to_curr):
    rate_data = get_rate(from_curr, to_curr)
    rate = rate_data["rate"]
    converted = float(amount) * rate
    return {"amount": float(amount), "from": from_curr, "to": to_curr, "rate": rate, "result": round(converted, 2)}

def list_all():
    return pb_list("exchange_rate_cache", "perPage=50")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: exchange_rates.py <rate|refresh|convert|list> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "rate" and len(sys.argv)>3: result = get_rate(sys.argv[2], sys.argv[3])
        elif cmd == "refresh": result = refresh()
        elif cmd == "convert" and len(sys.argv)>4: result = convert(sys.argv[2], sys.argv[3], sys.argv[4])
        elif cmd == "list": result = list_all()
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
