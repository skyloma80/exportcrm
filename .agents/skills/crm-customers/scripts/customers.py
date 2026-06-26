#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_customers(search="", country=""):
    params = "sort=-created&perPage=100"
    if search:
        params += f"&filter=(name~'{search}')"
    if country:
        flt = f"(country='{country}')"
        params += f"&filter={flt}" if not search else f"&&{flt}"
    return pb_list("customers", params)

def get_customer(customer_id, expand=True):
    e = "contacts,customer_tracking" if expand else ""
    return pb_get("customers", customer_id, e)

def create_customer(data):
    return pb_create("customers", data)

def update_customer(customer_id, data):
    return pb_update("customers", customer_id, data)

def delete_customer(customer_id):
    return pb_delete("customers", customer_id)

def add_contact(customer_id, name, email, phone, position="", is_primary=False):
    return pb_create("customer_contacts", {
        "customer": customer_id, "name": name,
        "email": email, "phone": phone,
        "position": position, "is_primary": is_primary
    })

def list_contacts(customer_id):
    return pb_list("customer_contacts", f"filter=(customer='{customer_id}')")

def create_tracking(customer_id, status, notes=""):
    return pb_create("customer_tracking", {
        "customer_id": customer_id, "status": status, "notes": notes
    })

def count_customers():
    from authenticate import pb_count
    return pb_count("customers")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: customers.py <list|get|create|update|delete|add-contact|contacts|tracking|count> [args]")
        sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            search = sys.argv[2] if len(sys.argv) > 2 else ""
            country = sys.argv[3] if len(sys.argv) > 3 else ""
            result = list_customers(search, country)
        elif cmd == "get" and len(sys.argv) > 2:
            result = get_customer(sys.argv[2])
        elif cmd == "create":
            result = create_customer(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv) > 2:
            result = update_customer(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv) > 2:
            result = delete_customer(sys.argv[2])
        elif cmd == "add-contact" and len(sys.argv) > 2:
            result = add_contact(sys.argv[2], **json.loads(sys.stdin.read()))
        elif cmd == "contacts" and len(sys.argv) > 2:
            result = list_contacts(sys.argv[2])
        elif cmd == "tracking" and len(sys.argv) > 2:
            result = create_tracking(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv)>4 else "")
        elif cmd == "count":
            result = {"count": count_customers()}
        else:
            print("Unknown command")
            sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
