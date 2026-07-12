"""Document import tool — parse PDF/Excel and compare against database."""
import sys
import os
from pathlib import Path

_SKILL_DIR = Path(__file__).resolve().parent.parent / "skills" / "crm-documents"
_SCRIPTS_DIR = _SKILL_DIR / "scripts"
sys.path.insert(0, str(_SCRIPTS_DIR))

from import_handler import import_document

__all__ = ["import_document"]
