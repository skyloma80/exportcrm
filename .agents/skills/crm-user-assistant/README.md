# CRM User Assistant — Quick Reference

无需打开CRM网页，通过Hermes完成所有外贸业务。

## 角色速查

| 你的角色 | 加载哪个skill | 
|----------|--------------|
| 销售 | `crm-customers`, `crm-quotations`, `crm-orders`, `crm-email` |
| 采购 | `crm-rfqs`, `crm-suppliers`, `crm-po`, `crm-price-comparison` |
| 物流 | `crm-shipments`, `crm-orders` |
| 财务 | `crm-po`, `crm-orders`, `crm-documents`, `crm-exchange-rates` |
| 管理员 | `crm-developer`, `crm-feedbacks`, `crm-company-info` |

## 最常用操作

```python
from authenticate import pb_list, pb_create, pb_update

# 搜索客户
customers = pb_list("customers", "filter=(name~'关键词')")

# 创建报价
q = pb_create("quotations", {"customer": cid, "status": "draft"})

# 推进订单状态
pb_update("orders", oid, {"status": "confirmed"})

# 发邮件 - 见crm-email skill
# 比价 - 见crm-price-comparison skill
# 生成PI - 见crm-documents skill
# 文件管理 - 见crm-disk skill
```
