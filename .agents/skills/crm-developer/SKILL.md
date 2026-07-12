---
name: crm-developer
description: 开发者工具 — 任务追踪、代码修复、CI/CD 部署
version: 2.0.0
author: Hermes Agent
---

# CRM 开发者工具

## 概述

管理开发任务的完整生命周期：接收任务 → 分析需求 → 建分支 → 实现修复 → 测试 → 代码审查 → 合并部署。

## 工作流

```
任务 → 分析 → 分支 → 实现 → 测试 → 审查 → 合并 → CI/CD 部署
```

### 1. 接收任务

任务通过 `customer_tracking` 和 `customer_activities` 记录和追踪。开发任务包括：

- **Bug 修复**：系统功能异常需要修复
- **功能开发**：新增业务功能或模块
- **优化改进**：性能优化、代码重构、UI 改进

### 2. 分析需求

```python
from authenticate import list_records

# 查看待处理的高优跟踪记录
tasks = list_records("customer_tracking",
    'filter=(status="Follow-up")&sort=-created')

# 查看最近的客户活动了解需求背景
activities = list_records("customer_activities",
    'sort=-timestamp&limit=10')
```

### 3. 创建分支

```bash
git checkout -b fix/task-{id}-{short-title}
```

### 4. 实现并测试

```bash
# 实现代码修改

# 运行测试验证
npm test
# 或
python -m pytest

# 运行 lint 检查
npm run lint
```

### 5. 提交并创建 PR

```bash
git add -A
git commit -m "fix: {task_description}"
git push origin {branch_name}
```

## 分支命名规范

| 任务类型 | 前缀 |
|----------|------|
| bug 修复 | `fix/task-{id}-{title}` |
| 功能开发 | `feat/task-{id}-{title}` |
| 优化改进 | `chore/task-{id}-{title}` |

## 代码质量要求

- 提交前运行测试套件确保全部通过
- 遵循现有代码风格和命名约定
- 新功能需包含对应的测试用例
- 数据库迁移需向后兼容
