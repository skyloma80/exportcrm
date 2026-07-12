import sys
sys.path.insert(0, ".agents/skills/crm-auth/scripts")
from authenticate import list_records
data = list_records("customers", "sort=-created&perPage=1")
if data.get("items"):
    c = data["items"][0]
    print(f"Latest: {c.get('name','?')} ({c.get('code','?')}) - {c.get('country','?')}")
else:
    print("No customers found")
