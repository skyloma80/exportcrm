---
name: crm-project-notes
description: 项目管理笔记 — 基于 S3 Markdown 的项目笔记，5种标准模板
version: 1.0.0
author: AlustarsCRM
---

# 项目管理笔记

## 触发条件

当用户需要：
- 查看/创建/编辑项目笔记
- 使用标准模板创建项目文档
- 列出项目下的所有笔记
- 按项目组织文档

## 模板

| 模板 | 文件名 | 用途 |
|------|--------|------|
| 项目简介 | `project_brief.md` | 项目概述、目标、范围、时间线 |
| 任务列表 | `task_list.md` | 任务清单、负责人、截止日期 |
| 会议记录 | `meeting_notes.md` | 会议纪要、决议、行动项 |
| 需求文档 | `requirements.md` | 需求规格、验收标准 |
| 验货报告 | `inspection_report.md` | 验货检查项、缺陷记录 |

## 用法

```python
from tools.project_notes import list_notes, create_note, read_note

# 列出项目笔记
notes = list_notes(project_id="xxx")
# → [{"name": "project_brief.md", "updated": "2024-01-01"}, ...]

# 从模板创建笔记
note = create_note(project_id="xxx", template="project_brief",
                   title="New Project Brief")
# → {"path": "projects/PROJ001/notes/new_project_brief.md", ...}

# 读取笔记
content = read_note(project_id="xxx", path="project_brief.md")

# 更新笔记
updated = update_note(project_id="xxx", path="project_brief.md",
                      content="# Updated...")

# 删除笔记
delete_note(project_id="xxx", path="project_brief.md")
```

## 存储结构

S3 路径规则: `projects/{project_code}/notes/{note_name}.md`

笔记名自动 slugify，例如 "Project Brief" → "project_brief.md"
