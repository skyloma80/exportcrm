"""
CRM Skills JSONB 结构一致性测试

验证所有集合的 JSONB items 字段结构与 DATABASE_SCHEMA.md 定义一致。
读操作为主，写入操作可选（依赖 API 权限）。
"""

import os, sys, json, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".agents", "skills", "crm-auth", "scripts"))
from authenticate import list_records, create_record, delete_record, get_record

SKILL_TAG = "tskill_"

# 根据 DATABASE_SCHEMA.md 定义的 items JSONB 标准字段
SCHEMA_ITEMS = {
    "so": {
        "required": ["id", "part_number", "product_name", "quantity", "unit", "unit_price", "amount"],
        "optional": ["description_en", "description_cn", "cost_price"]
    },
    "po": {
        "required": ["quantity", "unit_price", "amount"],
        "optional": ["id", "part_number", "product_name", "product_code", "description_en", "description_cn", "unit"]
    },
    "quotations": {
        "required": ["id", "product_id", "product_name", "quantity", "unit", "unit_price", "amount", "cost_price", "profit_margin"],
        "optional": ["part_number", "description_en", "description_cn", "remarks"]
    },
    "shipments": {
        "required": ["id", "order_item", "quantity"],
        "optional": ["part_number", "product_code", "product_name", "packages", "gross_weight",
                     "net_weight", "volume", "package_length", "package_width", "package_height"]
    }
}

# product_costs.tiers 是嵌套的 JSON 数组
TIERS_SCHEMA = {
    "required": ["min_quantity", "unit_price"]
}


class TestSchemaConsistency(unittest.TestCase):
    """验证 DATABASE_SCHEMA.md 与真实数据库一致"""

    def test_01_list_all_collections(self):
        """所有核心集合可查询"""
        for coll in ["customers", "suppliers", "products", "so", "po", "quotations", "shipments"]:
            data = list_records(coll, "perPage=1")
            self.assertIn("items", data, f"无法查询 {coll}")

    def test_02_so_items_structure(self):
        """SO items JSONB 字段完整性"""
        data = list_records("so", "perPage=1")
        if not data.get("items"):
            self.skipTest("无 SO 记录")
        so = data["items"][0]
        items = so.get("items", [])
        if not items:
            self.skipTest("此 SO 无行项目")
        item = items[0]
        for field in SCHEMA_ITEMS["so"]["required"]:
            self.assertIn(field, item, f"SO items 缺少必填字段 '{field}'")
        print(f"  SO items fields: {sorted(item.keys())}")

    def test_03_po_items_structure(self):
        """PO items JSONB 字段完整性"""
        data = list_records("po", "perPage=1")
        if not data.get("items"):
            self.skipTest("无 PO 记录")
        po = data["items"][0]
        items = po.get("items", [])
        if not items:
            self.skipTest("此 PO 无行项目")
        item = items[0]
        for field in SCHEMA_ITEMS["po"]["required"]:
            self.assertIn(field, item, f"PO items 缺少必填字段 '{field}'")
        print(f"  PO items fields: {sorted(item.keys())}")

    def test_04_quotation_items_structure(self):
        """报价单 items JSONB 字段完整性"""
        data = list_records("quotations", "perPage=1")
        if not data.get("items"):
            self.skipTest("无报价记录")
        q = data["items"][0]
        items = q.get("items", [])
        if not items:
            self.skipTest("此报价无行项目")
        item = items[0]
        for field in SCHEMA_ITEMS["quotations"]["required"]:
            self.assertIn(field, item, f"报价 items 缺少必填字段 '{field}'")
        print(f"  Quotation items fields: {sorted(item.keys())}")

    def test_05_shipment_items_structure(self):
        """发货单 items JSONB 字段完整性"""
        data = list_records("shipments", "perPage=1")
        if not data.get("items"):
            self.skipTest("无发货记录")
        s = data["items"][0]
        items = s.get("items", [])
        if not items:
            self.skipTest("此发货无行项目")
        item = items[0]
        for field in SCHEMA_ITEMS["shipments"]["required"]:
            self.assertIn(field, item, f"发货 items 缺少必填字段 '{field}'")
        print(f"  Shipment items fields: {sorted(item.keys())}")

    def test_06_product_costs_tiers_structure(self):
        """product_costs.tiers JSON 字段完整性"""
        data = list_records("product_costs", "perPage=1")
        if not data.get("items"):
            self.skipTest("无成本记录")
        pc = data["items"][0]
        tiers = pc.get("tiers", [])
        if not tiers:
            self.skipTest("此成本无阶梯价")
        tier = tiers[0] if isinstance(tiers, list) else []
        for field in TIERS_SCHEMA["required"]:
            self.assertIn(field, tier, f"tiers 缺少必填字段 '{field}'")
        print(f"  Tiers fields: {sorted(tier.keys())}")


class TestItemsWriteValidate(unittest.TestCase):
    """写入测试 items JSONB（需要 API 写入权限）"""

    def _try_create(self, coll, data):
        try:
            return create_record(coll, data)
        except Exception as e:
            self.skipTest(f"无 {coll} 写入权限: {e}")

    def test_10_write_so_with_items(self):
        r = self._try_create("so", {
            "code": SKILL_TAG + "SO",
            "customer_name": "Test Schema",
            "currency": "USD",
            "status": "draft",
            "total_amount": 100.0,
            "items": [
                {"id": "i1", "part_number": "T-1", "product_name": "Test",
                 "quantity": 1, "unit": "pcs", "unit_price": 100.0, "amount": 100.0}
            ]
        })
        saved = get_record("so", r["id"])
        self.assertEqual(saved["items"][0]["unit_price"], 100.0)
        self.assertEqual(saved["items"][0]["product_name"], "Test")
        self._try_clean("so", r["id"])

    def test_11_write_po_with_items(self):
        r = self._try_create("po", {
            "code": SKILL_TAG + "PO",
            "supplier_name": "Test Supplier",
            "currency": "USD",
            "status": "draft",
            "total_amount": 50.0,
            "items": [
                {"id": "pi1", "product_name": "Raw Mat", "quantity": 10,
                 "unit_price": 5.0, "amount": 50.0}
            ]
        })
        saved = get_record("po", r["id"])
        self.assertEqual(saved["items"][0]["amount"], 50.0)
        self._try_clean("po", r["id"])

    def test_12_write_quotations_with_items(self):
        customers = list_records("customers", "perPage=1")
        cid = customers.get("items", [{}])[0].get("id")
        projects = list_records("projects", "perPage=1")
        pid = projects.get("items", [{}])[0].get("id")
        if not cid or not pid:
            self.skipTest("需要已有客户和项目")
        r = self._try_create("quotations", {
            "project": pid, "customer": cid,
            "version": 1, "status": "draft",
            "incoterm": "FOB", "validity_days": 30,
            "currency": "USD", "total_amount": 1000.0,
            "items": [{"id": "qi1", "product_id": "p1", "product_name": "Q Item",
                       "quantity": 10, "unit": "pcs", "unit_price": 100.0,
                       "amount": 1000.0, "cost_price": 80.0, "profit_margin": 20}]
        })
        saved = get_record("quotations", r["id"])
        self.assertEqual(saved["items"][0]["profit_margin"], 20)
        self._try_clean("quotations", r["id"])

    def test_13_write_shipments_with_items(self):
        sos = list_records("so", "perPage=1")
        oid = sos.get("items", [{}])[0].get("id")
        if not oid:
            self.skipTest("需要已有 SO")
        r = self._try_create("shipments", {
            "code": SKILL_TAG + "SHP",
            "order": oid,
            "status": "preparing",
            "shipping_method": "Sea",
            "items": [{"id": "si1", "order_item": "so_item_1", "quantity": 5,
                       "packages": 1, "gross_weight": 100.0}]
        })
        saved = get_record("shipments", r["id"])
        self.assertEqual(saved["items"][0]["quantity"], 5)
        self._try_clean("shipments", r["id"])

    def _try_clean(self, coll, rid):
        try:
            delete_record(coll, rid)
        except Exception:
            pass  # 无权限清理也没关系（测试记录会残留）


class TestWriteNegative(unittest.TestCase):
    """传错字段的行为验证"""

    def test_20_so_with_extra_fields(self):
        """多传字段 PocketBase 不会报错"""
        r = create_record("so", {
            "code": SKILL_TAG + "BAD",
            "customer_name": "Bad Data",
            "currency": "USD",
            "status": "draft",
            "total_amount": 0,
            "items": [{
                "id": "i1", "part_number": "X", "product_name": "X",
                "quantity": 1, "unit": "pcs", "unit_price": 0, "amount": 0,
                "nonexistent_field": "这个字段不存在"  # 额外字段
            }]
        })
        saved = get_record("so", r["id"])
        # PocketBase JSONB 存储任意字段
        self.assertIn("nonexistent_field", saved["items"][0])
        self._try_clean("so", r["id"])

    def test_21_so_missing_required_field(self):
        """缺少部分字段也不报错（PocketBase 无 JSONB 校验）"""
        r = create_record("so", {
            "code": SKILL_TAG + "MISS",
            "customer_name": "Missing Fields",
            "currency": "USD",
            "status": "draft",
            "total_amount": 0,
            "items": [{"id": "i1"}]  # 只有 id
        })
        saved = get_record("so", r["id"])
        self.assertEqual(len(saved["items"][0]), 1)  # 只有 id
        self.assertNotIn("quantity", saved["items"][0])
        self._try_clean("so", r["id"])

    def test_22_wrong_type_in_items(self):
        """类型错误也能存进去"""
        r = create_record("so", {
            "code": SKILL_TAG + "TYPE",
            "customer_name": "Wrong Type",
            "currency": "USD",
            "status": "draft",
            "total_amount": 0,
            "items": [{
                "id": "i1", "part_number": "X", "product_name": "X",
                "quantity": "abc",  # 文本而非数字
                "unit_price": "xyz",  # 文本而非数字
                "amount": "???"
            }]
        })
        saved = get_record("so", r["id"])
        self.assertEqual(saved["items"][0]["quantity"], "abc")  # 原样存储
        self._try_clean("so", r["id"])

    def _try_clean(self, coll, rid):
        try:
            delete_record(coll, rid)
        except Exception:
            pass


if __name__ == "__main__":
    if not os.environ.get("CRM_API_TOKEN"):
        print("需要设置 CRM_API_TOKEN 环境变量")
        print("可用: source <(python -c 'import urllib.request,json;d=json.dumps({\"identity\":\"271341794@qq.com\",\"password\":\"085711jern\"}).encode();r=urllib.request.urlopen(urllib.request.Request(\"http://localhost:8090/api/collections/users/auth-with-password\",data=d,headers={\"Content-Type\":\"application/json\"}));print(f\"export CRM_API_TOKEN={json.loads(r.read())[\\\"token\\\"]}\")')")
        sys.exit(1)
    unittest.main(verbosity=2)
