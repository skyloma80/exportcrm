"""
CRM AI Agent 对话行为规范 — 每个场景定义输入、工具序列、业务规则。

运行：python tests/test_agent_flows.py

不依赖 API 连接，纯粹作为 AI 行为约束文档。
"""
from __future__ import annotations

import sys
sys.path.insert(0, ".agents")

# ═══════════════════════════════════════════════════════════
# 对话流程场景
# ═══════════════════════════════════════════════════════════

SCENARIOS = [
    {
        "name": "修改客户字段",
        "input": "修改客户ABC Trading的评级为5",
        "steps": [
            ("tool", "GET customers", "filter=name~'ABC Trading'", "搜索客户（必须用 name~ 模糊匹配）"),
            ("user", "展示客户信息", "找到客户：ABC Trading (US, direct)，当前 rating=3。确认修改为5？[是/否]"),
            ("tool", "PATCH customers/{id}", "body={rating: 5}", "只传要修改的字段，不要传整个记录"),
            ("user", "返回结果", "已更新，ABC Trading 的 rating 现在是 5"),
        ],
        "rules": [
            "搜索客户必须用 name~（模糊匹配），不得用 code 精确匹配",
            "body 只传要修改的字段，不能传整个记录",
            "修改前必须展示当前值，等待用户确认",
        ],
    },
    {
        "name": "生成报价单（用户指定客户和产品）",
        "input": "给美国客户ABC Trading做一份LED灯报价单",
        "steps": [
            ("tool", "GET customers", "filter=name~'ABC Trading'", "搜索确认客户"),
            ("tool", "GET products", "filter=name~'LED'", "搜索产品"),
            ("tool", "GET product_costs", "filter=product='{pid}'&expand=supplier", "查供应商成本价"),
            ("calc", "计算售价", "unit_price = cost_price × (1 + profit_margin/100)"),
            ("user", "展示报价预览", "LED Light 100W × 100 = $50.00/件 → $5,000.00\n(成本 $40.00 + 利润 25%)\nFOB, 有效期30天\n确认创建？[是/否]"),
            ("tool", "POST quotations", "body={customer, project, items, ...}", "写入报价表"),
        ],
        "rules": [
            "用户指定了客户/产品时，直接 filter 搜索确认，不用再让用户从列表选",
            "必须先查成本价再报价，不得凭记忆报价",
            "报价单价不得低于成本价",
            "写入前必须展示完整预览：产品名、数量、单价、总金额、贸易术语、有效期",
            "总金额 = Σ(数量 × 单价)",
        ],
    },
    {
        "name": "生成报价单（无客户无产品）",
        "input": "做一份报价单",
        "steps": [
            ("tool", "GET customers", "perPage=5&sort=-created", "查最近客户列表（用户无指定时）"),
            ("user", "列出客户", "1. ABC Trading (US)\n2. XYZ Inc (US)\n请输入数字或客户名"),
            ("user", "用户选择", "[用户输入 1]"),
            ("tool", "GET products", "perPage=10", "列出产品库"),
            ("user", "列出产品", "1. LED Light 100W (参考成本$40)\n2. LED Strip 5m (参考成本$25)\n请输入 '编号×数量'，如 1×100"),
            ("user", "用户选择", "[用户输入 1×100]"),
            ("tool", "GET product_costs", "filter=product='{pid}'&expand=supplier", "查成本价"),
            ("calc", "计算报价", "成本 → 售价 → 总金额"),
            ("user", "展示预览，确认", "[同上]"),
            ("tool", "POST quotations", "body={...}", "写入报价表"),
        ],
        "rules": [
            "没有客户指定时，必须列出客户让用户选择，不能静默失败",
            "必须用编号选择或搜索，不能用'帮我选一个'替代",
            "没有指定产品时，列出产品库供选择",
            "报价前必须查成本价",
            "写入前必须用户确认",
        ],
    },
    {
        "name": "生成报价单（有询价记录）",
        "input": "处理最近的询价",
        "steps": [
            ("tool", "GET customer_tracking", "perPage=3&sort=-created", "查最近询价/跟踪记录"),
            ("user", "有记录", "找到最近询价：XXX 公司询问 LED Light（2026-06-28）"),
            ("tool", "GET products", "filter=name~'LED'", "查询价提到的产品"),
            ("tool", "GET product_costs", "filter=product='{pid}'&expand=supplier", "查成本"),
            ("calc", "生成报价", "自动关联客户和产品"),
            ("user", "展示预览，确认", "客户、产品已自动关联，确认报价？[是/否]"),
            ("tool", "POST quotations", "body={...}", "写入报价表"),
        ],
        "rules": [
            "查到询价记录时直接关联客户和产品，不再让用户重复选择",
            "如果没有询价记录，转入'无客户无产品'流程（列出客户）",
        ],
    },
    {
        "name": "复制销售订单",
        "input": "把SO-2026-0001复制一份",
        "steps": [
            ("tool", "GET so/RECORD_ID", "", "读取源订单"),
            ("tool", "POST so", "body={customer_name, currency, items, ...}", "创建新订单"),
        ],
        "rules": [
            "新订单 code 自动生成，不复制原 code",
            "新订单 status 固定为 draft",
            "复制 items、客户信息、价格条款等全部字段",
        ],
    },
    {
        "name": "推进订单状态",
        "input": "将订单SO-2026-0001推进到下一步",
        "steps": [
            ("tool", "GET so/RECORD_ID", "", "读当前状态"),
            ("user", "展示当前状态", "当前：in_production → 下一步：ready_to_ship。确认推进？[是/否]"),
            ("tool", "PATCH so/{id}", "body={status: 'ready_to_ship'}", "推进状态"),
        ],
        "rules": [
            "推进前必须展示当前和下一步状态让用户确认",
            "shipped 时自动记录 estimated_shipping_date",
            "cancelled 可重新激活为 draft",
            "completed/cancelled 为终态，不可再推进",
        ],
    },
    {
        "name": "审批/驳回收款",
        "input": "批准订单SO-2026-0001的定金收款",
        "steps": [
            ("tool", "GET order_payments", "filter=order='{so_id}'", "查该订单的收款记录"),
            ("user", "展示待审批记录", "找到定金 ¥2,500.00 (pending)，确认批准？[是/否]"),
            ("tool", "PATCH order_payments/{id}", "body={status: 'approved', approved_at: today}", "审批通过"),
        ],
        "rules": [
            "必须先查询并展示待审批记录给用户",
            "必须确认是定金/进度款/尾款，不能模糊处理",
            "审批自动记录 approved_at 日期",
            "驳回必须有理由（rejection_reason）",
        ],
    },
    {
        "name": "报价转订单",
        "input": "把报价Q-2026-0001转为订单",
        "steps": [
            ("tool", "GET quotations/RECORD_ID", "", "读取报价"),
            ("calc", "映射字段", "quotation items → so items 格式转换", ""),
            ("tool", "POST so", "body={...}", "创建 SO"),
        ],
        "rules": [
            "要求报价状态为 sent 或 accepted",
            "items 字段映射：product_id→part_number, product_name→product_name, 等",
            "新 SO status=draft",
            "保留关联：so.quotation = quotation.id",
            "保留项目关联：so.project = quotation.project",
        ],
    },
]

# ═══════════════════════════════════════════════════════════
# 业务规则验证
# ═══════════════════════════════════════════════════════════

def _test_price_calc():
    cost = 40.0
    margin = 25
    unit_price = round(cost * (1 + margin / 100), 2)
    amount = 100 * unit_price
    assert unit_price == 50.00
    assert amount == 5000.00
    assert margin > 0
    print(f"  ✓ 成本${cost}+利润{margin}%=售价${unit_price}, 100pcs=${amount}")


def _test_item_structure():
    item = {
        "product_name": "LED Light", "quantity": 100, "unit": "pcs",
        "unit_price": 50.00, "amount": 5000.00, "cost_price": 40.00,
    }
    assert item["amount"] == item["quantity"] * item["unit_price"]
    for f in ["product_name", "quantity", "unit", "unit_price", "amount"]:
        assert f in item
    print(f"  ✓ items 结构验证通过 ({len(item)} 字段)")


# ═══════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 66)
    print("  CRM AI Agent 对话行为规范")
    print("=" * 66)

    print("\n── 业务规则 ──")
    _test_price_calc()
    _test_item_structure()

    print("\n── 对话场景规范 ──")
    for s in SCENARIOS:
        print(f"\n  ╔═ {s['name']}")
        print(f"  ║ 输入: \"{s['input']}\"")
        print(f"  ║")
        for step in s["steps"]:
            typ, label = step[0], step[1]
            detail = step[2] if len(step) > 2 else ""
            note = step[3] if len(step) > 3 else ""
            icon = {"tool": "→", "user": "▶", "calc": "⚙"}.get(typ, "·")
            line = f"{label}"
            if detail:
                line += f" ({detail})"
            if note:
                line += f"  ← {note}"
            print(f"  ║  {icon} {line}")
        print(f"  ║")
        for r in s["rules"]:
            print(f"  ║  约束: {r}")
        print(f"  ╚═")

    print(f"\n{'=' * 66}")
    print(f"  共 {len(SCENARIOS)} 个场景, 2 条规则验证")
    print(f"{'=' * 66}")
