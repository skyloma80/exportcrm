# CRM Pallet Packing / 托盘打包技能

根据订单产品数据和包装信息，自动计算最优托盘装箱方案，生成 3D 可视化。

## Quick Start

```python
from tools.pallet_packing import calc_packing

# 直接输入箱型规格
result = calc_packing("370*250*200*37;360*300*240*20")
print(f"使用 {result['pallet_count']} 个托盘, 共 {result['total_boxes']} 箱")
print(f"3D 预览: {result['html_path']}")
```

## CLI

```bash
cd .agents/skills/crm-packing
python scripts/main.py 370,250,200,37 360,300,240,20
```

## 流程说明

1. 用户询问打包方案 → 从订单查询产品包装数据
2. 有 `pcs_per_carton` + `carton_dimensions` → 自动计算箱数
3. 缺少数据 → 询问用户纸箱尺寸和数量
4. 调用 `calc_packing()` → 返回结果 + 可视化 URL
