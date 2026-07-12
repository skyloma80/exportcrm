---
name: crm-workflow
description: 工作流 — 订单状态推进、取消
version: 3.0.0
author: Hermes Agent
---

# CRM 工作流

```python
from tools.advance_so_status import advance_so_status, cancel_so
from tools.advance_po_status import advance_po_status, cancel_po
from tools.advance_shipment_status import advance_shipment_status
```

## 销售订单

```
draft → confirmed → in_production → ready_to_ship → shipped → delivered → completed
    ↘ cancelled ↗ (终态)
         ↘ draft (从 cancelled 重新激活)
```

`advance_so_status(id)` 自动推进一步，`cancel_so(id)` 取消。
`advance_so_status(id)` 在 shipped 时自动记录 `estimated_shipping_date`。

## 采购订单

```
draft → sent → confirmed → in_production → shipped → delivered → completed
    ↘ cancelled ↗ (终态)
```

## 发货

```
preparing → booking → customs_clearance → loaded → handed_over → shipped → in_transit → arrived → delivered
```

`advance_shipment_status(id)` 在 shipped 时自动记录 `actual_departure`，在 delivered 时记录 `actual_arrival`。
