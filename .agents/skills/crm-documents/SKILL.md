---
name: crm-documents
description: 文档数据提取与 DB 补全 — 从上传的 PI/PO 的 Excel/PDF 文件中提取客户、产品、价格信息，与数据库比对，自动补全
version: 1.0.0
author: AlustarsCRM
---

# 文档数据提取与 DB 补全

## 触发条件

当用户需要：
- 把上传的 PI/PO Excel 或 PDF 导入系统
- 文档中的客户/产品/价格与数据库核对
- 从 PDF 报价单中提取报价信息
- 检查文档数据与数据库是否一致

## 工作流程

### 1. 文件上传 → 解析
```python
from tools.document_import import import_document

result = import_document("/path/to/pi-2025.xlsx")
# → 解析结果 + 比对报告
```

### 2. 解析内容
支持的文件格式：
- Excel (.xlsx, .xls) → openpyxl
- PDF (.pdf) → pdfplumber (表格) + pypdf (文本后备)

### 3. 字段提取
从文件中提取的结构化字段：
- 文档类型 (PI / PO / Quotation / Invoice)
- 客户名称、地址、税号
- 产品明细（名称、数量、单价、总价）
- 币种、总金额、付款条件、交货条款
- 银行信息（PI 时）

### 4. 数据库比对
与以下集合比对：
- `customers` — 按名称模糊匹配
- `products` — 按 part_number 或名称匹配
- `suppliers` — PO 时按名称匹配
- `product_costs` — 价格比对

### 5. 用户确认 → 执行写入
- 展现比对差异报告
- 用户逐项确认
- 系统执行 `pb_create` / `pb_update`
- 记录到 `activity_logs`

## 依赖

首次使用自动安装：
```bash
pip install pdfplumber
```
