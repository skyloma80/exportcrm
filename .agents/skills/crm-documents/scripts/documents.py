#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import CRM_API_URL, _headers

def export_pi(order_id):
    url = f"{CRM_API_URL}/api/so/{order_id}/export-pi"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return {"status": "generated", "url": url, "size": len(r.read())}

def export_po(po_id):
    url = f"{CRM_API_URL}/api/po/{po_id}/export-excel"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return {"status": "generated", "url": url, "size": len(r.read())}

def list_pi_docs(order_id):
    url = f"{CRM_API_URL}/api/orders/{order_id}/pi-documents"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def list_po_docs(order_id):
    url = f"{CRM_API_URL}/api/orders/{order_id}/purchase-orders"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def generate_rfq_pdf(rfq_id):
    url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/pdf"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return {"status": "generated", "url": url, "size": len(r.read())}

def generate_shipment_docs(shipment_id):
    url = f"{CRM_API_URL}/api/shipments/{shipment_id}/documents/generate"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 3: print("Usage: documents.py <pi|po|pi-docs|po-docs|rfq-pdf|ship-docs> <id>"); sys.exit(1)
    cmd, rid = sys.argv[1], sys.argv[2]
    try:
        if cmd == "pi": result = export_pi(rid)
        elif cmd == "po": result = export_po(rid)
        elif cmd == "pi-docs": result = list_pi_docs(rid)
        elif cmd == "po-docs": result = list_po_docs(rid)
        elif cmd == "rfq-pdf": result = generate_rfq_pdf(rid)
        elif cmd == "ship-docs": result = generate_shipment_docs(rid)
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
