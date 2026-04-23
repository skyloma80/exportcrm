# ExportCRM 数据库 Schema 文档

基于 PocketBase 的 Migration 文件整理

**生成日期**: 2026-03-29

---

## 目录

1. [核心业务实体](#1-核心业务实体)
2. [销售管理](#2-销售管理)
3. [采购管理](#3-采购管理)
4. [物流与报关](#4-物流与报关)
5. [财务管理](#5-财务管理)
6. [系统与配置](#6-系统与配置)
7. [客户关系管理](#7-客户关系管理)

---

## 1. 核心业务实体

### 1.1 客户管理 (Customers)

#### `customers` - 客户表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 客户代码 |
| name | text(200) | ✓ | - | 客户名称（英文） |
| name_cn | text(200) | - | - | 客户名称（中文） |
| country | text | ✓ | - | 国家 |
| type | select | ✓ | direct, agent, distributor | 客户类型 |
| rating | number | - | 1-5 | 评级 |
| preferred_currency | text(3) | - | - | 首选货币 |
| address | text(500) | - | - | 地址（英文） |
| address_cn | text(500) | - | - | 地址（中文） |
| website | url | - | - | 网站 |
| remarks | text(2000) | - | - | 备注 |
| tax_id | text(50) | - | - | 税号 |

**访问规则**:
- listRule: `@request.auth.id != ''`
- viewRule: `@request.auth.id != ''`
- createRule: `@request.auth.id != ''`
- updateRule: `@request.auth.id != ''`
- deleteRule: `@request.auth.id != ''`

---

#### `customer_contacts` - 客户联系人表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| customer | relation | ✓ | FK → customers | 关联客户 |
| name | text(100) | ✓ | - | 姓名 |
| position | text(100) | - | - | 职位 |
| email | email | - | - | 邮箱 |
| phone | text(50) | - | - | 电话 |
| wechat | text(50) | - | - | 微信 |
| is_primary | bool | - | - | 是否主要联系人 |

**访问规则**: 需登录用户

---

### 1.2 供应商管理 (Suppliers)

#### `suppliers` - 供应商表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 供应商代码 |
| name | text(200) | ✓ | - | 供应商名称（英文） |
| name_cn | text(200) | - | - | 供应商名称（中文） |
| country | text(2) | ✓ | - | 国家代码 |
| type | select | ✓ | manufacturer, trader, agent | 供应商类型 |
| rating | number | - | 1-5 | 评级 |
| address | text(500) | - | - | 地址（英文） |
| address_cn | text(500) | - | - | 地址（中文） |
| capabilities | json | - | - | 能力列表 |
| certifications | json | - | - | 认证列表 |
| remarks | text(2000) | - | - | 备注 |

---

#### `supplier_contacts` - 供应商联系人表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| name | text(100) | ✓ | - | 姓名 |
| position | text(100) | - | - | 职位 |
| email | email | - | - | 邮箱 |
| phone | text(50) | - | - | 电话 |
| wechat | text(50) | - | - | 微信 |
| is_primary | bool | - | - | 是否主要联系人 |

---

#### `supplier_bank_accounts` - 供应商银行账户表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| bank_name | text(200) | ✓ | - | 银行名称 |
| account_name | text(200) | ✓ | - | 账户名称 |
| account_number | text(50) | ✓ | - | 账号 |
| swift_code | text(20) | - | - | SWIFT 代码 |
| currency | text(3) | - | - | 货币 |
| is_default | bool | - | - | 是否默认账户 |

---

### 1.3 产品管理 (Products)

#### `product_categories` - 产品分类表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | text | - | PK |
| name | text(100) | ✓ | 分类名称（英文） |
| name_cn | text(100) | - | 分类名称（中文） |
| sort_order | number | - | 排序 |

---

#### `products` - 产品表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 产品代码 |
| part_number | text(50) | - | - | 零件编号 |
| name | text(200) | ✓ | - | 产品名称（英文） |
| name_cn | text(200) | - | - | 产品名称（中文） |
| description | text(2000) | - | - | 描述（英文） |
| description_cn | text(2000) | - | - | 描述（中文） |
| category | relation | - | FK → product_categories | 分类 |
| unit | text(10) | ✓ | - | 单位 |
| hs_code | text(20) | - | - | HS 编码 |
| specifications | json | - | - | 规格参数 |
| pcs_per_carton | number | - | min: 1 | 每箱件数 |
| carton_dimensions | json | - | - | 纸箱尺寸 |
| carton_gross_weight | number | - | min: 0 | 纸箱毛重 |
| carton_net_weight | number | - | min: 0 | 纸箱净重 |

---

#### `product_molds` - 产品模具表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 模具代码 |
| product | relation | ✓ | FK → products | 关联产品 |
| type | select | ✓ | die_casting, stamping, injection, cnc_fixture, forging, extrusion | 模具类型 |
| cost | number | ✓ | min: 0 | 成本 |
| status | select | ✓ | new, in_use, maintenance, retired | 状态 |
| lifespan | number | - | - | 寿命（次数） |
| current_usage | number | - | - | 当前使用次数 |
| supplier | text(200) | - | - | 供应商 |
| delivery_days | number | - | - | 交付天数 |

---

#### `product_documents` - 产品文档表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| product | relation | ✓ | FK → products | 关联产品 |
| type | select | ✓ | drawing, photo, specification, inspection, certification, sample_approval, other | 文档类型 |
| name | text(200) | ✓ | - | 文档名称 |
| file_path | text(500) | ✓ | - | 文件路径 |
| file_size | number | - | - | 文件大小 |
| remarks | text(500) | - | - | 备注 |

---

### 1.4 项目管理 (Projects)

#### `projects` - 项目表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 项目代码 |
| name | text(200) | ✓ | - | 项目名称（英文） |
| name_cn | text(200) | - | - | 项目名称（中文） |
| customer | relation | ✓ | FK → customers | 关联客户 |
| stage | select | ✓ | lead, inquiry, quotation, negotiation, won, lost, on_hold | 项目阶段 |
| probability | number | - | 0-100 | 成功概率 |
| expected_close_date | date | - | - | 预计结束日期 |
| description | text(2000) | - | - | 描述（英文） |
| description_cn | text(2000) | - | - | 描述（中文） |

---

#### `products_projects` - 产品 - 项目关联表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| product | relation | ✓ | FK → products | 关联产品 |
| project | relation | ✓ | FK → projects | 关联项目 |
| usage_note | text(500) | - | - | 使用说明 |

---

### 1.5 汇率管理 (Exchange Rates)

#### `exchange_rate_cache` - 汇率缓存表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| base_currency | text(3) | ✓ | pattern: ^[A-Z]{3}$ | 基础货币 |
| target_currency | text(3) | ✓ | - | 目标货币 |
| rate | number | ✓ | min: 0 | 汇率 |
| source | text(50) | - | - | 来源 |
| fetched_at | date | ✓ | - | 获取时间 |

**访问规则**: 公开读写，仅登录用户可删除

---

#### `exchange_rate_history` - 汇率历史表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| date | date | ✓ | - | 日期 |
| base_currency | text(3) | ✓ | pattern: ^[A-Z]{3}$ | 基础货币 |
| target_currency | text(3) | ✓ | pattern: ^[A-Z]{3}$ | 目标货币 |
| rate | number | ✓ | min: 0 | 汇率 |
| source | text(50) | - | - | 来源 |

---

## 2. 销售管理

### 2.1 询价管理 (RFQ - Request for Quotation)

#### `rfqs` - 询价单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 询价单号 |
| project | relation | ✓ | FK → projects | 关联项目 |
| status | select | ✓ | draft, sent, received, completed, cancelled | 状态 |
| deadline | date | - | - | 截止日期 |
| remarks | text(2000) | - | - | 备注 |
| attachments | json | - | - | 附件 |

---

#### `rfq_items` - 询价明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| rfq | relation | ✓ | FK → rfqs | 关联询价单 |
| product | relation | ✓ | FK → products | 关联产品 |
| quantity | number | ✓ | min: 1 | 数量 |
| target_price | number | - | min: 0 | 目标价格 |
| remarks | text(500) | - | - | 备注 |

---

#### `rfq_suppliers` - 询价供应商表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| rfq | relation | ✓ | FK → rfqs | 关联询价单 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| status | select | ✓ | pending, sent, received, selected, rejected | 状态 |
| sent_at | date | - | - | 发送时间 |
| received_at | date | - | - | 接收时间 |

---

#### `rfq_quotations` - 供应商报价表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| rfq | relation | ✓ | FK → rfqs | 关联询价单 |
| rfq_item | relation | ✓ | FK → rfq_items | 关联询价明细 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| unit_price | number | ✓ | min: 0 | 单价 |
| moq | number | - | min: 1 | 最小起订量 |
| lead_time_days | number | - | min: 0 | 交期天数 |
| valid_until | date | - | - | 有效期至 |
| remarks | text(500) | - | - | 备注 |

---

#### `rfq_mold_quotations` - 供应商模具报价表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| rfq | relation | ✓ | FK → rfqs | 关联询价单 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| mold_type | select | ✓ | die_casting, stamping, injection, cnc_fixture, forging, extrusion | 模具类型 |
| cost | number | ✓ | min: 0 | 成本 |
| lead_time_days | number | - | min: 0 | 交期天数 |
| lifespan | number | - | - | 寿命 |

---

### 2.2 报价管理 (Quotations)

#### `quotations` - 报价单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 报价单号 |
| project | relation | ✓ | FK → projects | 关联项目 |
| customer | relation | ✓ | FK → customers | 关联客户 |
| version | number | ✓ | min: 1 | 版本号 |
| status | select | ✓ | draft, sent, accepted, rejected, expired, revised | 状态 |
| incoterm | text(3) | ✓ | - | 国际贸易术语 |
| port_of_loading | text(100) | - | - | 装运港 |
| port_of_destination | text(100) | - | - | 目的港 |
| payment_terms | text(200) | - | - | 付款条款 |
| validity_days | number | ✓ | min: 1 | 有效天数 |
| global_profit_margin | number | - | 0-100 | 全局利润率 |
| currency | text(3) | ✓ | - | 货币 |
| exchange_rate | number | - | min: 0 | 汇率 |
| total_amount | number | ✓ | min: 0 | 总金额 |
| sent_at | date | - | - | 发送时间 |

---

#### `quotation_items` - 报价明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| quotation | relation | ✓ | FK → quotations | 关联报价单 |
| product | relation | ✓ | FK → products | 关联产品 |
| quantity | number | ✓ | min: 1 | 数量 |
| cost_price | number | ✓ | min: 0 | 成本价 |
| profit_margin | number | ✓ | 0-100 | 利润率 |
| unit_price | number | ✓ | min: 0 | 单价 |
| amount | number | ✓ | min: 0 | 金额 |
| remarks | text(500) | - | - | 备注 |

---

### 2.3 订单管理 (Orders)

#### `orders` - 销售订单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 订单号 |
| project | relation | ✓ | FK → projects | 关联项目 |
| customer | relation | ✓ | FK → customers | 关联客户 |
| quotation | relation | - | FK → quotations | 关联报价 |
| customer_po | text(100) | - | - | 客户采购订单号 |
| vendor_code | text(100) | - | - | 供应商代码 |
| status | select | ✓ | draft, confirmed, in_production, ready_to_ship, shipped, delivered, completed, cancelled | 状态 |
| incoterm | text(3) | ✓ | - | 贸易术语 |
| port_of_loading | text(100) | - | - | 装运港 |
| port_of_destination | text(100) | - | - | 目的港 |
| payment_terms | text(200) | - | - | 付款条款 |
| currency | text(3) | ✓ | - | 货币 |
| exchange_rate | number | - | min: 0 | 汇率 |
| total_amount | number | ✓ | min: 0 | 总金额 |
| paid_amount | number | - | min: 0 | 已付金额 |
| expected_delivery_date | date | - | - | 预计交货日期 |
| shipping_marks | text(2000) | - | - | 唛头 |
| remarks | text(2000) | - | - | 备注 |
| country_of_origin | text(2) | - | - | 原产国 |
| country_of_destination | text(2) | - | - | 目的国 |
| mode_of_shipment | select | - | Sea, Air, Land, Express | 运输方式 |
| estimated_shipping_date | date | - | - | 预计发货日期 |
| bank_info | text(2000) | - | - | 银行信息 |
| created_by | relation | - | FK → users | 创建人 |
| updated_by | relation | - | FK → users | 更新人 |

**访问规则**:
- deleteRule: `@request.auth.id = created_by && status = 'draft'` (仅创建者可删除草稿订单)

---

#### `order_items` - 订单明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| order | relation | ✓ | FK → orders | 关联订单 |
| product | relation | ✓ | FK → products | 关联产品 |
| quantity | number | ✓ | min: 1 | 数量 |
| unit_price | number | ✓ | min: 0 | 单价 |
| amount | number | ✓ | min: 0 | 金额 |
| shipped_quantity | number | - | min: 0 | 已发货数量 |

---

#### `order_mold_items` - 订单模具明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| order | relation | ✓ | FK → orders | 关联订单 |
| mold_type | select | ✓ | die_casting, stamping, injection, cnc_fixture, forging, extrusion | 模具类型 |
| cost | number | ✓ | min: 0 | 成本 |
| charge_method | select | ✓ | one_time, amortized, first_order_free | 收费方式 |
| ownership | select | ✓ | customer, supplier, shared | 所有权 |

---

#### `order_payments` - 订单收款表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| order | relation | ✓ | FK → orders | 关联订单 |
| type | select | ✓ | deposit, progress, final | 收款类型 |
| amount | number | ✓ | min: 0 | 金额 |
| currency | text(3) | ✓ | - | 货币 |
| payment_method | text(50) | - | - | 付款方式 |
| payment_date | date | ✓ | - | 付款日期 |
| bank_reference | text(100) | - | - | 银行参考号 |
| receipt_file | text(500) | - | - | 收据文件路径 |
| status | select | ✓ | pending, approved, rejected | 状态 |
| approved_by | text(100) | - | - | 批准人 |
| approved_at | date | - | - | 批准时间 |
| rejection_reason | text(500) | - | - | 拒绝原因 |

---

#### `order_templates` - 订单模板表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | text | - | PK |
| name | text(100) | ✓ | 模板名称 |
| customer | relation | - | FK → customers |
| template_data | json | ✓ | 模板数据 |

---

## 3. 采购管理

### 3.1 采购订单 (Purchase Orders)

#### `purchase_orders` - 采购订单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 采购订单号 |
| project | relation | - | FK → projects | 关联项目 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| order | relation | - | FK → orders | 关联销售订单 |
| rfq | relation | - | FK → rfqs | 关联询价单 |
| status | select | ✓ | draft, sent, confirmed, in_production, shipped, delivered, completed, cancelled | 状态 |
| currency | text(3) | ✓ | - | 货币 |
| total_amount | number | ✓ | min: 0 | 总金额 |
| paid_amount | number | - | min: 0 | 已付金额 |
| expected_delivery_date | date | - | - | 预计交货日期 |

---

#### `purchase_order_items` - 采购明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| purchase_order | relation | ✓ | FK → purchase_orders | 关联采购订单 |
| product | relation | ✓ | FK → products | 关联产品 |
| quantity | number | ✓ | min: 1 | 数量 |
| unit_price | number | ✓ | min: 0 | 单价 |
| amount | number | ✓ | min: 0 | 金额 |
| received_quantity | number | - | min: 0 | 已收货数量 |
| rfq_quotation | relation | - | FK → rfq_quotations | 关联报价 |
| lead_time_days | number | - | min: 0 | 交期天数 |

---

#### `purchase_order_mold_items` - 采购模具明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| purchase_order | relation | ✓ | FK → purchase_orders | 关联采购订单 |
| mold_type | select | ✓ | die_casting, stamping, injection, cnc_fixture, forging, extrusion | 模具类型 |
| description | text(500) | - | - | 描述 |
| cost | number | ✓ | min: 0 | 成本 |
| charge_method | select | ✓ | one_time, amortized, first_order_free | 收费方式 |
| ownership | select | ✓ | customer, supplier, shared | 所有权 |
| remarks | text(1000) | - | - | 备注 |

---

### 3.2 采购付款 (PO Payments)

#### `po_payments` - 采购付款表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| purchase_order | relation | ✓ | FK → purchase_orders | 关联采购订单 |
| type | select | ✓ | deposit, progress, final | 付款类型 |
| amount | number | ✓ | min: 0 | 金额 |
| currency | text(3) | ✓ | - | 货币 |
| payment_method | text(50) | - | - | 付款方式 |
| payment_date | date | ✓ | - | 付款日期 |
| bank_reference | text(100) | - | - | 银行参考号 |
| receipt_file | file | - | max: 10MB | 收据文件 |
| status | select | ✓ | pending, approved, rejected | 状态 |
| approved_by | text(100) | - | - | 批准人 |
| approved_at | date | - | - | 批准时间 |
| rejection_reason | text(500) | - | - | 拒绝原因 |
| remarks | text(1000) | - | - | 备注 |

---

## 4. 物流与报关

### 4.1 发票管理 (Invoices)

#### `proforma_invoices` - 形式发票表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 发票号 |
| order | relation | ✓ | FK → orders | 关联订单 |
| version | number | ✓ | min: 1 | 版本号 |
| status | select | ✓ | draft, sent, confirmed, revised, cancelled | 状态 |
| issue_date | date | ✓ | - | 开票日期 |
| valid_until | date | - | - | 有效期至 |
| currency | text(3) | ✓ | - | 货币 |
| total_amount | number | ✓ | min: 0 | 总金额 |
| bank_account | json | - | - | 银行账户 |
| sent_at | date | - | - | 发送时间 |
| confirmed_at | date | - | - | 确认时间 |

---

#### `commercial_invoices` - 商业发票表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 发票号 |
| order | relation | ✓ | FK → orders | 关联订单 |
| shipment | text(50) | - | - | 关联发货 |
| issue_date | date | ✓ | - | 开票日期 |
| currency | text(3) | ✓ | - | 货币 |
| total_amount | number | ✓ | min: 0 | 总金额 |

---

### 4.2 发货管理 (Shipments)

#### `shipments` - 发货表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 发货单号 |
| order | relation | ✓ | FK → orders | 关联订单 |
| status | select | ✓ | preparing, booking, customs_clearance, loaded, handed_over, shipped, in_transit, arrived, delivered | 状态 |
| shipping_method | text(50) | ✓ | - | 运输方式 |
| carrier | text(100) | - | - | 承运商 |
| vessel_name | text(100) | - | - | 船名 |
| voyage_number | text(50) | - | - | 航次 |
| container_number | text(50) | - | - | 集装箱号 |
| container_type | text(10) | - | - | 集装箱类型 |
| bl_number | text(50) | - | - | 提单号 |
| etd | date | - | - | 预计离港日期 |
| eta | date | - | - | 预计到港日期 |
| actual_departure | date | - | - | 实际出发日期 |
| actual_arrival | date | - | - | 实际到达日期 |

---

#### `shipment_items` - 发货明细表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| shipment | relation | ✓ | FK → shipments | 关联发货 |
| order_item | relation | ✓ | FK → order_items | 关联订单项 |
| quantity | number | ✓ | min: 1 | 数量 |
| packages | number | - | min: 0 | 件数 |
| gross_weight | number | - | min: 0 | 毛重 |
| net_weight | number | - | min: 0 | 净重 |
| volume | number | - | min: 0 | 体积 |

---

### 4.3 报关管理 (Customs)

#### `customs_clearance` - 报关记录表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| order | relation | ✓ | FK → orders | 关联订单 |
| shipment | relation | - | FK → shipments | 关联发货 |
| status | select | ✓ | draft, submitted, reviewing, inspecting, released | 状态 |
| declaration_number | text(50) | - | - | 报关单号 |
| customs_district | text(50) | - | - | 关区 |
| port | text(100) | - | - | 口岸 |
| customs_broker | text(100) | - | - | 报关行 |
| submitted_at | date | - | - | 申报时间 |
| released_at | date | - | - | 放行时间 |
| tax_id | text(500) | - | - | 税号 |

---

#### `customs_declarations` - 报关单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| customs_clearance | relation | ✓ | FK → customs_clearance | 关联报关记录 |
| declaration_number | text(50) | ✓ | - | 报关单号 |
| declaration_date | date | ✓ | - | 申报日期 |
| total_amount | number | ✓ | min: 0 | 总金额 |
| currency | text(3) | ✓ | - | 货币 |

---

#### `customs_declaration_items` - 报关商品表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| declaration | relation | ✓ | FK → customs_declarations | 关联报关单 |
| hs_code | text(20) | ✓ | - | HS 编码 |
| product_name | text(200) | ✓ | - | 商品名称 |
| quantity | number | ✓ | min: 0 | 数量 |
| unit | text(10) | ✓ | - | 单位 |
| unit_price | number | ✓ | min: 0 | 单价 |
| amount | number | ✓ | min: 0 | 金额 |

---

#### `customs_fees` - 报关费用表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| customs_clearance | relation | ✓ | FK → customs_clearance | 关联报关记录 |
| fee_type | select | ✓ | duty, inspection, agency, storage, other | 费用类型 |
| description | text(200) | - | - | 描述 |
| amount | number | ✓ | min: 0 | 金额 |
| currency | text(3) | ✓ | - | 货币 |

---

## 5. 财务管理

### 5.1 银行账户

#### `bank_accounts` - 公司银行账户表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | text | - | PK |
| name | text(100) | ✓ | 账户名称 |
| content | text(2000) | ✓ | 账户内容 |
| is_default | bool | - | 是否默认 |

---

### 5.2 项目成本

#### `project_cost_tables` - 项目成本表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 成本表编号 |
| project | relation | ✓ | FK → projects | 关联项目 |
| status | select | ✓ | draft, confirmed | 状态 |
| currency | text(3) | ✓ | - | 货币 |
| total_amount | number | ✓ | min: 0 | 总金额 |

---

#### `project_cost_table_items` - 成本表明细

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| cost_table | relation | ✓ | FK → project_cost_tables | 关联成本表 |
| product | relation | ✓ | FK → products | 关联产品 |
| supplier | relation | ✓ | FK → suppliers | 关联供应商 |
| rfq_quotation | relation | - | FK → rfq_quotations | 关联报价 |
| quantity | number | ✓ | min: 1 | 数量 |
| unit_price | number | ✓ | min: 0 | 单价 |
| amount | number | ✓ | min: 0 | 金额 |
| lead_time_days | number | - | min: 0, noDecimal | 交期天数 |

---

## 6. 系统与配置

### 6.1 代码序列

#### `code_sequences` - 代码序列计数器表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| prefix | text(1-10) | ✓ | pattern: ^[A-Z]+$ | 前缀（大写字母） |
| year | number | ✓ | 2020-2100 | 年份 |
| current_sequence | number | ✓ | 0-99999 | 当前序列号 |

**用途**: 生成业务代码，格式：`{PREFIX}-{YYYY}-{XXXX}`
**示例**: `C-2025-0001`, `RFQ-2025-0001`

---

### 6.2 用户设置

#### `user_settings` - 用户设置表

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | text | - | PK |
| user_id | text | ✓ | 用户 ID |
| smtp_host | text | - | SMTP 服务器 |
| smtp_port | number | - | SMTP 端口 |
| smtp_user | text | - | SMTP 用户 |
| smtp_pass | text | - | SMTP 密码 |
| smtp_from | text | - | SMTP 发件人 |
| smtp_secure | bool | - | SMTP 加密 |
| rfq_email_company_name | text | - | RFQ 邮件公司名 |
| rfq_email_subject | text | - | RFQ 邮件主题 |
| rfq_email_greeting | text | - | RFQ 邮件问候 |
| rfq_email_intro | text | - | RFQ 邮件介绍 |
| rfq_email_closing | text | - | RFQ 邮件结尾 |
| rfq_email_signature | text | - | RFQ 邮件签名 |
| rfq_email_footer | text | - | RFQ 邮件页脚 |
| language | text | - | 语言 |
| timezone | text | - | 时区 |
| currency | text | - | 货币 |

---

### 6.3 应用配置

#### `app_config` - 应用配置表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| key | text(100) | ✓ | - | 配置键 |
| value | json | ✓ | - | 配置值 |
| category | text(50) | - | - | 分类 |
| description | text(500) | - | - | 描述（英文） |
| description_cn | text(500) | - | - | 描述（中文） |

---

### 6.4 AI 配置

#### `ai_configs` - AI 配置表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| provider | select | ✓ | openai, anthropic, azure, custom | 提供商 |
| model | text(100) | ✓ | - | 模型名称 |
| api_key | text(500) | ✓ | - | API 密钥 |
| api_endpoint | url | - | - | API 端点 |
| is_active | bool | - | - | 是否启用 |
| settings | json | - | - | 设置 |
| description | text(500) | - | - | 描述 |

---

### 6.5 任务管理

#### `tasks` - 任务表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| title | text(200) | ✓ | - | 标题 |
| description | text(2000) | - | - | 描述 |
| status | select | ✓ | pending, in_progress, completed, cancelled | 状态 |
| priority | select | ✓ | low, medium, high, urgent | 优先级 |
| due_date | date | - | - | 截止日期 |
| assignee | relation | - | FK → users | 负责人 |
| related_type | text(50) | - | - | 关联类型 |
| related_id | text(50) | - | - | 关联 ID |
| completed_at | date | - | - | 完成时间 |

---

### 6.6 活动日志

#### `activity_logs` - 活动日志表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| user | relation | - | FK → users | 用户 |
| action | select | ✓ | create, update, delete, view, export, import, login, logout, other | 操作类型 |
| entity_type | text(50) | ✓ | - | 实体类型 |
| entity_id | text(50) | - | - | 实体 ID |
| entity_name | text(200) | - | - | 实体名称 |
| details | json | - | - | 详情 |
| ip_address | text(50) | - | - | IP 地址 |
| user_agent | text(500) | - | - | 用户代理 |

**访问规则**:
- updateRule: `null` (不可更新)
- deleteRule: `null` (不可删除)

---

### 6.7 用户反馈

#### `feedbacks` - 用户反馈表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| user | relation | ✓ | FK → users | 用户 |
| type | select | ✓ | bug, feature, improvement, other | 反馈类型 |
| title | text(200) | - | - | 标题 |
| description | text(5000) | ✓ | - | 描述 |
| screenshots | json | - | - | 截图 |
| status | select | ✓ | new, in_review, planned, in_progress, completed, declined | 状态 |
| admin_response | text(2000) | - | - | 管理员回复 |
| responded_by | relation | - | FK → users | 回复人 |
| responded_at | date | - | - | 回复时间 |

---

### 6.8 服务提供商

#### `service_providers` - 服务提供商表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(50) | ✓ | - | 代码 |
| name | text(200) | ✓ | - | 名称（英文） |
| name_cn | text(200) | - | - | 名称（中文） |
| type | select | ✓ | freight_forwarder, customs_broker, shipping_line, trucking, warehouse, inspection, insurance, other | 服务类型 |
| country | text(100) | - | - | 国家 |
| city | text(100) | - | - | 城市 |
| address | text(500) | - | - | 地址（英文） |
| address_cn | text(500) | - | - | 地址（中文） |
| contact_name | text(100) | - | - | 联系人 |
| contact_phone | text(50) | - | - | 联系电话 |
| contact_email | email | - | - | 联系邮箱 |
| contact_wechat | text(50) | - | - | 联系微信 |
| services | json | - | - | 服务列表 |
| rating | number | - | 0-5 | 评级 |
| is_active | bool | - | - | 是否启用 |
| remarks | text(2000) | - | - | 备注 |

---

## 7. 客户关系管理

### 7.1 客户跟踪

#### `customer_tracking` - 客户跟踪表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| customer_id | relation | ✓ | FK → customers | 关联客户 |
| status | select | - | Active, Lead, Follow-up, Onboarded | 状态 |
| priority | select | - | Low, Medium, High | 优先级 |
| contact_status | select | - | Contacted, Replied, No Reply | 联系状态 |
| next_action_icon | select | - | event, schedule, warning, check_circle, calendar, clock, alert_triangle, check | 下一步图标 |
| next_action_text | text(200) | - | - | 下一步说明 |
| next_step_action | text(100) | - | - | 下一步行动 |
| next_step_date | date | - | - | 下一步日期 |
| notes | text(2000) | - | - | 备注 |
| created_by | relation | - | FK → users | 创建人 |
| updated_by | relation | - | FK → users | 更新人 |

---

### 7.2 客户活动历史

#### `customer_activities` - 客户活动表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| customer_tracking_id | relation | ✓ | FK → customer_tracking | 关联客户跟踪 |
| user | text(100) | - | - | 用户 |
| description | text(500) | ✓ | - | 描述 |
| timestamp | date | ✓ | - | 时间戳 |
| is_recent | bool | - | - | 是否最近 |
| created_by | relation | - | FK → users | 创建人 |
| updated_by | relation | - | FK → users | 更新人 |

**级联删除**: 当关联的 customer_tracking 删除时，活动记录级联删除

---

## 附录

### A. 权限规则说明

所有集合使用 PocketBase 的权限规则系统：

| 规则类型 | 说明 | 常见值 |
|----------|------|---------|
| listRule | 控制列表访问 | `@request.auth.id != ''` |
| viewRule | 控制详情查看 | `@request.auth.id != ''` |
| createRule | 控制创建权限 | `@request.auth.id != ''` |
| updateRule | 控制更新权限 | `@request.auth.id != ''` 或 `null` |
| deleteRule | 控制删除权限 | `@request.auth.id != ''` 或 `null` |

特殊规则示例:
- `orders.deleteRule`: `@request.auth.id = created_by && status = 'draft'` - 仅创建者可删除草稿订单
- `activity_logs.updateRule`: `null` - 日志不可更新
- `exchange_rate_cache.listRule`: `` (空) - 公开访问

### B. 关系字段说明

- `relation` 类型字段通过 `collectionId` 关联其他集合
- `maxSelect: 1` 表示一对一关系
- `cascadeDelete: true` 表示级联删除
- 默认 `collectionId: "_pb_users_auth_"` 表示关联 PocketBase 默认用户表

### C. Select 字段枚举值汇总

| 集合 | 字段 | 枚举值 |
|------|------|--------|
| customers | type | direct, agent, distributor |
| suppliers | type | manufacturer, trader, agent |
| projects | stage | lead, inquiry, quotation, negotiation, won, lost, on_hold |
| product_molds | type | die_casting, stamping, injection, cnc_fixture, forging, extrusion |
| product_molds | status | new, in_use, maintenance, retired |
| product_documents | type | drawing, photo, specification, inspection, certification, sample_approval, other |
| rfqs | status | draft, sent, received, completed, cancelled |
| rfq_suppliers | status | pending, sent, received, selected, rejected |
| quotations | status | draft, sent, accepted, rejected, expired, revised |
| orders | status | draft, confirmed, in_production, ready_to_ship, shipped, delivered, completed, cancelled |
| orders | mode_of_shipment | Sea, Air, Land, Express |
| order_payments | type | deposit, progress, final |
| order_payments | status | pending, approved, rejected |
| purchase_orders | status | draft, sent, confirmed, in_production, shipped, delivered, completed, cancelled |
| po_payments | type | deposit, progress, final |
| po_payments | status | pending, approved, rejected |
| shipments | status | preparing, booking, customs_clearance, loaded, handed_over, shipped, in_transit, arrived, delivered |
| customs_clearance | status | draft, submitted, reviewing, inspecting, released |
| customs_fees | fee_type | duty, inspection, agency, storage, other |
| tasks | status | pending, in_progress, completed, cancelled |
| tasks | priority | low, medium, high, urgent |
| activity_logs | action | create, update, delete, view, export, import, login, logout, other |
| feedbacks | type | bug, feature, improvement, other |
| feedbacks | status | new, in_review, planned, in_progress, completed, declined |
| service_providers | type | freight_forwarder, customs_broker, shipping_line, trucking, warehouse, inspection, insurance, other |
| customer_tracking | status | Active, Lead, Follow-up, Onboarded |
| customer_tracking | priority | Low, Medium, High |
| customer_tracking | contact_status | Contacted, Replied, No Reply |
| ai_configs | provider | openai, anthropic, azure, custom |

### D. 数据精度说明

根据系统要求：
- **单价 (unit_price)**: 保留 4 位小数
- **金额 (amount)**: 保留 2 位小数
- **汇率 (exchange_rate)**: 根据实际业务需求
- **利润率 (profit_margin)**: 百分比，0-100

### E. 集合数量统计

| 分类 | 集合数量 |
|------|----------|
| 核心业务实体 | 15 |
| 销售管理 | 9 |
| 采购管理 | 5 |
| 物流与报关 | 8 |
| 财务管理 | 4 |
| 系统与配置 | 8 |
| 客户关系管理 | 2 |
| **总计** | **51** |

---

**文档版本**: 1.0
**最后更新**: 2026-03-29
**数据来源**: PocketBase Migration Files (001-031)
