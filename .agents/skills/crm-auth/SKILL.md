---
name: crm-auth
description: 认证管理 — PocketBase 用户认证、Token 管理、登录/注销
version: 2.0.0
author: Hermes Agent
---

# CRM 认证管理

## 概述

所有 CRM API 操作均需先通过认证。支持 API Token 和用户名密码两种方式，通过环境变量配置。

## 环境变量

| 变量 | 说明 |
|------|------|
| `CRM_API_URL` | PocketBase 服务器地址（默认 http://42.194.150.84:8091） |
| `CRM_API_TOKEN` | 静态 API Token（优先使用） |
| `CRM_USER` / `CRM_PASS` | 用户名密码认证（备用） |

> `CRM_API_TOKEN` 优先于 `CRM_USER`/`CRM_PASS`。两者都设置时用 Token。都没设置时运行时会提示。

## 认证方式

### 方式一：API Token（优先）

```python
from authenticate import list_records, create_record, update_record, delete_record
customers = list_records("customers")
```

### 方式二：用户名密码自动登录

```python
from authenticate import list_records
customers = list_records("customers")  # 自动取 token，无需额外步骤
```

## 常用操作

```python
# 手动获取 token
from authenticate import authenticate
token = authenticate()

# 获取用户列表
users = list_records("users")
```
