---
name: crm-core
description: CRM 知识中枢 — API 规范、状态机、schema、schema、工具索引。
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [crm, pocketbase, status-machines, api, schema]
---

# CRM 核心 Skill（业务知识中枢）

## 系统架构

```
D:/exportcrm/
├── .agents/
│   ├── call_api.py          ← 统一 API 入口（带 OpenAPI 校验）
│   ├── openapi.json         ← PocketBase schema（261KB，所有 collection）
│   ├── authenticate.py      ← 认证（支持 CRM_USER/CRM_PASS 自动登录）
│   ├── verify.py            ← 验证工具
│   ├── tools/               ← 业务工具
│   │   ├── advance_so_status.py
│   │   ├── advance_po_status.py
│   │   ├── advance_shipment_status.py
│   │   ├── quotation_to_so.py
│   │   ├── best_price.py / compare_prices.py
│   │   ├── search_all.py / customer_overview.py
│   │   ├── dashboard_summary.py
│   │   ├── payment_ops.py
│   │   ├── export_po.py / export_pi.py   ← 本地 Excel 生成
│   │   ├── send_email.py
│   │   ├── disk_ops.py
│   │   ├── pallet_packing.py            ← 托盘打包计算
│   │   └── ...                          ← 见下方工具索引
│   ├── skills/
│   │   ├── crm-excel/                   ← PI/PO Excel 生成技能
│   │   │   ├── SKILL.md                 ← 完整工作流（查DB→映射→调用工具→保存）
│   │   │   ├── scripts/
│   │   │   │   ├── excel_pi_generator.py
│   │   │   │   └── excel_po_generator.py
│   │   │   └── templates/
│   │   │       ├── PI-template.xlsx
│   │   │       └── PO-template.xlsx
│   └── skills/
│       ├── crm-auth/        ← 认证 skill
│       ├── crm-developer/   ← 开发 orchestration
│       ├── crm-workflow/    ← 状态推进 skill
│       ├── crm-packing/     ← 托盘打包 & 体积计算 skill
│       ├── crm-excel/       ← PI/PO Excel 文档生成 skill（含生成器脚本+模板）
│       └── crm-core/        ← 本 skill（业务知识中枢）
└── (Next.js 前端 + PocketBase 后端)
```

## 统一 API 调用：call_api.py

`call_api(method, endpoint, params={}, body={})`

```python
# CRUD
call_api("GET", "customers", params={"filter": "country=`US`"})
call_api("GET", "customers/RECORD_ID")
call_api("POST", "customers", body={"name": "ABC", "code": "C001"})
call_api("PATCH", "so/RECORD_ID", body={"status": "shipped"})
call_api("DELETE", "customers/RECORD_ID")

# 自定义 API 路由
call_api("GET", "api/disk/list", params={"path": "/Company/X"})
call_api("POST", "api/disk/upload", body={...})
call_api("GET", "api/po/PO_ID/export-excel")
```

**参数格式：**
- `endpoint`：`"customers"` / `"customers/RECORD_ID"` / `"api/xxx"`
- `params`：PocketBase query string dict（`perPage`, `sort`, `filter`, `expand`, `fields` 等）
- `body`：POST/PATCH 的 JSON body

**Filter 语法（PocketBase）：**
```python
# 字段类型前缀：str / int / float / date / bool / json
# 操作符：~(模糊), =(精确), !=, >, <, >=, <=, ?(包含), &&(且), ||(或)
params={"filter": "customer=`C001` && status=`active`"}
params={"filter": "name~`张` || name_cn~`张`"}
params={"filter": "country=`CN`", "sort": "-created", "perPage": "20"}
```

## 认证

环境变量优先级：
```bash
CRM_API_URL=http://42.194.150.84:8091
CRM_API_TOKEN=<pb_token>        # 直接 token（优先）
CRM_USER=271341794@qq.com       # 自动登录（备用 A）
CRM_PASS=xxx                    # 自动登录（备用 B）
CRM_SMTP_*                      # 邮件（可选）
```

`authenticate.py` 会自动处理：先找 `CRM_API_TOKEN`，无则用 `CRM_USER`+`CRM_PASS` 登录获取 token。

## 关键状态机（核心业务规则）

### 销售订单（SO）
```
draft → confirmed → in_production → ready_to_ship → shipped → delivered → completed
  ↓
cancelled (终态)
```
- `advance_so_status(id)`：自动推进一步，shipped 时记录 `estimated_shipping_date`
- `cancel_so(id)`：非终态 → cancelled
- `cancelled → draft`：重新激活

### 采购订单（PO）
```
draft → sent → confirmed → in_production → shipped → delivered → completed
  ↓
cancelled (终态)
```
- `advance_po_status(id)` / `cancel_po(id)`

### 发货（Shipments）
```
preparing → booking → customs_clearance → loaded → handed_over → shipped → in_transit → arrived → delivered
```
- `advance_shipment_status(id)`：
  - shipped → 记录 `actual_departure`
  - delivered → 记录 `actual_arrival`

## Collections（32 个业务实体）

| Collection | 说明 | 关键字段 |
|-----------|------|---------|
| `customers` | 客户 | name, name_cn, code, country, type |
| `customer_contacts` | 客户联系人 | customer(关联), name, email, is_primary |
| `customer_activities` | 客户活动 | customer, type, timestamp |
| `customer_tracking` | 客户跟踪 | customer, status, priority, owner |
| `suppliers` | 供应商 | name, name_cn, code, country, type |
| `supplier_contacts` | 供应商联系人 | supplier, name, email |
| `supplier_bank_accounts` | 供应商银行账户 | supplier, bank_name, account_number |
| `products` | 产品 | name, name_cn, code, part_number, category, unit |
| `product_categories` | 产品分类 | name, parent, sort |
| `product_costs` | 产品成本 | product, cost_price, currency, valid_from |
| `product_documents` | 产品文档 | product, name, file_path, file_type |
| `projects` | 项目 | name, name_cn, code, customer, stage, start_date, end_date |
| `products_projects` | 产品-项目关联 | project, product, quantity, notes |
| `quotations` | 报价单 | code, customer, customer_name, currency, total_amount, status, items, incoterm, port_of_loading, port_of_destination, payment_terms |
| `so` | 销售订单 | code, customer_name, currency, total_amount, status, items, quotation(关联), project, incoterm, port_of_loading, port_of_destination, payment_terms |
| `po` | 采购订单 | code, supplier, supplier_name, currency, total_amount, status, items, project, payment_terms |
| `shipments` | 发货 | code, so(关联), po(关联), status, port_of_loading, port_of_destination, actual_departure, actual_arrival |
| `order_payments` | 销售订单付款 | so(关联), amount, currency, method, status, approved_at, approved_by, rejection_reason |
| `po_payments` | 采购订单付款 | po(关联), amount, currency, method, status, approved_at, approved_by, rejection_reason |
| `payment_terms` | 付款条款 | name, code, days, description |
| `remittance` | 汇款 | so(关联), amount, currency, date, notes |
| `service_providers` | 服务商 | name, type, contact, country |
| `ports_of_loading` | 装货港 | name, code, country |
| `ports_of_destination` | 目的港 | name, code, country |
| `exchange_rate_cache` | 汇率缓存 | currency, rate, updated_at |
| `exchange_rate_history` | 汇率历史 | currency, rate, retrieved_at |
| `document_branding` | 文档品牌 | logo_url, primary_color, company_name |
| `app_config` | 应用配置 | key, value |
| `user_settings` | 用户设置 | user, key, value |
| `activity_logs` | 活动日志 | user, action, collection, record_id, data, created_at |
| `users` | 用户 | email, name, role |
| `company_info` | 公司信息 | name, address, phone, email, tax_id |

## 业务工具索引（tools/）

| 工具函数 | 文件 | 功能 | 核心逻辑 |
|---------|------|------|---------|
| `advance_so_status(id)` | advance_so_status.py | SO 状态推进 | 状态机映射，shipped 自动填日期 |
| `cancel_so(id)` | advance_so_status.py | 取消 SO | 非终态可取消 |
| `advance_po_status(id)` | advance_po_status.py | PO 状态推进 | draft→sent→confirmed→… |
| `cancel_po(id)` | advance_po_status.py | 取消 PO | 非终态可取消 |
| `advance_shipment_status(id)` | advance_shipment_status.py | 发货状态推进 | shipped→actual_departure, delivered→actual_arrival |
| `quotation_to_so(quotation_id)` | quotation_to_so.py | 报价转 SO | 复制 items JSON 并映射字段，SO status=draft |
| `best_price(product_id, qty)` | best_price.py | 最优供应商价格 | 调用 compare_prices，按 tier 匹配最低单价 |
| `compare_prices(product_id)` | compare_prices.py | 供应商价格对比 | 返回 tier 列表（minQty/maxQty/unitPrice） |
| `search_all(query)` | search_all.py | 全局搜索 | 在 customers/suppliers/products/projects/quotations/so/po/shipments 中模糊匹配 |
| `customer_overview(customer_id)` | customer_overview.py | 客户全景 | 聚合 contacts / projects / quotations / orders |
| `dashboard_summary()` | dashboard_summary.py | 业务仪表盘 | 统计各 collection 分布和总收入 |
| `approve_order_payment(id)` | payment_ops.py | 审批销售付款 | status→approved, 填 approved_at |
| `reject_order_payment(id, reason)` | payment_ops.py | 驳回销售付款 | status→rejected, 填 rejection_reason |
| `approve_po_payment(id)` | payment_ops.py | 审批采购付款 | 同上 |
| `reject_po_payment(id, reason)` | payment_ops.py | 驳回采购付款 | 同上 |
| `export_po(order)` | 见 skill `crm-excel` | 导出 PO Excel | 引入 ExcelPOGenerator 直接调用 |
| `export_pi(order)` | 见 skill `crm-excel` | 导出 PI Excel | 引入 ExcelPIGenerator 直接调用 |
| `send_email(to, subject, html_body)` | send_email.py | 发送邮件 | 走 CRM_SMTP_* 环境变量 |
| `send_quotation_email(...)` | send_email.py | 发送报价邮件 | 使用模板 |
| `disk_list(path)` | disk_ops.py | 查看 S3 文件 | api/disk/list |
| `disk_upload(local, s3_path)` | disk_ops.py | 上传到 S3 | base64 编码上传 |
| `disk_download(s3_path)` | disk_ops.py | 从 S3 下载 | base64 解码返回字节 |
| `disk_delete(path)` | disk_ops.py | 删除 S3 文件/目录 | api/disk/delete |
| `disk_folders()` | disk_ops.py | 获取目录树 | api/disk/folders |
| `disk_ensure_folder(path)` | disk_ops.py | 创建目录 | api/disk/ensure-folder |
| `PageAgentForm` | page_agent_bridge.py | 浏览器表单填充 & 用户确认 | Playwright + Page Agent CDN，打开 CRM 网页预填表单，用户预览后确认 |
| `preview_and_confirm(type, data)` | page_agent_bridge.py | 一键预览确认 | 打开浏览器 → 登录 → 填充 → 等用户确认 |
| `calc_packing(specs_text)` | pallet_packing.py | 托盘打包 & 体积计算 | 解析箱型规格 → 最优托盘混装 → 3D 可视化 |

