# crm-excel — PI/PO Excel 文档生成

通过服务端 API 生成标准格式的 PI / PO `.xlsx` 文件。Excel 的样式、合并单元格与 Logo 由服务端基于 ExcelJS 的 TS 服务处理，**本 skill 不提供本地脚本**。

## 快速开始

```python
from call_api import call_api

# 1. 取订单数据
so = call_api("GET", "so/{record_id}")

# 2. 生成 Excel（返回二进制内容）
pi_bytes = call_api("GET", f"so/{so['id']}/export-pi")

# 3. 保存
with open(f"PI-{so['code']}.xlsx", "wb") as f:
    f.write(pi_bytes)
```

PO 同理：`call_api("GET", f"po/{po_id}/export-excel")`。

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/so/{id}/export-pi` | GET | 生成 PI Excel |
| `GET /api/po/{id}/export-excel` | GET | 生成 PO Excel |

## 说明

- 生成引擎为服务端 TS 服务（`lib/services/excel-pi-service.ts`、`lib/services/excel-po-service.ts`），模板位于仓库根 `excel-template/`。
- 请勿尝试本地拼装 xlsx——样式与合并单元格处理复杂，本地生成易出错。统一走服务端 API。
