# 数据库种子数据迁移任务

## 目标
将源数据库 D:\exportcrm-v2\crmdata\data.db 的所有业务数据映射转换到当前 pocketbase 数据库的种子文件中，生成到 pocketbase/seeds/generated/ 目录，**不要直接写入数据库**。

## 源数据库路径
- 主表: D:\exportcrm-v2\crmdata\data.db
- 备用/日志: D:\exportcrm-v2\crmdata\auxiliary.db （已读取，含 _logs 大量数据，暂不需要导入）

## 目标数据库路径
- PocketBase data: /d/exportcrm/pocketbase/pb_data/data.db
- 目标集合列表通过 _collections 表查询获得。

## 数据来源（已经提取好的原始 JSON 种子文件）
目录: /d/exportcrm/pocketbase/seeds/generated/
已生成，每个文件对应源数据库的一个表（数组格式，每行一条记录）。

## 表映射总览

| 源表 | 目标集合 | 状态 | 特殊处理 |
|------|----------|------|----------|
| customers | customers | 直接映射 | |
| suppliers | suppliers | 直接映射 | |
| products | products | 需处理 | source.category(text) -> 目标 product_categories 关系 |
| product_categories | product_categories | 直接映射 | |
| projects | projects | 需处理 | source.customer -> 目标 customer 关系 |
| rfqs | rfqs | 需处理 | source.project -> 目标 projects 关系 |
| quotations | quotations | 直接映射 | source.items JSON 为 null，无需处理 |
| orders | sales_orders | 直接映射 | 字段重命名 customers.bank_info(JSON->text) |
| so | sales_orders | 直接映射 | 包含 items JSON，需要和 orders 合并 |
| purchase_orders | purchase_orders | 注意 | 和 po 表重复，source.purchase_orders 无 items，source.po 有 items 但 supplier 字段名不同 |
| po | purchase_orders | 注意 | source.supplier_id, supplier_name -> 目标 supplier_id, supplier_name; 有 items JSON |
| shipments | shipments | 直接映射 | |
| service_providers | service_providers | 直接映射 | |
| remittance | remittance | 直接映射 | |
| products_projects | products_projects | 需处理 | id->自动生成; source.product, source.project 需映射为 PocketBase 关系的 ID 值 |
| quotation_items | quotation_items | 需处理 | source.quotation(text) -> 目标 quotation 关系 ID |
| order_items | sales_orders.items (JSONB) | 转换 |jsonb 要用 item 子表转换:把所有 order_items 凑成 JSON 数组，更新到 sales_orders.items |
| purchase_order_items | purchase_orders.items (JSONB) | 转换 | 同 order_items |
| shipment_items | shipment_items | 直接映射 | |
| rfq_items | rfq_items | 直接映射 | |
| rfq_suppliers | rfq_suppliers | 直接映射 | |
| rfq_quotations | rfq_quotations | 直接映射 | |
| quotation_mold_items | quotation_mold_items | 直接映射 | |
| order_mold_items | order_mold_items | 直接映射 | |
| purchase_order_mold_items | purchase_order_mold_items | 直接映射 | |
| customs_declaration_items | customs_declaration_items | 需处理 | 无数据(0行)，但需保留表结构 |
| customs_fees | customs_fees | 需处理 | 无数据(0行) |
| customs_clearance | customs_clearance | 需处理 | 无数据(0行) |
| user_settings | user_settings | 直接映射 | |
| app_config | app_config | 直接映射 | |
| bank_accounts | bank_accounts | 直接映射 | |
| order_payments | sales_order_payments | 直接映射 | source.order(text) -> 目标 order 关系ID |
| customer_contacts | customer_contacts | 需处理 | source.customer(text) -> 目标 customer 关系ID |
| supplier_contacts | supplier_contacts | 直接映射 | source.supplier(text) -> 目标 supplier 关系 |
| customer_tracking | customer_tracking | 直接映射 | |
| product_documents | product_documents | 直接映射 | |
| product_molds | product_molds | 直接映射 | |
| code_sequences | 无目标集合 | 未映射 | 源有 9 行，目标无此表，记录 |
| exchange_rate_cache | exchange_rate_cache | 直接映射 | |
| exchange_rate_history | exchange_rate_history | 直接映射 | |
| activity_logs | activity_logs | 需处理 | 需转换 level(INTEGER) 为 PocketBase 可读格式; 6 条记录 |
| feedbacks | feedbacks | 直接映射 | |
| order_sessions | 无目标集合 | 未映射 | 0 行，记录 |
| tasks | tasks | 直接映射 | |
| users | _pb_users_auth_ | 特别注意 | 目标是 auth 类型，直接覆盖可能导致认证问题， 不迁移 |

### 未映射/缺失目标集合的源表
- commercial_invoices -> 目标无此集合
- customs_declarations -> 目标无此集合
- po_payments -> 目标无此集合
- purchase_order_payments -> 目标无此集合
- code_sequences -> 目标无此集合
- order_sessions -> 目标无此集合

## 导入顺序（底向上，保证外键存在）
1. product_categories.json
2. products.json
3. customers.json
4. suppliers.json
5. service_providers.json
6. exchange_rate_cache.json, exchange_rate_history.json
7. bank_accounts.json
8. user_settings.json
9. app_config.json
10. projects.json
11. rfqs.json
12. quotations.json
13. sales_orders.json (orders + so 合并)
14. purchase_orders.json (po + purchase_orders 合并)
15. rfq_suppliers.json
16. rfq_quotations.json
17. rfq_items.json
18. quotation_items.json
19. shipments.json
20. shipment_items.json
21. customer_contacts.json
22. supplier_contacts.json
23. products_projects.json
24. customer_tracking.json
25. product_documents.json
26. sales_order_payments.json
27. remittance.json
28. tasks.json
29. feedbacks.json
30. activity_logs.json
31. project_cost_tables.json
32. project_cost_table_items.json
33. quotation_mold_items.json, order_mold_items.json, purchase_order_mold_items.json
34. customs_clearance.json 等 (目前为 0 行，保留空文件)

## 字段转换规则

### 通用规则
- source 的 JSON 类型列直接保留 JSON 字符串 value
- source 的 NUMERIC 类型 -> target number
- source 的 TEXT 类型 -> target text
- source 的 BOOLEAN -> target bool
- 必须保留源 id 字段，PocketBase 接受并可用 id 进行 update。

### customers
- 无需改名，直接导入
- type 为 direct/agent/distributor，若源值不同需记录

### suppliers
- 直接导入
- type 为 manufacturer/trader/agent

### products
- category (text) -> 查找 product_categories 表，若 name 匹配，填入 target category relation id
- 若无匹配 category，填 null

### projects
- customer (text) -> 查找 customers.code，若匹配填入 target customer relation id

### rfqs
- project (text) -> 查找 projects.code，若匹配填入 target project relation id

### quotations
- customer (text) -> 查找 customers.code，填入 customer relation id
- project (text) -> 查找 projects.code，填入 project relation id

### orders -> sales_orders
- customer (text) -> customer_id (text)
- project (text) -> project_id (text)
- quotation (text) -> quotation (text/relation)
- bank_info (JSON) -> JSON.stringify() -> bank_info (text)
- created_by (text) -> created_by
- updated_by (text) -> updated_by

### so -> sales_orders
- 大部分直接映射
- bank_info (text) -> bank_info (text)
- customer (text) -> customer_id
- customer_name -> customer_name
- items (JSON) -> 保留

### sales_orders 合并策略
- 先导入 orders
- 再导入 so，若 code 重复则 update 同 id，若 code 不同则 insert 为新记录
- items 字段: only so 有 items；如果两条记录 id 相同但 from so 有 items，保持 items 值

### purchase_orders -> purchase_orders
- 将 po 和 purchase_orders 合并
- po 的 supplier_id/supplier_name 映射到目标
- po.items (JSON) -> target.items
- purchase_orders 的补充字段 paid_amount/rfq/order 在目标表不存在

### shipments
- order (text) -> order (关系 id)
- 其他直导

### customer_contacts / supplier_contacts
- customer -> customer relation id
- supplier -> supplier relation id

### quotation_items
- quotation (text) -> 关系 id
- product (text) -> 关系 id

### rfq_items
- rfq (text) -> 关系 id
- product (text) -> 关系 id

### order_items -> sales_orders.items
- 按 order 分组
- 每个 item 转为 JSON object: { product, product_name, product_code, part_number, description_en, unit_price, quantity, amount, cost_price }
- 存入对应 sales_orders 的 items 字段

### purchase_order_items -> purchase_orders.items
- 按 purchase_order 分组
- 每个 item 转为: { part_number, product_name, unit, quantity, unit_price, amount, description_en, description_cn }

### sales_order_payments
- order (text) -> order 关系 id

### products_projects
- product (text) -> product 关系 id
- project (text) -> project 关系 id

## 未映射字段和需要讨论的问题
1. orders 和 so 同时存在 -> 合并到 sales_orders，code 冲突时如何处理？
2. purchase_orders 和 po 表 -> 合并到 purchase_orders
3. 目标 purchase_orders 表缺少 paid_amount, rfq, order 字段。这些字段在源表中有值。
4. 源 orders.bank_info 是 JSON，目标 sales_orders.bank_info 是 text。
5. 源 products.category 是 text，目标是 relation。
6. customs_declarations, commercial_invoices 等源表在目标数据库没有对应集合。
7. 不迁移 users 表（_pb_users_auth_），避免覆盖认证数据。

## 执行方式
使用 OpenCode 执行此任务文档。任务文档写入后，运行：
```
cd /d/exportcrm && opencode run -f pocketbase/seeds/MIGRATION_TASK.md
```
