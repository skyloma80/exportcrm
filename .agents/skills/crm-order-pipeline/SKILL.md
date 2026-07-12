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

### 价格检查逻辑
- PO 有价格 → 直接使用，检查利润率
- PO 无价格 → 提示用户手动输入
- 利润率低于 10% → 提示用户确认
