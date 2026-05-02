# ExportCRM 数据库 Schema 文档

 

 

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
| supplier_id    | texy | ✓ |   suppliers | 关联供应商 |
| name | text(100) | ✓ | - | 姓名 |
| position | text(100) | - | - | 职位 |
| email | email | - | - | 邮箱 |
| phone | text(50) | - | - | 电话 |
| wechat | text(50) | - | - | 微信 |
| is_primary | bool | - | - | 是否主要联系人 |
| bank_info | json | - | - | 银行信息 |

 

 

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
| customer_id | text | ✓ |  → customers | 关联客户 |
| stage | select | ✓ | lead, inquiry, quotation, negotiation, won, lost, on_hold | 项目阶段 |
| probability | number | - | 0-100 | 成功概率 |
| expected_close_date | date | - | - | 预计结束日期 |
| description | text(2000) | - | - | 描述（英文） |
| description_cn | text(2000) | - | - | 描述（中文） |

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
| project_id | text | ✓ |  → projects | 关联项目 |
| status | select | ✓ | draft, sent, received, completed, cancelled | 状态 |
| deadline | date | - | - | 截止日期 |
| remarks | text(2000) | - | - | 备注 |
| attachments | json | - | - | 附件 |
|items|json|✓|-|明细|

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
|items|json|✓|-|明细|

---

 

 
 

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
|items|json|✓|-|明细|

---

 

---

### 2.3 订单管理 (Orders)

#### `orders` - 销售订单表

| 字段名 | 类型 | 必填 | 约束 | 说明 |
|--------|------|------|------|------|
| id | text | - | PK | 主键 |
| code | text(20) | ✓ | - | 订单号 |
| project | relation | - | FK → projects | 关联项目（可选） |
| customer | relation | - | FK → customers | 关联客户（可选） |
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
| created_by | text | - |   → users | 创建人 |
| updated_by | text | - |   → users | 更新人 |
| items|json|✓|-|明细|
 

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
|items|json|✓|-|明细|

---

 

 

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
|items|json|✓|-|明细|

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
|items|json|✓|-|明细|

 

 

 

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

 

---

 

 
 