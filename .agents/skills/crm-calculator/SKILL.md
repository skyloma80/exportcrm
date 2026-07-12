---
name: crm-calculator
description: 通用商务计算器 — 明细价计算、总价汇总、利润率、CBM体积、汇率转换
version: 1.0.0
author: AlustarsCRM
---

# 通用商务计算器

## 触发条件

当用户需要：
- 计算报价明细（数量×单价→小计→总计）
- 计算利润率（售价 vs 成本）
- 计算 CBM 体积（报关用）
- 汇率转换
- 加总多个金额

## 工作流程

### 明细计算
```python
from tools.crm_calculator import calc_line_items

items = [
    {"description": "Aluminum Panel A", "quantity": 100, "unit_price": 25.50},
    {"description": "Steel Bracket B", "quantity": 200, "unit_price": 3.80},
]
result = calc_line_items(items)
# → {"items": [...], "subtotal": 5310.00, "total": 5310.00}
```

### 利润率计算
```python
from tools.crm_calculator import calc_margin

margin = calc_margin(selling_price=25.50, cost_price=15.30)
# → {"profit": 10.20, "margin_percent": 40.0, "markup_percent": 66.7}
```

### CBM 体积
```python
from tools.crm_calculator import calc_cbm

result = calc_cbm(length_mm=620, width_mm=400, height_mm=300, quantity=50)
# → {"cbm_per_box": 0.0744, "total_cbm": 3.72}
```

### 汇率转换
```python
from tools.crm_calculator import calc_exchange

result = calc_exchange(5500, "USD", "EUR")
# → {"amount": 5500, "from": "USD", "to": "EUR", "rate": 0.92, "result": 5060.00}
```

## 数据来源

### 汇率数据
- 存储在 PocketBase `exchange_rate_cache` 和 `exchange_rate_history` 集合
- 通过 `crm-auth` 认证访问
- 手动维护或定期刷新

### 产品成本
- 查询 `product_costs` 集合获取供应商报价
- 使用 `best_price` 工具获取最低价

## 输出格式

所有计算结果以 JSON 格式返回，包含：
- 输入参数
- 计算结果
- 中间值（小计、税率等）
- 可选：HTML 报告
