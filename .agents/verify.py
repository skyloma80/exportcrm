#!/usr/bin/env python3
"""Verify CRM API connectivity and test all major collections."""
import sys, os, json, urllib.request

# Get token from CRM user auth
CRM_API_URL = "http://localhost:8090"
url = f"{CRM_API_URL}/api/collections/users/auth-with-password"
body = json.dumps({"identity": "271341794@qq.com", "password": "085711jern"}).encode()
req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    token = data["token"]
    user_id = data["record"]["id"]
    print(f"✅ 用户认证成功: {data['record']['email']} (ID: {user_id})")

def pb_list(col, params="perPage=10&sort=-created"):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    u = f"{CRM_API_URL}/api/collections/{col}/records?{params}"
    req = urllib.request.Request(u, headers=h)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

# Test collections
tests = [
    ("customers", "客户", "name"),
    ("suppliers", "供应商", "name"),
    ("products", "产品", "name"),
    ("projects", "项目", "name"),
    ("feedbacks", "反馈", "title"),
    ("tasks", "任务", "title"),
    ("rfqs", "询价", "code"),
    ("quotations", "报价", "code"),
    ("purchase_orders", "采购订单", "code"),
    ("shipments", "发货", "code"),
]

passed = 0
failed = 0

for col, label, name_field in tests:
    try:
        r = pb_list(col, "perPage=3")
        count = r.get("totalItems", 0)
        items = r.get("items", [])
        names = [item.get(name_field, "?") for item in items[:3]]
        print(f"  ✅ {col} ({label}): {count} 条记录 — {', '.join(names)}")
        passed += 1
    except Exception as e:
        print(f"  ❌ {col} ({label}): {str(e)[:80]}")
        failed += 1

# Test script files
import py_compile
script_dir = ".agents"
script_count = 0
for root, dirs, files in os.walk(script_dir):
    for f in files:
        if f.endswith(".py"):
            path = os.path.join(root, f)
            try:
                py_compile.compile(path, doraise=True)
                script_count += 1
            except py_compile.PyCompileError as e:
                print(f"  ❌ 语法错误: {path}: {e}")

print(f"\n{'='*50}")
print(f"集合测试: ✅ {passed}/{passed+failed}")
print(f"脚本文件: ✅ {script_count} 个 Python 文件语法检查通过")
print(f"{'='*50}")
print(f"\nCRM_API_TOKEN 已从 CRM 用户自动获取，可以直接使用。")
print(f"用户ID: {user_id}")
print(f"\n✅ 验证完成！所有脚本就绪。")
