---
name: crm-packing
description: 托盘打包计算 & 报关体积计算 — 根据产品包装数据和订单数量，自动计算最优托盘混装方案，生成 3D 可视化页面
version: 1.0.0
author: AlustarsCRM
---

# Pallet Packing / 托盘打包计算

## 触发条件

当用户需要：
- 计算一批货物需要多少个托盘
- 计算货物总体积（报关用 CBM）
- 优化托盘混装排布方案
- 预览 3D 托盘装箱图

## 数据来源

### 产品包装信息（products collection）

| 字段 | 类型 | 说明 |
|------|------|------|
| `pcs_per_carton` | number | 每箱件数 |
| `carton_dimensions` | json | 纸箱尺寸，格式 `{"length": 370, "width": 250, "height": 200}` |
| `carton_gross_weight` | number | 纸箱毛重 (kg) |

### 订单明细（items JSONB）

订单（SO/PO）的 items JSONB 中包含：
- `product` - 产品 ID
- `quantity` - 订购数量

## 工作流程

1. **获取订单数据**：从 SO 或 PO 的 items 中提取产品 ID 和数量
2. **检查包装信息**：查询对应产品的 `pcs_per_carton` 和 `carton_dimensions`
3. **计算箱数**：`carton_count = ceil(quantity / pcs_per_carton)`
4. **如果包装信息不完整**：询问用户纸箱尺寸（长×宽×高 mm）和箱数
5. **调用计算引擎**：
```python
from tools.pallet_packing import calc_packing

result = calc_packing("370,250,200,37;360,300,240,20")
# Returns:
# {
#   "pallet_count": 2,
#   "total_boxes": 57,
#   "pallets": [{"id": 1, "spec_name": "1200x1200", ...}],
#   "html_path": "/path/to/output/pallet_packing_3d.html"
# }
```
6. **反馈结果**：展示托盘数量、每托盘箱数、高度检查结果，并提供 3D 可视化页面链接

## 箱型规格格式

每条规格：`长度,宽度,高度,数量`（单位 mm）

支持的分隔符：
- 单箱型尺寸内：`,` `*` `x` `×`
- 多箱型间：`;` 或空格

示例：`370*250*200*37 360*300*240*20` 或 `370,250,200,37;360,300,240,20`

## 托盘规格

| 名称 | 尺寸 (L×W×H mm) | 可用高度 |
|------|-----------------|---------|
| 1200x1200 | 1200×1200×1600 | 1450mm |
| 1200x1000 | 1200×1000×1600 | 1450mm |
| 1200x800  | 1200×800×1600  | 1450mm |
| 1000x1000 | 1000×1000×1600 | 1450mm |

系统自动选择最优规格（优先装最多货，同货量选最小托盘）。

## 输出

- 控制台报告：托盘数、每托盘箱数、高度检查
- 3D 可视化 HTML 页面（支持鼠标旋转/缩放预览）
- 总体积 CBM（报关用）
