"""Project notes tool — manage project Markdown notes with templates."""
import sys
import os
from pathlib import Path

_SKILL_DIR = Path(__file__).resolve().parent.parent / "skills" / "crm-project-notes"
_SCRIPTS_DIR = _SKILL_DIR / "scripts"
sys.path.insert(0, str(_SCRIPTS_DIR))

from note_manager import (
    list_notes,
    create_note,
    read_note,
    update_note,
    delete_note,
    get_available_templates,
)

__all__ = [
    "list_notes",
    "create_note",
    "read_note",
    "update_note",
    "delete_note",
    "get_available_templates",
]
