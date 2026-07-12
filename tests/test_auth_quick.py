import sys
sys.path.insert(0, '.agents/skills/crm-auth/scripts')
from authenticate import pb_list

data = pb_list("customers", "perPage=3")
print(f"Customers: {len(data.get('items', []))} records")
if data.get("items"):
    print(f"First: {data['items'][0]['name']}")
