---
name: crm-disk
description: 文件管理 — S3 存储的列表、上传、下载、批量同步、目录规范
version: 1.0.0
author: AlustarsCRM
---

# 文件管理 (S3 Disk)

## 触发条件

当用户需要：
- 查看/管理 S3 文件
- 上传单个或多个文件
- 同步本地文件夹到 S3
- 下载或删除文件
- 了解目录结构规范

## 目录规范

公司根目录 `/Company/` 下按部门/用途组织：

```
/Company/
├── Public/              ← 公开文件（报价单、PI 等通用文档）
├── Customers/           ← 按客户组织
│   └── {customer_code}/
│       ├── Quotations/  ← 报价单
│       ├── PIs/         ← 形式发票
│       ├── Orders/      ← 客户订单
│       └── Photos/      ← 产品图片
├── Suppliers/           ← 按供应商组织
│   └── {supplier_code}/
│       ├── POs/         ← 采购订单
│       ├── Invoices/    ← 供应商发票
│       └── Photos/
├── Projects/            ← 按项目组织
│   └── {project_code}/
│       ├── Notes/       ← 项目笔记（Markdown）
│       └── Attachments/ ← 项目附件
├── Internal/            ← 内部文件
│   ├── Templates/       ← 模板文件
│   └── Reports/         ← 报表
└── Archive/             ← 归档
```

## API

```python
from tools.disk_ops import (
    disk_list,         # 列出目录
    disk_upload,       # 上传文件
    disk_download,     # 下载文件
    disk_delete,       # 删除文件
    disk_folders,      # 获取目录树
    disk_ensure_folder,# 创建目录
    disk_batch_upload, # 批量上传
    disk_sync,         # 同步本地目录到 S3
)

# 示例: 列出项目笔记
notes = disk_list("/Company/Projects/PROJ001/Notes/")

# 示例: 上传报价单
disk_upload("quote.pdf", "/Company/Customers/C001/Quotations/quote.pdf")

# 示例: 批量上传
files = [
    {"local_path": "doc1.pdf", "destination": "/Company/Public/doc1.pdf"},
    {"local_path": "doc2.pdf", "destination": "/Company/Public/doc2.pdf"},
]
results = disk_batch_upload(files)

# 示例: 同步本地目录
result = disk_sync("./project_files", "/Company/Projects/PROJ001/Attachments/")
```
