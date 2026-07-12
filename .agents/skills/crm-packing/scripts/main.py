import re
import sys
import os
from pallet_packer import PalletPacker
from visualizer import PalletVisualizer

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_PALLET_SPECS = [
    {'name': '1200x1200', 'dims': [1200, 1200, 1600]},
    {'name': '1200x1000', 'dims': [1200, 1000, 1600]},
    {'name': '1200x800',  'dims': [1200, 800,  1600]},
    {'name': '1000x1000', 'dims': [1000, 1000, 1600]}
]

OVERHANG_TOLERANCE = [50, 50, 50]
PALLET_HEIGHT = 150


def parse_box(spec: str):
    spec_clean = spec.replace('\u00d7', '*').replace('x', '*').replace('X', '*')
    parts = re.split(r'[*\s,]+', spec_clean)
    nums = [int(p) for p in parts if p.strip()]
    if len(nums) == 4:
        return nums
    elif len(nums) == 3:
        return nums + [1]
    elif len(nums) == 5:
        return nums[:4]
    else:
        raise ValueError(f"Invalid box spec '{spec}'")


def calculate_packing(box_specs, pallet_specs=None, overhang_limits=None, pallet_height=None, output_dir=None):
    if pallet_specs is None:
        pallet_specs = DEFAULT_PALLET_SPECS
    if overhang_limits is None:
        overhang_limits = OVERHANG_TOLERANCE
    if pallet_height is None:
        pallet_height = PALLET_HEIGHT
    if output_dir is None:
        output_dir = os.path.join(SKILL_DIR, 'output')
    os.makedirs(output_dir, exist_ok=True)

    test_array = [parse_box(s) if isinstance(s, str) else s for s in box_specs]

    packer = PalletPacker(
        pallet_specs=pallet_specs,
        overhang_limits=overhang_limits,
        pallet_height=pallet_height,
        support_threshold=0.8
    )
    pallets = packer.pack(test_array)

    total_qty = sum(b[3] if len(b) == 4 else 1 for b in test_array)
    summary = []
    for p in pallets:
        max_h = max(it['pos'][2]+it['dims'][2] for it in p['packed_items'])
        limit = p['base_h'] + overhang_limits[2] - pallet_height
        status = 'OK' if max_h <= limit else 'OVER'
        summary.append({
            'id': p['id'],
            'spec_name': p['spec_name'],
            'item_count': len(p['packed_items']),
            'max_height': round(max_h, 1),
            'height_limit': limit,
            'status': status
        })

    html_path = os.path.join(output_dir, 'pallet_packing_3d.html')
    PalletVisualizer.export_to_html(pallets, html_path, overhang_limits, pallet_height)

    return {
        'pallet_count': len(pallets),
        'total_boxes': total_qty,
        'pallets': summary,
        'html_path': os.path.abspath(html_path)
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <box specs> [box specs...]")
        print("Examples:")
        print("  python main.py 370,250,200,37 360,300,240,20 300,200,200,6")
        print("  python main.py 370*250*200*37 360*300*240*20")
        sys.exit(1)

    all_specs = []
    for arg in sys.argv[1:]:
        for part in arg.split(';'):
            part = part.strip()
            if part:
                all_specs.append(parse_box(part))
    test_array = all_specs

    result = calculate_packing(test_array)
    total_qty = result['total_boxes']

    print("=" * 55)
    print("Pallet Packing Optimization")
    print(f"Pallet height {PALLET_HEIGHT}mm \u00b7 Tolerance {OVERHANG_TOLERANCE}mm")
    print("Available specs:", ", ".join(s['name'] for s in DEFAULT_PALLET_SPECS))
    print(f"Total: {total_qty} boxes")
    print("=" * 55)

    print(f"\nResult: {result['pallet_count']} pallet(s), {total_qty} boxes")
    for p in result['pallets']:
        ok = 'OK' if p['status'] == 'OK' else 'OVER!'
        print(f"  Pallet #{p['id']}: {p['spec_name']} | {p['item_count']} boxes | height {p['max_height']}/{p['height_limit']}mm {ok}")

    print(f"\nVisualization: {result['html_path']}")


if __name__ == "__main__":
    main()
