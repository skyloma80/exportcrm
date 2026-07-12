# CRM Core Skill

业务知识中枢，封装 AlustarsCRM 的核心规则和 API 规范。

## 内容

1. **系统架构** — .agents/ 目录结构与职责
2. **统一 API** — `call_api.py` 的调用规范与 filter 语法
3. **认证** — Token / CRM_USER 登录流程
4. **状态机** — SO / PO / Shipments 完整流转规则
5. **Collections** — 32 个业务实体的字段说明
6. **工具索引** — `tools/*.py` 的功能与接口速查
8. **调用模式** — 常用 CRUD / expand 代码片段

## 与其他 Skills 的关系

- `crm-auth` → 认证细节
- `crm-developer` → 开发 orchestration
- `crm-workflow` → 状态推进 tips
