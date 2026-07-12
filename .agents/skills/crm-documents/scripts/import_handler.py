"""Document import orchestrator.

Coordinates parsing, DB comparison, and writing.
"""
from __future__ import annotations
import os
import sys
import json
from datetime import datetime
from pathlib import Path

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))

try:
    from call_api import call_api
except ImportError:
    call_api = None

from deps import ensure_deps


def import_document(file_path: str, auto_apply: bool = False) -> dict:
    """Import a document into the CRM system.

    Full pipeline:
    1. Detect file type (Excel/PDF)
    2. Parse file to structured data
    3. Compare against database
    4. Generate report
    5. If auto_apply, create/update records
    6. Log activities

    Args:
        file_path: Absolute path to the uploaded file
        auto_apply: If True, automatically apply changes without user confirmation

    Returns:
        Dict with parsed data, comparison, and actions taken
    """
    ensure_deps()

    ext = Path(file_path).suffix.lower()
    if ext in (".xlsx", ".xls"):
        from excel_parser import parse_excel
        parsed = parse_excel(file_path)
    elif ext == ".pdf":
        from pdf_parser import parse_pdf
        parsed = parse_pdf(file_path)
    else:
        return {"error": f"Unsupported file type: {ext}"}

    from db_comparator import compare_with_db
    comparison = compare_with_db(parsed)

    actions_taken = []
    if auto_apply:
        actions_taken = _apply_changes(parsed, comparison)

    html_report = _generate_report(parsed, comparison, actions_taken)

    return {
        "parsed": parsed,
        "comparison": comparison,
        "actions_taken": actions_taken,
        "html_report": html_report,
        "summary": comparison.get("summary", {}),
    }


def _create_record(collection: str, data: dict) -> dict | None:
    """Create a record in PocketBase and log it."""
    if call_api is None:
        return None

    try:
        result = call_api("POST", collection, body=data)
        _log_activity("create", collection, result.get("id", ""),
                       data.get("name", "") or data.get("code", ""))
        return result
    except Exception as e:
        return {"error": str(e)}


def _update_record(collection: str, record_id: str, data: dict) -> dict | None:
    """Update a record in PocketBase and log it."""
    if call_api is None:
        return None

    try:
        result = call_api("PATCH", f"{collection}/{record_id}", body=data)
        _log_activity("update", collection, record_id,
                       data.get("name", "") or data.get("code", ""))
        return result
    except Exception as e:
        return {"error": str(e)}


def _log_activity(action: str, entity_type: str, entity_id: str,
                   entity_name: str):
    """Record operation in activity_logs."""
    if call_api is None:
        return
    try:
        call_api("POST", "activity_logs", body={
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
        })
    except Exception:
        pass


def _apply_changes(parsed: dict, comparison: dict) -> list[dict]:
    """Apply all changes from comparison report."""
    try:
        from field_extractor import normalize_customer, normalize_supplier, normalize_items
    except ImportError:
        from .field_extractor import normalize_customer, normalize_supplier, normalize_items

    actions = []
    cust = comparison.get("customer", {})
    items = parsed.get("items", [])

    if cust.get("suggestion") == "create":
        cust_data = normalize_customer(parsed.get("customer", {}))
        cust_data["code"] = _generate_code("CUS")
        result = _create_record("customers", cust_data)
        actions.append({
            "type": "create", "collection": "customers",
            "name": cust_data.get("name", ""),
            "record_id": result.get("id") if result else None,
        })

    elif cust.get("suggestion") == "update":
        db = cust.get("db_record", {})
        if db:
            update_fields = {}
            for field in cust.get("diff_fields", []):
                doc_val = parsed.get("customer", {}).get(field)
                if doc_val:
                    update_fields[field] = doc_val
            if update_fields:
                result = _update_record("customers", db["id"], update_fields)
                actions.append({
                    "type": "update", "collection": "customers",
                    "name": db.get("name", ""),
                    "record_id": db["id"],
                    "fields": list(update_fields.keys()),
                })

    for item_report in comparison.get("products", []):
        if item_report.get("suggestion") == "create":
            name = item_report.get("name", "")
            if name:
                prod_data = {
                    "name": name,
                    "code": _generate_code("PRD"),
                    "unit": _guess_unit(items, name),
                }
                result = _create_record("products", prod_data)
                actions.append({
                    "type": "create", "collection": "products",
                    "name": name,
                    "record_id": result.get("id") if result else None,
                })

    return actions


def _generate_code(prefix: str = "CUS") -> str:
    """Generate a unique code for new records."""
    import random
    suffix = datetime.now().strftime("%y%m%d") + str(random.randint(100, 999))
    return f"{prefix}-{suffix}"


def _guess_unit(items: list[dict], product_name: str) -> str:
    """Guess unit of measurement."""
    for item in items:
        if item.get("product_name", "").lower() in product_name.lower():
            return item.get("unit", "pcs")
    return "pcs"


def _generate_report(parsed: dict, comparison: dict,
                      actions: list[dict]) -> str:
    """Generate HTML diff report."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    doc_code = parsed.get("doc_code", "")
    doc_type_mapping = {"pi": "PI", "po": "PO", "quotation": "报价单",
                         "invoice": "发票", "unknown": "未知"}
    doc_label = doc_type_mapping.get(parsed.get("doc_type", "unknown"), "文档")

    # Customer section
    cust = comparison.get("customer", {})
    cust_html = _status_badge(cust.get("status", "no_data"),
                               cust.get("suggestion", "skip"))

    # Supplier section
    supp = comparison.get("supplier", {})
    supp_html = ""
    if supp:
        supp_html = f"<p>供应商: {_status_badge(supp.get('status', 'no_data'), supp.get('suggestion', 'skip'))}"

    # Products table
    prod_rows = ""
    for p in comparison.get("products", []):
        badge = _status_badge(p.get("status", "no_data"),
                               p.get("suggestion", "skip"))
        db_name = (p.get("db_record", {}) or {}).get("name", "-") if p.get("db_record") else "-"
        prod_rows += f"""
        <tr>
            <td>{p.get('name', '')}</td>
            <td>{db_name}</td>
            <td>{badge}</td>
        </tr>"""

    # Price mismatches
    price_rows = ""
    for pm in comparison.get("price_mismatches", []):
        price_rows += f"""
        <tr>
            <td>{pm.get('product_name', '')}</td>
            <td class="num">{pm.get('doc_price', 0):,.2f}</td>
            <td class="num">{pm.get('db_price', 0):,.2f}</td>
            <td class="num" style="color:{'#ef4444' if pm.get('diff_pct', 0) < 0 else '#10b981'}">{pm.get('diff_pct', 0):+.1f}%</td>
        </tr>"""

    # Actions taken
    action_lines = ""
    for a in actions:
        icon = "➕" if a["type"] == "create" else "✏️"
        action_lines += f"<li>{icon} {a['type']} {a['collection']} — {a['name']}</li>"

    summary = comparison.get("summary", {})

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>文档导入报告 - {doc_code}</title>
<style>
body {{ font-family: system-ui; padding: 20px; background: #f8fafc; max-width: 960px; margin: auto; }}
table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
th, td {{ border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; font-size: 13px; }}
th {{ background: #1e293b; color: white; }}
.num {{ text-align: right; }}
.badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
.badge-found {{ background: #dcfce7; color: #166534; }}
.badge-not_found {{ background: #fef2f2; color: #991b1b; }}
.badge-no_data {{ background: #f3f4f6; color: #6b7280; }}
.badge-partial {{ background: #fef9c3; color: #854d0e; }}
.section {{ background: white; border-radius: 8px; padding: 16px; margin: 12px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
h2 {{ margin: 0 0 8px; font-size: 16px; color: #1e293b; }}
p, li {{ font-size: 13px; color: #374151; }}
</style></head><body>
<h2>📄 {doc_label} 导入报告 — {doc_code}</h2>
<p style="color:#64748b;font-size:12px;">生成时间: {now}</p>

<div class="section">
    <h2>📋 客户信息</h2>
    {cust_html}
    {supp_html}
    <p>币种: {parsed.get('currency', '-')} | 总金额: {parsed.get('total_amount', 0):,.2f}</p>
</div>

<div class="section">
    <h2>📦 产品明细 ({summary.get('total_items', 0)} 项)</h2>
    <p>已匹配: {summary.get('matched', 0)} | 需新建: {summary.get('to_create', 0)} | 需更新: {summary.get('to_update', 0)}</p>
    <table><tr><th>文档产品</th><th>数据库匹配</th><th>状态</th></tr>
    {prod_rows}
    </table>
</div>"""

    if price_rows:
        html += f"""
<div class="section">
    <h2>💰 价格差异</h2>
    <table><tr><th>产品</th><th>文档价格</th><th>数据库价格</th><th>差异</th></tr>
    {price_rows}
    </table>
</div>"""

    if actions:
        html += f"""
<div class="section">
    <h2>✅ 执行操作</h2>
    <ul>{action_lines}</ul>
</div>"""

    html += """
<div class="section" style="text-align:center;color:#6b7280;">
    <p>请核对以上信息，确认无误后执行导入操作。</p>
</div>
</body></html>"""

    return html


def _status_badge(status: str, suggestion: str) -> str:
    """Generate HTML status badge."""
    labels = {
        "found": "已匹配",
        "not_found": "未找到",
        "partial_match": "部分匹配",
        "name_match": "名称匹配",
        "no_data": "无数据",
    }
    css = {
        "found": "badge badge-found",
        "not_found": "badge badge-not_found",
        "partial_match": "badge badge-partial",
        "name_match": "badge badge-found",
        "no_data": "badge badge-no_data",
    }
    label = labels.get(status, status)
    cls = css.get(status, "badge badge-no_data")
    return f'<span class="{cls}">{label}</span>'
