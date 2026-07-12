# AlustarsCRM PocketBase Database Schema (星铝)

> 自动生成的完整数据库结构文档 — 基于 `pb_migrations/`、种子数据和服务代码综合分析

---

## 总览

- **数据库引擎：** PocketBase v0.39.4 (SQLite)
- **活跃集合数：** 32



## 活跃集合


### 1. `exchange_rate_cache` — 汇率缓存

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `base_currency` | text | 是 | min:3, max:3, pattern:`^[A-Z]{3}$` | 基础货币（如 USD） |
| `target_currency` | text | 是 | min:3, max:3 | 目标货币（如 CNY） |
| `rate` | number | 是 | min:0 | 汇率值 |
| `source` | text | 否 | max:50 | 数据来源 |
| `fetched_at` | date | 是 | — | 获取时间 |

---

### 2. `exchange_rate_history` — 汇率历史

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `date` | date | 是 | — | 日期 |
| `base_currency` | text | 是 | min:3, max:3, pattern:`^[A-Z]{3}$` | 基础货币 |
| `target_currency` | text | 是 | min:3, max:3, pattern:`^[A-Z]{3}$` | 目标货币 |
| `rate` | number | 是 | min:0 | 历史汇率 |
| `source` | text | 否 | max:50 | 数据来源 |

---

### 3. `customers` — 客户主数据

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 客户编码 |
| `name` | text | 是 | max:200 | 客户名称（英文） |
| `name_cn` | text | 否 | max:200 | 客户名称（中文） |
| `country` | text | 是 | — | 国家 |
| `type` | select | 是 | `direct`, `agent`, `distributor` | 客户类型 |
| `rating` | number | 否 | min:1, max:5 | 评分 |
| `preferred_currency` | text | 否 | min:3, max:3 | 偏好货币 |
| `address` | text | 否 | max:500 | 地址（英文） |
| `address_cn` | text | 否 | max:500 | 地址（中文） |
| `website` | url | 否 | — | 网站 |
| `remarks` | text | 否 | max:2000 | 备注 |
| `tax_id` | text | 否 | max:50 | 税号/VAT |
| `supplier_id` | text | 否 | max:100 | 在客户系统的供应商编码 |

---

### 4. `customer_contacts` — 客户联系人

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `customer` | relation→customers | 是 | cascadeDelete | 所属客户 |
| `name` | text | 是 | max:100 | 联系人姓名 |
| `position` | text | 否 | max:100 | 职位 |
| `email` | email | 否 | — | 邮箱 |
| `phone` | text | 否 | max:50 | 电话 |
| `wechat` | text | 否 | max:50 | 微信 |
| `is_primary` | bool | 否 | — | 默认联系人 |

---

### 5. `suppliers` — 供应商主数据

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 供应商编码 |
| `name` | text | 是 | max:200 | 供应商名称（英文） |
| `name_cn` | text | 否 | max:200 | 供应商名称（中文） |
| `country` | text | 是 | min:2, max:2 | 国家代码（ISO 两位） |
| `type` | select | 是 | `manufacturer`, `trader`, `agent` | 供应商类型 |
| `rating` | number | 否 | min:1, max:5 | 评分 |
| `address` | text | 否 | max:500 | 地址（英文） |
| `address_cn` | text | 否 | max:500 | 地址（中文） |
| `capabilities` | json | 否 | — | 能力列表 |
| `certifications` | json | 否 | — | 认证列表 |
| `remarks` | text | 否 | max:2000 | 备注 |

---

### 6. `supplier_contacts` — 供应商联系人

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `supplier` | relation→suppliers | 是 | cascadeDelete | 所属供应商 |
| `name` | text | 是 | max:100 | 联系人姓名 |
| `position` | text | 否 | max:100 | 职位 |
| `email` | email | 否 | — | 邮箱 |
| `phone` | text | 否 | max:50 | 电话 |
| `wechat` | text | 否 | max:50 | 微信 |
| `is_primary` | bool | 否 | — | 默认联系人 |

---

### 7. `supplier_bank_accounts` — 供应商银行账户

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `supplier` | relation→suppliers | 是 | cascadeDelete | 所属供应商 |
| `bank_name` | text | 是 | max:200 | 银行名称 |
| `account_name` | text | 是 | max:200 | 账户名 |
| `account_number` | text | 是 | max:50 | 账号 |
| `swift_code` | text | 否 | max:20 | SWIFT/BIC 代码 |
| `currency` | text | 否 | min:3, max:3 | 货币 |
| `is_default` | bool | 否 | — | 默认账户 |

---

### 8. `product_categories` — 产品分类

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `name` | text | 是 | max:100 | 分类名称（英文） |
| `name_cn` | text | 否 | max:100 | 分类名称（中文） |
| `sort_order` | number | 否 | — | 排序值 |

---

### 9. `products` — 产品目录

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 产品编码 |
| `part_number` | text | 否 | max:50 | 型号/零件号 |
| `name` | text | 是 | max:200 | 产品名称（英文） |
| `name_cn` | text | 否 | max:200 | 产品名称（中文） |
| `description` | text | 否 | max:2000 | 描述（英文） |
| `description_cn` | text | 否 | max:2000 | 描述（中文） |
| `category` | relation→product_categories | 否 | — | 产品分类 |
| `unit` | text | 是 | max:10 | 计量单位 |
| `hs_code` | text | 否 | max:20 | HS 编码 |
| `specifications` | json | 否 | — | 规格参数 |
| `pcs_per_carton` | number | 否 | min:1 | 每箱件数 |
| `carton_dimensions` | json | 否 | — | 外箱尺寸（L×W×H） |
| `carton_gross_weight` | number | 否 | min:0 | 外箱毛重 |
| `carton_net_weight` | number | 否 | min:0 | 外箱净重 |
| `purchase_price_notes` | text | 否 | max:2000 | 采购价格备注 |

---

### 10. `product_documents` — 产品文档

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `product` | relation→products | 是 | cascadeDelete | 所属产品 |
| `type` | select | 是 | `drawing`, `photo`, `specification`, `inspection`, `certification`, `sample_approval`, `other` | 文档类型 |
| `name` | text | 是 | max:200 | 文档名称 |
| `file_path` | text | 是 | max:500 | 文件路径 |
| `file_size` | number | 否 | — | 文件大小（字节） |
| `remarks` | text | 否 | max:500 | 备注 |

---

### 11. `projects` — 项目管理

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 项目编码 |
| `name` | text | 是 | max:200 | 项目名称（英文） |
| `name_cn` | text | 否 | max:200 | 项目名称（中文） |
| `customer` | relation→customers | 是 | — | 所属客户 |
| `stage` | select | 是 | `lead`, `inquiry`, `quotation`, `negotiation`, `won`, `lost`, `on_hold` | 项目阶段 |
| `probability` | number | 否 | min:0, max:100 | 赢单概率（%） |
| `expected_close_date` | date | 否 | — | 预计关闭日期 |
| `description` | text | 否 | max:2000 | 描述（英文） |
| `description_cn` | text | 否 | max:2000 | 描述（中文） |

---

### 12. `products_projects` — 产品-项目关联表

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `product` | relation→products | 是 | — | 产品 |
| `project` | relation→projects | 是 | cascadeDelete | 项目 |
| `usage_note` | text | 否 | max:500 | 用途说明 |

---

### 13. `quotations` — 客户报价单（PI，items 为 JSONB）

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 报价单号 |
| `project` | relation→projects | 是 | — | 关联项目 |
| `customer` | relation→customers | 是 | — | 客户 |
| `version` | number | 是 | min:1 | 版本号 |
| `status` | select | 是 | `draft`, `sent`, `accepted`, `rejected`, `expired`, `revised` | 状态 |
| `incoterm` | text | 是 | min:3, max:3 | 贸易术语 |
| `port_of_loading` | text | 否 | max:100 | 起运港 |
| `port_of_destination` | text | 否 | max:100 | 目的港 |
| `payment_terms` | text | 否 | max:200 | 付款条件 |
| `validity_days` | number | 是 | min:1 | 有效期（天） |
| `global_profit_margin` | number | 否 | min:0, max:100 | 全局利润率 |
| `currency` | text | 是 | min:3, max:3 | 货币 |
| `exchange_rate` | number | 否 | min:0 | 汇率 |
| `total_amount` | number | 是 | min:0 | 总金额 |
| `sent_at` | date | 否 | — | 发送时间 |
| `items` | json | 否 | — | 行项目 JSON 数组，每项字段：`id`(string) 标识, `product_id`(string) 产品ID, `product_name`(string) 产品名, `part_number`(string?) 型号, `description_en`(string?) 英文描述, `description_cn`(string?) 中文描述, `quantity`(number) 数量, `unit`(string) 单位, `unit_price`(number) 单价, `amount`(number) 金额, `cost_price`(number) 成本价, `profit_margin`(number) 利润率%, `remarks`(string?) 备注 |

---

### 14. `proforma_invoices` — 形式发票（PI）

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | max:20 | PI 编号 |
| `order` | relation→orders（旧） | 是 | — | 关联订单 |
| `version` | number | 是 | min:1 | 版本 |
| `status` | select | 是 | `draft`, `sent`, `confirmed`, `revised`, `cancelled` | 状态 |
| `issue_date` | date | 是 | — | 签发日期 |
| `valid_until` | date | 否 | — | 有效期 |
| `currency` | text | 是 | min:3, max:3 | 货币 |
| `total_amount` | number | 是 | min:0 | 总金额 |
| `bank_account` | json | 否 | — | 银行账户信息 |
| `sent_at` | date | 否 | — | 发送时间 |
| `confirmed_at` | date | 否 | — | 确认时间 |

---

### 15. `order_payments` — 销售订单收款

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `order` | relation→so | 是 | cascadeDelete | 关联销售订单 |
| `type` | select | 是 | `deposit`, `progress`, `final` | 付款类型 |
| `amount` | number | 是 | min:0 | 金额 |
| `currency` | text | 是 | min:3, max:3 | 货币 |
| `payment_method` | text | 否 | max:50 | 付款方式 |
| `payment_date` | date | 是 | — | 付款日期 |
| `bank_reference` | text | 否 | max:100 | 银行参考号 |
| `receipt_file` | text | 否 | max:500 | 收据文件路径 |
| `status` | select | 是 | `pending`, `approved`, `rejected` | 状态 |
| `approved_by` | text | 否 | max:100 | 审批人 |
| `approved_at` | date | 否 | — | 审批时间 |
| `rejection_reason` | text | 否 | max:500 | 驳回原因 |

---

### 16. `shipments` — 发货管理（items 为 JSONB）

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 发货单号 |
| `order` | relation→so | 是 | cascadeDelete | 关联订单 |
| `status` | select | 是 | `preparing`, `booking`, `customs_clearance`, `loaded`, `handed_over`, `shipped`, `in_transit`, `arrived`, `delivered` | 状态 |
| `shipping_method` | text | 是 | max:50 | 运输方式 |
| `carrier` | text | 否 | max:100 | 承运商 |
| `vessel_name` | text | 否 | max:100 | 船名 |
| `voyage_number` | text | 否 | max:50 | 航次 |
| `container_number` | text | 否 | max:50 | 集装箱号 |
| `container_type` | text | 否 | max:10 | 集装箱类型 |
| `bl_number` | text | 否 | max:50 | 提单号 |
| `etd` | date | 否 | — | 预计离港 |
| `eta` | date | 否 | — | 预计到港 |
| `actual_departure` | date | 否 | — | 实际离港 |
| `actual_arrival` | date | 否 | — | 实际到港 |
| `items` | json | 否 | — | 发货商品 JSON 数组，每项字段：`id`(string) 标识, `order_item`(string) 订单行项ID, `part_number`(string?) 型号, `product_code`(string?) 产品编码, `product_name`(string?) 产品名, `quantity`(number) 数量, `packages`(number?) 件数, `gross_weight`(number?) 毛重kg, `net_weight`(number?) 净重kg, `volume`(number?) 体积m³, `package_length`(number?) 包装长cm, `package_width`(number?) 包装宽cm, `package_height`(number?) 包装高cm |

---

### 17. `user_settings` — 用户设置

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `user_id` | text | 是 | — | 用户 ID |
| `smtp_host` | text | 否 | — | SMTP 服务器 |
| `smtp_port` | number | 否 | — | SMTP 端口 |
| `smtp_user` | text | 否 | — | SMTP 用户名 |
| `smtp_pass` | text | 否 | — | SMTP 密码 |
| `smtp_from` | text | 否 | — | SMTP 发件地址 |
| `smtp_secure` | bool | 否 | — | SMTP SSL/TLS |
| `rfq_email_company_name` | text | 否 | — | RFQ 邮件公司名 |
| `rfq_email_subject` | text | 否 | — | RFQ 邮件主题 |
| `rfq_email_greeting` | text | 否 | — | RFQ 邮件问候语 |
| `rfq_email_intro` | text | 否 | — | RFQ 邮件介绍 |
| `rfq_email_closing` | text | 否 | — | RFQ 邮件结束语 |
| `rfq_email_signature` | text | 否 | — | RFQ 邮件签名 |
| `rfq_email_footer` | text | 否 | — | RFQ 邮件页脚 |
| `language` | text | 否 | — | 语言 |
| `timezone` | text | 否 | — | 时区 |
| `currency` | text | 否 | — | 默认货币 |

---

### 18. `app_config` — 应用配置

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `key` | text | 是 | max:100 | 配置键 |
| `value` | json | 是 | — | 配置值 |
| `category` | text | 否 | max:50 | 分类 |
| `description` | text | 否 | max:500 | 说明（英文） |
| `description_cn` | text | 否 | max:500 | 说明（中文） |

---

### 19. `service_providers` — 服务提供商

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | max:50 | 服务商编码 |
| `name` | text | 是 | max:200 | 名称（英文） |
| `name_cn` | text | 否 | max:200 | 名称（中文） |
| `type` | select | 是 | `freight_forwarder`, `customs_broker`, `shipping_line`, `trucking`, `warehouse`, `inspection`, `insurance`, `other` | 服务类型 |
| `country` | text | 否 | max:100 | 国家 |
| `city` | text | 否 | max:100 | 城市 |
| `address` | text | 否 | max:500 | 地址（英文） |
| `address_cn` | text | 否 | max:500 | 地址（中文） |
| `contact_name` | text | 否 | max:100 | 联系人 |
| `contact_phone` | text | 否 | max:50 | 联系电话 |
| `contact_email` | email | 否 | — | 联系邮箱 |
| `contact_wechat` | text | 否 | max:50 | 微信 |
| `services` | json | 否 | — | 服务列表 |
| `rating` | number | 否 | min:0, max:5 | 评分 |
| `is_active` | bool | 否 | — | 启用状态 |
| `remarks` | text | 否 | max:2000 | 备注 |

---

### 20. `activity_logs` — 操作审计日志

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `user` | relation→users | 否 | — | 操作用户 |
| `action` | select | 是 | `create`, `update`, `delete`, `view`, `export`, `import`, `login`, `logout`, `other` | 操作类型 |
| `entity_type` | text | 是 | max:50 | 实体类型（集合名） |
| `entity_id` | text | 否 | max:50 | 实体记录 ID |
| `entity_name` | text | 否 | max:200 | 实体显示名称 |
| `details` | json | 否 | — | 操作详情 |
| `ip_address` | text | 否 | max:50 | 客户端 IP |
| `user_agent` | text | 否 | max:500 | User Agent |

---


### 21. `po_payments` — 采购订单付款

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `purchase_order` | relation→po | 是 | cascadeDelete | 关联采购订单 |
| `type` | select | 是 | `deposit`, `progress`, `final` | 付款类型 |
| `amount` | number | 是 | min:0 | 金额 |
| `currency` | text | 是 | min:3, max:3 | 货币 |
| `payment_method` | text | 否 | max:50 | 付款方式 |
| `payment_date` | date | 是 | — | 付款日期 |
| `bank_reference` | text | 否 | max:100 | 银行参考号 |
| `receipt_file` | file | 否 | maxSize:10MB | 收据文件 |
| `status` | select | 是 | `pending`, `approved`, `rejected` | 状态 |
| `approved_by` | text | 否 | max:100 | 审批人 |
| `approved_at` | date | 否 | — | 审批时间 |
| `rejection_reason` | text | 否 | max:500 | 驳回原因 |
| `remarks` | text | 否 | max:1000 | 备注 |

---

### 22. `customer_tracking` — 客户跟踪

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `customer_id` | relation→customers | 是 | — | 客户 |
| `status` | select | 否 | `Active`, `Lead`, `Follow-up`, `Onboarded` | 跟踪状态 |
| `priority` | select | 否 | `Low`, `Medium`, `High` | 优先级 |
| `contact_status` | select | 否 | `Contacted`, `Replied`, `No Reply` | 联系状态 |
| `next_action_icon` | select | 否 | `event`, `schedule`, `warning`, `check_circle`, `calendar`, `clock`, `alert_triangle`, `check` | 下一步操作图标 |
| `next_action_text` | text | 否 | max:200 | 下一步操作描述 |
| `next_step_action` | text | 否 | max:100 | 下一步操作动作 |
| `next_step_date` | date | 否 | — | 下一步操作日期 |
| `notes` | text | 否 | max:2000 | 备注 |
| `created_by` | relation→users | 否 | — | 创建人 |
| `updated_by` | relation→users | 否 | — | 更新人 |

---

### 23. `customer_activities` — 客户活动记录

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `customer_tracking_id` | relation→customer_tracking | 是 | cascadeDelete | 所属跟踪记录 |
| `user` | text | 否 | max:100 | 用户名（文本） |
| `description` | text | 是 | max:500 | 活动描述 |
| `timestamp` | date | 是 | — | 活动时间 |
| `is_recent` | bool | 否 | — | 是否近期活动 |
| `created_by` | relation→users | 否 | — | 创建人 |
| `updated_by` | relation→users | 否 | — | 更新人 |

---

### 24. `remittance` — 汇款指令模板

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `name` | text | 是 | max:100 | 模板名称 |
| `items` | json | 否 | JSON schema: string[] | 汇款指令行（字符串数组，每行为一条指令） |
| `is_default` | bool | 否 | — | 默认模板 |

---

### 25. `po` — 采购订单（扁平 JSONB）

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | PO 编号 |
| `supplier_id` | text | 否 | — | 供应商 ID（文本） |
| `supplier_name` | text | 是 | — | 供应商名称 |
| `currency` | text | 是 | — | 货币 |
| `expected_delivery_date` | date | 否 | — | 预计交货日期 |
| `remarks` | text | 否 | — | 备注 |
| `total_amount` | number | 否 | min:0 | 总金额 |
| `status` | select | 是 | `draft`, `sent`, `confirmed`, `in_production`, `shipped`, `delivered`, `completed`, `cancelled` | 状态 |
| `items` | json | 否 | — | 行项目 JSON 数组，每项字段：`id`(string?) 标识, `part_number`(string?) 型号, `product_name`(string?) 产品名, `product_code`(string?) 产品编码, `description_en`(string?) 英文描述, `description_cn`(string?) 中文描述, `unit`(string?) 单位, `quantity`(number) 数量, `unit_price`(number) 单价, `amount`(number) 金额 |

---

### 26. `so` — 销售订单（扁平 JSONB）

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | — | 销售订单号 |
| `customer_id` | text | 否 | — | 客户 ID（文本） |
| `customer_name` | text | 是 | — | 客户名称 |
| `customer_address` | text | 否 | — | 客户地址 |
| `customer_tax_id` | text | 否 | — | 客户税号 |
| `customer_po` | text | 否 | — | 客户 PO 号 |
| `vendor_code` | text | 否 | — | 在本公司的供应商编码 |
| `currency` | text | 是 | — | 货币 |
| `incoterm` | text | 否 | — | 贸易术语 |
| `port_of_loading` | text | 否 | — | 起运港 |
| `port_of_destination` | text | 否 | — | 目的港 |
| `payment_terms` | text | 否 | — | 付款条件 |
| `bank_info` | text | 否 | — | 银行信息 |
| `country_of_origin` | text | 否 | — | 原产国 |
| `country_of_destination` | text | 否 | — | 目的国 |
| `mode_of_shipment` | text | 否 | — | 运输方式 |
| `shipping_marks` | text | 否 | — | 唛头 |
| `expected_delivery_date` | date | 否 | — | 预计交货日期 |
| `estimated_shipping_date` | date | 否 | — | 预计发货日期 |
| `remarks` | text | 否 | — | 备注 |
| `total_amount` | number | 否 | — | 总金额 |
| `status` | select | 是 | `draft`, `confirmed`, `in_production`, `ready_to_ship`, `shipped`, `delivered`, `completed`, `cancelled` | 订单状态 |
| `items` | json | 否 | — | 行项目 JSON 数组，每项字段：`id`(string) 标识, `part_number`(string) 型号, `product_name`(string) 产品名, `description_en`(string?) 英文描述, `description_cn`(string?) 中文描述, `quantity`(number) 数量, `unit`(string) 单位, `unit_price`(number) 单价, `amount`(number) 金额, `cost_price`(number?) 成本价 |
| `quotation` | relation→quotations | 否 | — | 来源报价单 |
| `project_id` | relation→projects | 否 | — | 关联项目 |

---

### 27. `ports_of_destination` — 目的港口主数据

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | max:20 | 港口代码 |
| `name` | text | 是 | max:200 | 港口名称（英文） |
| `name_cn` | text | 否 | max:200 | 港口名称（中文） |
| `sort_order` | number | 否 | — | 排序 |
| `is_active` | bool | 否 | — | 启用状态 |

---

### 28. `ports_of_loading` — 起运港口主数据

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | max:20 | 港口代码 |
| `name` | text | 是 | max:200 | 港口名称（英文） |
| `name_cn` | text | 否 | max:200 | 港口名称（中文） |
| `sort_order` | number | 否 | — | 排序 |
| `is_active` | bool | 否 | — | 启用状态 |

---

### 29. `payment_terms` — 付款条件主数据

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `code` | text | 是 | max:20 | 条件代码 |
| `name` | text | 是 | max:300 | 条件描述（英文） |
| `name_cn` | text | 否 | max:300 | 条件描述（中文） |
| `sort_order` | number | 否 | — | 排序 |
| `is_active` | bool | 否 | — | 启用状态 |

---

### 30. `document_branding` — 文档品牌配置

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `company_name` | text | 否 | max:500 | 公司名称 |
| `company_name_cn` | text | 否 | max:500 | 公司名称（中文） |
| `website_url` | text | 否 | max:500 | 网站 |
| `vat` | text | 否 | max:100 | VAT 税号 |
| `logo_base64` | json | 否 | — | Logo（base64） |
| `logo_url` | text | 否 | max:1000 | Logo URL |
| `stamp_base64` | json | 否 | — | 公章（base64） |
| `signature_base64` | json | 否 | — | 签名（base64） |
| `logo_path` | text | 否 | max:1000 | Logo 文件路径 |
| `stamp_path` | text | 否 | max:1000 | 公章文件路径 |
| `primary_office` | json | 否 | — | 主要办公信息 |
| `secondary_office` | json | 否 | — | 次要办公信息 |
| `default_signer` | json | 否 | — | 默认签署人 |

---

### 31. `company_info` — 公司基本信息

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `company_name` | text | 否 | max:500 | 公司名称 |
| `company_name_cn` | text | 否 | max:500 | 公司名称（中文） |
| `address` | text | 否 | max:1000 | 地址 |
| `email` | email | 否 | — | 邮箱 |
| `phone` | text | 否 | max:100 | 电话 |
| `website` | text | 否 | max:500 | 网站 |

---

### 32. `product_costs` — 产品供应商价格

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `product` | relation→products | 是 | — | 产品 |
| `supplier` | relation→suppliers | 是 | — | 供应商 |
| `currency` | text | 是 | max:3 | 货币 |
| `moq` | number | 否 | min:0 | 最小起订量 |
| `lead_time_days` | number | 否 | min:0 | 交期（天） |
| `tiers` | json | 否 | — | 阶梯价格数组，每项：`min_quantity`(number) 最低数量, `unit_price`(number) 单价 |
| `is_preferred` | bool | 否 | — | 优选供应商 |
| `valid_from` | date | 是 | — | 有效期起 |
| `valid_until` | date | 否 | — | 有效期止 |
| `remarks` | text | 否 | max:1000 | 备注 |

---

## 关系图

```
customers ──┬── customer_contacts
            ├── customer_tracking ── customer_activities
            ├── projects ──┬── quotations (items JSONB)
            │              └── products_projects ── products
            ├── so (items JSONB) ──┬── order_payments
            │                      └── shipments (items JSONB)
            └── (customer_id 文本字段在 so 中)

suppliers ──┬── supplier_contacts
            ├── supplier_bank_accounts
            ├── po (items JSONB) ── po_payments
            └── product_costs ── products

products ──┬── product_categories
           ├── product_documents
           └── product_costs ── suppliers
```
