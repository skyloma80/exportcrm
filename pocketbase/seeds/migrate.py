#!/usr/bin/env python3
"""Migrate seed data from generated/ to final seed files in pocketbase/seeds/"""

import json
import os
from collections import OrderedDict

GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated")
OUTPUT_DIR = os.path.dirname(__file__)


def read_json(filename):
    path = os.path.join(GENERATED_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return []
        return json.loads(content)


def write_json(filename, data):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Written {len(data)} records to {filename}")


def build_id_map(records, key="id"):
    return {r.get(key): r for r in records if r.get(key)}


def safe_json_parse(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, str):
        return val
    return str(val)


def transform_products(products, cat_map):
    """category is already an ID in the source data; just pass through"""
    for p in products:
        cat = p.get("category", "")
        if cat and cat not in cat_map:
            p["category"] = ""
    return products


def transform_projects(projects):
    """customer is already an ID; pass through"""
    return projects


def transform_rfqs(rfqs):
    """project is already an ID; pass through"""
    return rfqs


def merge_sales_orders(orders, so_list):
    """Merge orders + so -> sales_orders.
    Normalize fields: customer->customer_id, project->project_id,
    so.customer remains as customer_id.
    """
    seen_codes = {}
    result = []

    for o in orders:
        rec = dict(o)
        rec["collection"] = "sales_orders"
        rec.pop("paid_amount", None)
        if "bank_info" in rec and rec["bank_info"] is not None:
            rec["bank_info"] = safe_json_parse(rec["bank_info"])
        code = rec.get("code", "")
        seen_codes[code] = rec
        result.append(rec)

    for s in so_list:
        rec = dict(s)
        rec["collection"] = "sales_orders"
        code = rec.get("code", "")
        if code in seen_codes:
            existing = seen_codes[code]
            for k, v in rec.items():
                if (
                    v not in (None, "", [])
                    or k not in existing
                    or existing[k] in (None, "")
                ):
                    existing[k] = v
        else:
            seen_codes[code] = rec
            result.append(rec)

    return result


def merge_purchase_orders(po_list, purchase_orders_list):
    """Merge po + purchase_orders. Normalize supplier_id/supplier_name -> supplier, supplier_name"""
    seen_codes = {}
    result = []

    for po in po_list:
        rec = dict(po)
        rec["collection"] = "purchase_orders"
        if "supplier_id" in rec:
            rec["supplier"] = rec.pop("supplier_id")
        if "supplier_name" in rec:
            rec["supplier_name"] = rec["supplier_name"]
        code = rec.get("code", "")
        seen_codes[code] = rec
        result.append(rec)

    for po in purchase_orders_list:
        rec = dict(po)
        rec["collection"] = "purchase_orders"
        code = rec.get("code", "")
        if code in seen_codes:
            existing = seen_codes[code]
            for k, v in rec.items():
                if (
                    v not in (None, "", [])
                    or k not in existing
                    or existing[k] in (None, "")
                ):
                    existing[k] = v
        else:
            seen_codes[code] = rec
            result.append(rec)

    return result


def apply_order_items(order_items, sales_orders):
    """Group order_items by order ID, create items JSON array, update sales_orders"""
    items_by_order = {}
    for item in order_items:
        oid = item.get("order", "")
        if not oid:
            continue
        items_by_order.setdefault(oid, []).append(item)

    so_by_id = {r.get("id"): r for r in sales_orders}

    for oid, items in items_by_order.items():
        if oid not in so_by_id:
            continue
        so = so_by_id[oid]
        item_list = []
        for it in items:
            item_obj = OrderedDict()
            item_obj["product"] = it.get("product", "")
            item_obj["product_name"] = it.get("product_name", "")
            item_obj["product_code"] = it.get("product_code", "")
            item_obj["part_number"] = it.get("part_number", "")
            item_obj["description_en"] = it.get("description_en", "")
            item_obj["unit_price"] = it.get("unit_price", 0)
            item_obj["quantity"] = it.get("quantity", 0)
            item_obj["amount"] = it.get("amount", 0)
            item_obj["cost_price"] = it.get("cost_price", 0)
            item_list.append(item_obj)
        so["items"] = json.dumps(item_list, ensure_ascii=False)


def apply_purchase_order_items(po_items, purchase_orders):
    """Group purchase_order_items by purchase_order ID, create items JSON array"""
    items_by_po = {}
    for item in po_items:
        poid = item.get("purchase_order", "")
        if not poid:
            continue
        items_by_po.setdefault(poid, []).append(item)

    po_by_id = {r.get("id"): r for r in purchase_orders}

    for poid, items in items_by_po.items():
        if poid not in po_by_id:
            continue
        po = po_by_id[poid]
        if po.get("items"):
            existing_items = []
            try:
                existing_items = (
                    json.loads(po["items"])
                    if isinstance(po["items"], str)
                    else po["items"]
                )
            except (json.JSONDecodeError, TypeError):
                existing_items = []
            if existing_items:
                continue

        item_list = []
        for it in items:
            item_obj = OrderedDict()
            item_obj["part_number"] = it.get("part_number", "")
            item_obj["product_name"] = it.get("product_name", "")
            item_obj["unit"] = it.get("unit", "")
            item_obj["quantity"] = it.get("quantity", 0)
            item_obj["unit_price"] = it.get("unit_price", 0)
            item_obj["amount"] = it.get("amount", 0)
            item_obj["description_en"] = it.get("description_en", "")
            item_obj["description_cn"] = it.get("description_cn", "")
            item_list.append(item_obj)
        po["items"] = json.dumps(item_list, ensure_ascii=False)


def rename_order_payments(payments):
    """Rename order_payments to sales_order_payments, keep order field as-is"""
    for p in payments:
        p["collection"] = "sales_order_payments"
    return payments


def passthrough(data, collection=None):
    if collection:
        for r in data:
            r["collection"] = collection
    return data


def main():
    print("Reading source files from generated/...")

    product_categories = read_json("product_categories.json")
    products = read_json("products.json")
    customers = read_json("customers.json")
    suppliers = read_json("suppliers.json")
    service_providers = read_json("service_providers.json")
    exchange_rate_cache = read_json("exchange_rate_cache.json")
    exchange_rate_history = read_json("exchange_rate_history.json")
    bank_accounts = read_json("bank_accounts.json")
    user_settings = read_json("user_settings.json")
    app_config = read_json("app_config.json")
    projects = read_json("projects.json")
    rfqs = read_json("rfqs.json")
    quotations = read_json("quotations.json")
    orders = read_json("orders.json")
    so_list = read_json("so.json")
    purchase_orders_raw = read_json("purchase_orders.json")
    po_list = read_json("po.json")
    rfq_suppliers = read_json("rfq_suppliers.json")
    rfq_quotations = read_json("rfq_quotations.json")
    rfq_items = read_json("rfq_items.json")
    quotation_items = read_json("quotation_items.json")
    shipments = read_json("shipments.json")
    shipment_items = read_json("shipment_items.json")
    customer_contacts = read_json("customer_contacts.json")
    supplier_contacts = read_json("supplier_contacts.json")
    products_projects = read_json("products_projects.json")
    customer_tracking = read_json("customer_tracking.json")
    product_documents = read_json("product_documents.json")
    order_payments = read_json("order_payments.json")
    remittance = read_json("remittance.json")
    tasks = read_json("tasks.json")
    feedbacks = read_json("feedbacks.json")
    activity_logs = read_json("activity_logs.json")
    project_cost_tables = read_json("project_cost_tables.json")
    project_cost_table_items = read_json("project_cost_table_items.json")
    quotation_mold_items = read_json("quotation_mold_items.json")
    order_mold_items = read_json("order_mold_items.json")
    purchase_order_mold_items = read_json("purchase_order_mold_items.json")
    customs_clearance = read_json("customs_clearance.json")
    customs_fees = read_json("customs_fees.json")
    customs_declaration_items = read_json("customs_declaration_items.json")

    print("Building lookup maps...")
    cat_map = build_id_map(product_categories)
    cust_map = build_id_map(customers)
    supp_map = build_id_map(suppliers)
    proj_map = build_id_map(projects)

    print("Applying transformations...")

    # 1. product_categories - direct
    product_categories = passthrough(product_categories)

    # 2. products - category already IDs
    products = transform_products(products, cat_map)
    products = passthrough(products)

    # 3. customers - direct
    customers = passthrough(customers)

    # 4. suppliers - direct
    suppliers = passthrough(suppliers)

    # 5. service_providers - direct
    service_providers = passthrough(service_providers)

    # 6. exchange_rate_cache, exchange_rate_history - direct
    exchange_rate_cache = passthrough(exchange_rate_cache)
    exchange_rate_history = passthrough(exchange_rate_history)

    # 7. bank_accounts - direct
    bank_accounts = passthrough(bank_accounts)

    # 8. user_settings - direct
    user_settings = passthrough(user_settings)

    # 9. app_config - direct
    app_config = passthrough(app_config)

    # 10. projects - customer already IDs
    projects = transform_projects(projects)
    projects = passthrough(projects)

    # 11. rfqs - project already IDs
    rfqs = transform_rfqs(rfqs)
    rfqs = passthrough(rfqs)

    # 12. quotations - customer, project already IDs; items JSON is null in source
    quotations = passthrough(quotations)

    # 13. sales_orders (merge orders + so)
    sales_orders = merge_sales_orders(orders, so_list)
    order_items = read_json("order_items.json")
    apply_order_items(order_items, sales_orders)

    # 14. purchase_orders (merge po + purchase_orders)
    purchase_orders = merge_purchase_orders(po_list, purchase_orders_raw)
    purchase_order_items = read_json("purchase_order_items.json")
    apply_purchase_order_items(purchase_order_items, purchase_orders)

    # 15. rfq_suppliers - direct (rfq, supplier already IDs)
    rfq_suppliers = passthrough(rfq_suppliers)

    # 16. rfq_quotations - direct (rfq, rfq_item, supplier already IDs)
    rfq_quotations = passthrough(rfq_quotations)

    # 17. rfq_items - direct (rfq, product already IDs)
    rfq_items = passthrough(rfq_items)

    # 18. quotation_items - direct (quotation, product already IDs)
    quotation_items = passthrough(quotation_items)

    # 19. shipments - direct (order already ID)
    shipments = passthrough(shipments)

    # 20. shipment_items - direct
    shipment_items = passthrough(shipment_items)

    # 21. customer_contacts - direct (customer already ID)
    customer_contacts = passthrough(customer_contacts)

    # 22. supplier_contacts - direct (supplier already ID)
    supplier_contacts = passthrough(supplier_contacts)

    # 23. products_projects - direct (product, project already IDs)
    products_projects = passthrough(products_projects)

    # 24. customer_tracking - empty
    customer_tracking = passthrough(customer_tracking)

    # 25. product_documents - empty
    product_documents = passthrough(product_documents)

    # 26. sales_order_payments (rename from order_payments)
    order_payments = rename_order_payments(order_payments)

    # 27. remittance - direct
    remittance = passthrough(remittance)

    # 28. tasks - empty
    tasks = passthrough(tasks)

    # 29. feedbacks - direct
    feedbacks = passthrough(feedbacks)

    # 30. activity_logs - direct
    activity_logs = passthrough(activity_logs)

    # 31-32. project_cost_tables, project_cost_table_items
    project_cost_tables = passthrough(project_cost_tables)
    project_cost_table_items = passthrough(project_cost_table_items)

    # 33. mold items (all empty)
    quotation_mold_items = passthrough(quotation_mold_items)
    order_mold_items = passthrough(order_mold_items)
    purchase_order_mold_items = passthrough(purchase_order_mold_items)

    # 34. customs (all empty)
    customs_clearance = passthrough(customs_clearance)
    customs_fees = passthrough(customs_fees)
    customs_declaration_items = passthrough(customs_declaration_items)

    # Write output files in import order
    print("\nWriting final seed files...")
    write_json("product_categories.json", product_categories)
    write_json("products.json", products)
    write_json("customers.json", customers)
    write_json("suppliers.json", suppliers)
    write_json("service_providers.json", service_providers)
    write_json("exchange_rate_cache.json", exchange_rate_cache)
    write_json("exchange_rate_history.json", exchange_rate_history)
    write_json("bank_accounts.json", bank_accounts)
    write_json("user_settings.json", user_settings)
    write_json("app_config.json", app_config)
    write_json("projects.json", projects)
    write_json("rfqs.json", rfqs)
    write_json("quotations.json", quotations)
    write_json("sales_orders.json", sales_orders)
    write_json("purchase_orders.json", purchase_orders)
    write_json("rfq_suppliers.json", rfq_suppliers)
    write_json("rfq_quotations.json", rfq_quotations)
    write_json("rfq_items.json", rfq_items)
    write_json("quotation_items.json", quotation_items)
    write_json("shipments.json", shipments)
    write_json("shipment_items.json", shipment_items)
    write_json("customer_contacts.json", customer_contacts)
    write_json("supplier_contacts.json", supplier_contacts)
    write_json("products_projects.json", products_projects)
    write_json("customer_tracking.json", customer_tracking)
    write_json("product_documents.json", product_documents)
    write_json("sales_order_payments.json", order_payments)
    write_json("remittance.json", remittance)
    write_json("tasks.json", tasks)
    write_json("feedbacks.json", feedbacks)
    write_json("activity_logs.json", activity_logs)
    write_json("project_cost_tables.json", project_cost_tables)
    write_json("project_cost_table_items.json", project_cost_table_items)
    write_json("quotation_mold_items.json", quotation_mold_items)
    write_json("order_mold_items.json", order_mold_items)
    write_json("purchase_order_mold_items.json", purchase_order_mold_items)
    write_json("customs_clearance.json", customs_clearance)
    write_json("customs_fees.json", customs_fees)
    write_json("customs_declaration_items.json", customs_declaration_items)

    print("\nMigration complete!")


if __name__ == "__main__":
    main()
