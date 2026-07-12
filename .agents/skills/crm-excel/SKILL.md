---
name: crm-excel
description: PI/PO Excel 文档生成 — 通过服务端 API（基于 ExcelJS 的 TS 服务）生成 Excel 文件
version: 3.0.0
author: AlustarsCRM
---

# CRM Excel 文档生成

> ⚠️ **唯一规范路径：服务端 API。** 本 skill 不提供任何本地脚本 / Python 生成器。
> Excel 的合并单元格、样式、Logo 均由服务端基于 ExcelJS 的 TS 服务处理，
> agent **禁止** 自行拼装或调用本地脚本生成 xlsx，否则会出现样式/合并错乱。

## 工作流程

PI/PO 的 Excel 生成只需两步，全部通过 API 完成。

### 1. 查询订单数据

从 PocketBase 获取 SO 或 PO 记录：

```python
from call_api import call_api

so = call_api("GET", "so/{record_id}")
po = call_api("GET", "po/{record_id}")
```

SO 关键字段：`id`, `code`, `customer_name`, `items`(JSON), `payment_terms`, `incoterm`, `port_of_loading`, `port_of_destination`, `country_of_origin`, `country_of_destination`, `total_amount`

PO 关键字段：`id`, `code`, `supplier_name`, `created`, `items`(JSON), `total_amount`, `payment_terms`

### 2. 调用服务端 API 生成 Excel

```python
from call_api import call_api

# PI 生成 - 调用服务端 API，返回 Excel 二进制内容
pi_response = call_api("GET", f"so/{so_id}/export-pi")

# PO 生成 - 调用服务端 API，返回 Excel 二进制内容
po_response = call_api("GET", f"po/{po_id}/export-excel")
```

### 3. 保存文件或发送邮件

```python
# 保存到本地
with open(f"PI-{so['code']}.xlsx", "wb") as f:
    f.write(pi_response)

# 或上传到 S3
from tools.disk_ops import disk_upload
disk_upload(f"/tmp/PI-{so['code']}.xlsx", f"/Documents/PI/PI-{so['code']}.xlsx")
```

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/so/{id}/export-pi` | GET | 生成 PI (Proforma Invoice) Excel |
| `GET /api/po/{id}/export-excel` | GET | 生成 PO (Purchase Order) Excel |

## 服务端实现（仅供了解，勿本地调用）

生成引擎是 Next.js 服务端的 TS 服务，仅可通过上述 API 访问：

- `lib/services/excel-pi-service.ts` — PI Excel 生成服务
- `lib/services/excel-po-service.ts` — PO Excel 生成服务
- `excel-template/PI-template.xlsx` — PI Excel 模板（仓库根目录）
- `excel-template/PO-template.xlsx` — PO Excel 模板（仓库根目录）

## 集成参考

`crm-order-pipeline` 中的 `pi_sender.py` 展示了实际使用示例——直接调用 API 生成 Excel 并发送邮件。
