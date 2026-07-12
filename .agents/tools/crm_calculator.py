"""CRM Calculator tool wrapper.

Provides line item calculations, margin analysis, CBM volume,
and currency conversion.
"""
import sys
import os
from pathlib import Path

_SKILL_DIR = Path(__file__).resolve().parent.parent / "skills" / "crm-calculator"
_SCRIPTS_DIR = _SKILL_DIR / "scripts"
sys.path.insert(0, str(_SCRIPTS_DIR))

from calc_engine import (
    calc_line_items,
    calc_margin,
    calc_cbm,
    calc_exchange,
    calc_multi_currency_totals,
)
from currency import get_rate, list_rates
from report import calc_report_html, save_report

__all__ = [
    "calc_line_items",
    "calc_margin",
    "calc_cbm",
    "calc_exchange",
    "calc_multi_currency_totals",
    "get_rate",
    "list_rates",
    "calc_report_html",
    "save_report",
]
