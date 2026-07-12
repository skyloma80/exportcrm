import sys
import os
import json
from pathlib import Path

_SKILL_DIR = Path(__file__).resolve().parent.parent / "skills" / "crm-packing"
_SCRIPTS_DIR = _SKILL_DIR / "scripts"
sys.path.insert(0, str(_SCRIPTS_DIR))

from main import calculate_packing
from main import parse_box


def calc_packing(box_specs_text: str, output_dir: str = None):
    """Calculate pallet packing for given box specs.

    Args:
        box_specs_text: Box specs string, e.g. "370,250,200,37;360,300,240,20"
                        Format per spec: length,width,height,quantity
                        Supports *, x, \u00d7 as separators
        output_dir: Optional custom output directory. Defaults to skill output dir.

    Returns:
        dict with pallet_count, total_boxes, pallets (list of dicts), html_path
    """
    specs = []
    for part in box_specs_text.replace(';', '\n').split('\n'):
        part = part.strip()
        if part:
            specs.append(parse_box(part))
    if not specs:
        return {"error": "No valid box specs provided"}

    if output_dir:
        output_dir = str(_SKILL_DIR / output_dir)

    result = calculate_packing(specs, output_dir=output_dir)

    # Convert html_path to forward slashes for readability
    result['html_path'] = Path(result['html_path']).as_posix()

    return result
