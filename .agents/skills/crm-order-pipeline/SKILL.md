---
name: crm-order-pipeline
description: PO→SO→PI 端到端流水线 — 从客户 PO 触发，检查价格、创建 SO、生成 PI、发送邮件
version: 1.0.0
author: AlustarsCRM
---

# PO→SO→PI 流水线

## 触发条件

当用户需要：
- 把客户 PO 转成销售订单
- 从 PO 生成 PI 发给客户
- 检查 PO 中的产品价格
- 批量处理多个 PO

## 工作流程

### 完整流程
```python
from tools.order_pipeline import process_po_flow

result = process_po_flow(po_id="xxx", project_id="yyy")
# → {"so_id": "...", "pi_file": "...", "email_sent": true}
```

### 步骤分解

#### 1. 分析 PO
检查 PO 中每个产品：
- 是否有价格
- 产品是否在数据库中
- 利润率是否合理

```python
from tools.order_pipeline import analyze_po

analysis = analyze_po(po_id="xxx")
# → {"all_priced": True, "items_analysis": [...], "can_proceed_to_so": True}
```

#### 2. 创建 SO
```python
from tools.order_pipeline import create_so_from_po

so = create_so_from_po(po_id="xxx", project_id="yyy")
# → {"so_id": "...", "so_code": "SO-001", "total_amount": 5500.00}
```

#### 3. 生成并发送 PI
```python
from tools.order_pipeline import generate_and_send_pi

pi = generate_and_send_pi(so_id="xxx", email_to="customer@example.com")
# → {"pi_file": "/path/to/pi.xlsx", "email_sent_to": "customer@example.com"}
```

## Page Agent 浏览器模式（需用户确认的操作用此模式）

对于**新建 SO、新建报价、生成 PI 前预览**等需要用户确认的操作，可以使用 Page Agent 打开浏览器，在 CRM Web UI 中预填表单，让用户预览后手动提交。

### 架构
```
AI Agent (OpenCode)
  └─ Python: page_agent_bridge.py
       └─ Playwright → 打开浏览器
            └─ 注入 Page Agent CDN
                 └─ 导航到 CRM 页面 → 自动填充表单
                      └─ 用户预览确认 → 手动提交
```

### 一键预览确认
```python
from tools.page_agent_bridge import preview_and_confirm

# 创建 SO 前让用户预览
preview_and_confirm(
    form_type="so",
    form_data={
        "customer_name": "ABC Corp",
        "currency": "USD",
        "items": [
            {"product_name": "Product A", "quantity": 100, "unit_price": 25},
            {"product_name": "Product B", "quantity": 50, "unit_price": 60},
        ],
        "total_amount": 5500.00,
    }
)
```

### 精细控制（登录 → 导航 → 填充 → 等确认）
```python
from tools.page_agent_bridge import PageAgentForm

with PageAgentForm(headless=False) as pa:
    # 1. 登录 CRM
    pa.login()

    # 2. 导航到新建 SO 页面
    pa.navigate("/so/new")

    # 3. 填充表单
    pa.fill_new_so_form({
        "customer_name": "ABC Corp",
        "currency": "USD",
        "incoterm": "FOB Shanghai",
        "items": [{"product_name": "Product A", "quantity": 100, "unit_price": 25}],
    })

    # 4. 等待用户确认
    pa.wait_for_user("请核对 SO 信息，确认后点击提交")
```

### 与现有 API 流程配合

在 `process_po_flow` 中加入 `browser_mode=True` 使用浏览器模式：
```python
# API 模式（无用户确认）
result = process_po_flow(po_id="xxx")

# 浏览器模式（打开页面让用户确认）
from tools.page_agent_bridge import preview_and_confirm
from tools.order_pipeline import analyze_po

analysis = analyze_po("xxx")
if analysis.get("can_proceed_to_so"):
    preview_and_confirm("so", analysis["so_preview"])
    # 用户确认后，再调用 API 创建
    from tools.order_pipeline import create_so_from_po
    so = create_so_from_po("xxx")
```

### 适用场景

| 操作 | 推荐模式 | 原因 |
|------|---------|------|
| 查询数据、状态推进 | API 直连 | 快，无需用户介入 |
| **新建 SO / PO / 报价** | **Page Agent 浏览器** | 用户需要确认金额、条款 |
| **PI 生成前预览** | **Page Agent 浏览器** | 用户需要检查格式和内容 |
| 批量导入、简单更新 | API 直连 | 效率优先 |

### 价格检查逻辑
- PO 有价格 → 直接使用，检查利润率
- PO 无价格 → 提示用户手动输入
- 利润率低于 10% → 提示用户确认
