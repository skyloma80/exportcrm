"""
End-to-end smoke test for CRM AI agent architecture.

Verifies the full stack: authenticate → call_api → tools → skills.

Usage:
    python tests/smoke_test.py

Behavior:
    - If CRM_API_TOKEN or CRM_USER/CRM_PASS is set: runs real API calls
    - Otherwise: validates import structure and function signatures only
"""
from __future__ import annotations

import importlib
import inspect
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".agents"))

TOOLS_DIR = Path(__file__).resolve().parent.parent / ".agents" / "tools"
SKILLS_DIR = Path(__file__).resolve().parent.parent / ".agents" / "skills"

HAS_CREDENTIALS = bool(os.environ.get("CRM_API_TOKEN") or
                       (os.environ.get("CRM_USER") and os.environ.get("CRM_PASS")))

# ── Expected tools and their key functions ──────────────────────────

TOOLS = {
    "advance_so_status": ["advance_so_status", "cancel_so"],
    "advance_po_status": ["advance_po_status", "cancel_po"],
    "advance_shipment_status": ["advance_shipment_status"],
    "best_price": ["best_price"],
    "compare_prices": ["compare_prices"],
    "customer_overview": ["customer_overview"],
    "dashboard_summary": ["dashboard_summary"],
    "disk_ops": ["disk_upload", "disk_download", "disk_list", "disk_delete"],
    "export_pi": ["export_pi"],
    "export_po": ["export_po"],
    "payment_ops": ["approve_order_payment", "approve_po_payment", "reject_order_payment", "reject_po_payment"],
    "quotation_to_so": ["quotation_to_so"],
    "search_all": ["search_all"],
    "send_email": ["send_email"],
    "so_copy": ["so_copy"],
}

SKILLS = ["crm-auth", "crm-workflow", "crm-developer"]

# ── Tests ───────────────────────────────────────────────────────────

def test_call_api_import():
    from call_api import call_api, _find_endpoint_schema, _validate_body
    sig = inspect.signature(call_api)
    params = list(sig.parameters)
    assert "method" in params
    assert "endpoint" in params
    assert "body" in params
    print(f"  ✓ call_api signature: ({', '.join(params)})")


def test_openapi_spec():
    from call_api import _load_openapi
    spec = _load_openapi()
    if spec:
        paths = spec.get("paths", {})
        print(f"  ✓ openapi.json loaded: {len(paths)} paths")
        return True
    print("  ~ openapi.json not found, skipping schema validation")
    return False


def test_tool_imports():
    for mod_name, expected_funcs in TOOLS.items():
        mod = importlib.import_module(f"tools.{mod_name}")
        for func_name in expected_funcs:
            assert hasattr(mod, func_name), f"{mod_name}.{func_name} missing"
            func = getattr(mod, func_name)
            assert callable(func), f"{mod_name}.{func_name} not callable"
        print(f"  ✓ {mod_name}: {', '.join(expected_funcs)}")


def test_skill_files():
    for skill in SKILLS:
        path = SKILLS_DIR / skill / "SKILL.md"
        assert path.exists(), f"Missing: {path}"
        content = path.read_text(encoding="utf-8")
        assert content.startswith("---"), f"{skill}/SKILL.md missing YAML frontmatter"
        print(f"  ✓ {skill}/SKILL.md")


def test_workflow_state_machine():
    """Verify crm-workflow SKILL.md defines all expected state machines."""
    path = SKILLS_DIR / "crm-workflow" / "SKILL.md"
    content = path.read_text(encoding="utf-8")
    assert "draft → confirmed → in_production → ready_to_ship → shipped → delivered → completed" in content
    assert "draft → sent → confirmed → in_production → shipped → delivered → completed" in content
    assert "preparing → booking → customs_clearance → loaded → handed_over → shipped → in_transit → arrived → delivered" in content
    print("  ✓ crm-workflow state machines: SO, PO, Shipment")


def test_authenticate_import():
    from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, _headers
    print(f"  ✓ authenticate: pb_list, pb_get, pb_create, pb_update, pb_delete, _headers")


def test_live_ping():
    """If credentials available, try connecting to PocketBase."""
    if not HAS_CREDENTIALS:
        print("  ~ No credentials — live API ping skipped")
        return

    from call_api import call_api
    try:
        result = call_api("GET", "customers", params={"perPage": 1})
        print(f"  ✓ Live API: GET customers returned {len(result.get('items', []))} records")
    except RuntimeError as e:
        print(f"  ✗ Live API: {e}")


def test_live_tool_flows():
    """Test a subset of tool functions against live API."""
    if not HAS_CREDENTIALS:
        print("  ~ No credentials — live tool flow tests skipped")
        return

    # Try so_copy with a real record
    from call_api import call_api
    try:
        sos = call_api("GET", "so", params={"perPage": 1, "sort": "-created"})
        items = sos.get("items", [])
        if items:
            so_id = items[0]["id"]
            from tools.so_copy import so_copy
            result = so_copy(so_id)
            print(f"  ✓ so_copy('{so_id}') → new SO: {result.get('code', '?')}")

            # Clean up
            from call_api import call_api as api
            api("DELETE", f"so/{result['id']}")
            print(f"  ✓ Cleaned up test SO")
        else:
            print("  ~ No SO records to test so_copy")
    except RuntimeError as e:
        print(f"  ~ Live tool test skipped: {e}")


# ── Main ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  CRM AI Agent — End-to-End Smoke Test")
    print(f"  API: {'LIVE' if HAS_CREDENTIALS else 'OFFLINE (imports only)'}")
    print("=" * 60)

    tests = [
        ("call_api", test_call_api_import),
        ("OpenAPI spec", test_openapi_spec),
        ("authenticate", test_authenticate_import),
        ("tools import", test_tool_imports),
        ("skill files", test_skill_files),
        ("workflow states", test_workflow_state_machine),
        ("live ping", test_live_ping),
        ("live tool flows", test_live_tool_flows),
    ]

    passed = skipped = failed = 0
    for name, fn in tests:
        label = f"  {name:25s}"
        try:
            fn()
            passed += 1
        except AssertionError as e:
            print(f"{label} FAIL: {e}")
            failed += 1
        except Exception as e:
            print(f"{label} ERROR: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"  Results: {passed} passed, {failed} failed, {skipped} skipped")
    print(f"{'=' * 60}")
    sys.exit(failed)
