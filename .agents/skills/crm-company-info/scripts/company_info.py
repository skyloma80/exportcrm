#!/usr/bin/env python3
"""CRM Company Info CLI — branding, payment terms, ports, config."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_create, pb_update

def get_company():
    info = pb_list("company_info", "perPage=1")
    return info.get("items", [{}])[0] if info.get("items") else {}

def get_branding():
    b = pb_list("document_branding", "perPage=1")
    return b.get("items", [{}])[0] if b.get("items") else {}

def get_payment_terms():
    return pb_list("payment_terms", "sort=sort_order")

def get_ports(kind="loading"):
    col = "ports_of_loading" if kind == "loading" else "ports_of_destination"
    return pb_list(col, "sort=name")

def get_config(key=""):
    f = f"filter=(key='{key}')" if key else ""
    return pb_list("app_config", f"sort=key&perPage=100&{f}" if f else "sort=key&perPage=100")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "company"
    try:
        cmds = {
            "company": get_company,
            "branding": get_branding,
            "payment-terms": get_payment_terms,
            "ports": lambda: get_ports(sys.argv[2] if len(sys.argv)>2 else "loading"),
            "config": lambda: get_config(sys.argv[2] if len(sys.argv)>2 else ""),
        }
        result = cmds[cmd]()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
