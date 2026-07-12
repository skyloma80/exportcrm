"""Project notes management — list, create, read, update, delete."""
from __future__ import annotations
import os
import re
import shutil
from pathlib import Path
from datetime import datetime
from typing import Any

_NOTES_DIR_NAME = "_project_notes"  # local fallback storage

TEMPLATES: dict[str, str] = {}

TEMPLATES["project_brief"] = """# {title}

## 项目概述

*（描述项目的背景和目的）*

## 项目目标

- 目标 1
- 目标 2
- 目标 3

## 范围

### 包含
-

### 不包含
-

## 关键里程碑

| 里程碑 | 截止日期 | 状态 |
|--------|----------|------|
|        |          |      |

## 参与人员

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
|      |      |          |

## 风险与假设

1.

---

*创建日期: {date}*
"""

TEMPLATES["task_list"] = """# {title}

## 待办任务

| # | 任务描述 | 负责人 | 优先级 | 截止日期 | 状态 |
|---|----------|--------|--------|----------|------|
| 1 |          |        |        |          |      |
| 2 |          |        |        |          |      |
| 3 |          |        |        |          |      |

## 进行中

| # | 任务描述 | 负责人 | 进度 | 备注 |
|---|----------|--------|------|------|
|   |          |        |      |      |

## 已完成

| # | 任务描述 | 负责人 | 完成日期 |
|---|----------|--------|----------|
|   |          |        |          |

---

*创建日期: {date}*
"""

TEMPLATES["meeting_notes"] = """# {title}

## 基本信息

| 项目 | 内容 |
|------|------|
| 日期 | {date} |
| 时间 | |
| 地点 | |
| 主持人 | |
| 参会人员 | |
| 记录人 | |

## 议程

1.
2.
3.

## 讨论内容

### 1.

### 2.

### 3.

## 决议

1.
2.

## 行动项

| # | 事项 | 负责人 | 截止日期 |
|---|------|--------|----------|
|   |      |        |          |
"""

TEMPLATES["requirements"] = """# {title}

## 需求规格

### 功能需求

| ID | 描述 | 优先级 | 验收标准 |
|----|------|--------|----------|
| F1 |      | P0     |          |
| F2 |      | P1     |          |
| F3 |      | P2     |          |

### 非功能需求

| ID | 描述 | 指标 |
|----|------|------|
| NF1|      |      |

### 约束条件

1.
2.

---

*创建日期: {date}*
"""

TEMPLATES["inspection_report"] = """# {title}

## 验货信息

| 项目 | 内容 |
|------|------|
| 验货日期 | {date} |
| 产品 | |
| 供应商 | |
| 订单号 | |
| 数量 | |
| 验货员 | |

## 检查项目

| # | 检查项 | 标准 | 结果(OK/NG) | 备注 |
|---|--------|------|-------------|------|
| 1 | 外观 | | | |
| 2 | 尺寸 | | | |
| 3 | 功能 | | | |
| 4 | 包装 | | | |
| 5 | 标签 | | | |

## 抽样结果

- 抽检数量:
- 缺陷数量:
- AQL 判定:

## 缺陷明细

| # | 产品编号 | 缺陷描述 | 严重程度 | 图片 |
|---|----------|----------|----------|------|
|   |          |          |          |      |

## 结论

- [ ] 通过
- [ ] 有条件通过
- [ ] 不通过

## 备注

*

---

*创建日期: {date}*
"""


def _storage_path(project_id: str) -> Path:
    """Get local storage directory for a project's notes."""
    base = Path(__file__).resolve().parent / _NOTES_DIR_NAME / project_id
    base.mkdir(parents=True, exist_ok=True)
    return base


def _slugify(name: str) -> str:
    """Convert a title to a safe filename."""
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\u4e00-\u9fff_-]+', '_', s)
    s = re.sub(r'_+', '_', s)
    s = s.strip('_')
    return s + ".md" if s else "untitled.md"


def list_notes(project_id: str) -> list[dict]:
    """List all notes in a project.

    Args:
        project_id: PocketBase project ID or project code

    Returns:
        List of {name, path, updated, size} dicts
    """
    storage = _storage_path(project_id)
    notes = []
    for f in sorted(storage.iterdir()):
        if f.suffix.lower() == ".md" and f.is_file():
            mtime = datetime.fromtimestamp(f.stat().st_mtime)
            notes.append({
                "name": f.stem,
                "path": f.name,
                "updated": mtime.isoformat(),
                "size": f.stat().st_size,
            })
    return notes


def create_note(project_id: str, template: str = "",
                title: str = "", content: str = "") -> dict:
    """Create a new project note.

    Args:
        project_id: PocketBase project ID or code
        template: Template name (project_brief, task_list, etc.)
        title: Note title (used for filename)
        content: Raw markdown content (overrides template)

    Returns:
        Dict with path, filename, name
    """
    storage = _storage_path(project_id)

    filename = _slugify(title or template or "untitled")
    filepath = storage / filename

    if not content:
        tmpl = TEMPLATES.get(template, "")
        content = tmpl.format(
            title=title or template.replace("_", " ").title(),
            date=datetime.now().strftime("%Y-%m-%d"),
        )

    filepath.write_text(content, encoding="utf-8")

    return {
        "path": str(filepath.relative_to(storage.parent)),
        "filename": filename,
        "name": filename.replace(".md", ""),
        "project_id": project_id,
        "size": len(content),
    }


def read_note(project_id: str, path: str) -> str | None:
    """Read a note's content.

    Args:
        project_id: PocketBase project ID or code
        path: Note filename (e.g. "project_brief.md")

    Returns:
        Markdown content string, or None if not found
    """
    storage = _storage_path(project_id)
    filepath = storage / path
    if filepath.exists() and filepath.is_file():
        return filepath.read_text(encoding="utf-8")
    # Try without .md suffix
    for f in storage.iterdir():
        if f.stem == path and f.suffix == ".md":
            return f.read_text(encoding="utf-8")
    return None


def update_note(project_id: str, path: str, content: str) -> dict:
    """Update a note's content.

    Args:
        project_id: PocketBase project ID or code
        path: Note filename
        content: New markdown content

    Returns:
        Dict with path, name, updated
    """
    storage = _storage_path(project_id)
    filepath = storage / path
    filepath.write_text(content, encoding="utf-8")
    mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
    return {
        "path": str(filepath.relative_to(storage.parent)),
        "name": filepath.stem,
        "updated": mtime.isoformat(),
    }


def delete_note(project_id: str, path: str) -> dict:
    """Delete a note.

    Args:
        project_id: PocketBase project ID or code
        path: Note filename

    Returns:
        Dict with status
    """
    storage = _storage_path(project_id)
    filepath = storage / path
    if filepath.exists():
        filepath.unlink()
    return {"path": path, "status": "deleted"}


def get_available_templates() -> list[dict]:
    """List available note templates.

    Returns:
        List of {name, description}
    """
    descriptions = {
        "project_brief": "项目简介 — 概述、目标、范围、里程碑",
        "task_list": "任务列表 — 待办、进行中、已完成",
        "meeting_notes": "会议记录 — 议程、讨论、决议、行动项",
        "requirements": "需求文档 — 功能需求、非功能需求、验收标准",
        "inspection_report": "验货报告 — 检查项、缺陷记录、结论",
    }
    return [
        {"name": k, "description": descriptions.get(k, "")}
        for k in TEMPLATES
    ]
