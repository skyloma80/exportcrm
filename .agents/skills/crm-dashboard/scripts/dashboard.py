#!/usr/bin/env python3
"""CRM Dashboard CLI — query KPIs, statistics, and recent activity."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_count, pb_get_first

def order_stats():
    orders = pb_list("so", "perPage=200")
    items = orders.get("items", [])
    total = sum(float(o.get("total_amount", 0) or 0) for o in items)
    statuses = {}
    for o in items:
        s = o.get("status", "unknown")
        statuses[s] = statuses.get(s, 0) + 1
    return {"total_orders": len(items), "total_revenue": round(total, 2), "by_status": statuses}

def project_stats():
    projects = pb_list("projects", "perPage=100")
    items = projects.get("items", [])
    active = sum(1 for p in items if p.get("status") == "active")
    return {"total": len(items), "active": active}

def recent_activity(limit=20):
    return pb_list("activity_logs", f"sort=-created&perPage={limit}&expand=user")

def quick_overview():
    return {
        "orders": order_stats(),
        "projects": project_stats(),
        "customers": {"count": pb_count("customers")},
        "suppliers": {"count": pb_count("suppliers")},
        "feedbacks": {"new": pb_count("feedbacks", "(status='new')")},
    }

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "overview"
    try:
        cmds = {
            "overview": quick_overview,
            "orders": order_stats,
            "projects": project_stats,
            "activity": lambda: recent_activity(int(sys.argv[2]) if len(sys.argv)>2 else 20),
        }
        result = cmds[cmd]()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
