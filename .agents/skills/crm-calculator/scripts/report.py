"""Generate calculation reports as HTML."""
from __future__ import annotations

import os
import json
from datetime import datetime


def calc_report_html(calc_result: dict, title: str = "计算报告") -> str:
    """Generate HTML report from calculation result.

    Args:
        calc_result: Result from calc_line_items or calc_margin
        title: Report title

    Returns:
        HTML string
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    if "items" in calc_result and "subtotal" in calc_result:
        return _line_items_report(calc_result, title, now)
    elif "margin_percent" in calc_result:
        return _margin_report(calc_result, title, now)
    elif "cbm_per_box" in calc_result:
        return _cbm_report(calc_result, title, now)
    elif "grand_total" in calc_result:
        return _multi_currency_report(calc_result, title, now)
    else:
        return _generic_report(calc_result, title, now)


def _line_items_report(data: dict, title: str, now: str) -> str:
    items_html = ""
    for i, item in enumerate(data["items"], 1):
        items_html += f"""
        <tr>
            <td>{i}</td>
            <td>{item['description']}</td>
            <td class="num">{item['quantity']:,.0f}</td>
            <td class="num">{item['unit_price']:,.2f}</td>
            <td class="num">{item['amount']:,.2f}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: system-ui; padding: 20px; background: #f8fafc; }}
table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }}
th {{ background: #1e293b; color: white; }}
.num {{ text-align: right; }}
.total {{ font-weight: bold; background: #f1f5f9; }}
.summary {{ margin-top: 20px; padding: 16px; background: white; border-radius: 8px; }}
h2 {{ color: #1e293b; }}
.meta {{ color: #64748b; font-size: 12px; }}
</style></head><body>
<h2>{title}</h2>
<p class="meta">生成时间: {now}</p>
<table>
<tr><th>#</th><th>描述</th><th>数量</th><th>单价</th><th>金额</th></tr>
{items_html}
<tr class="total"><td colspan="4">小计</td><td class="num">{data['subtotal']:,.2f}</td></tr>
</table>
<div class="summary">
    <p>小计: <strong>{data['subtotal']:,.2f}</strong></p>
    <p>折扣: {data.get('discount_rate', 0)}% ({data.get('discount_amount', 0):,.2f})</p>
    <p>税: {data.get('tax_rate', 0)}% ({data.get('tax_amount', 0):,.2f})</p>
    <p><strong>总计: {data['total']:,.2f}</strong></p>
</div>
</body></html>"""


def _margin_report(data: dict, title: str, now: str) -> str:
    color = "#10b981" if data["margin_percent"] > 0 else "#ef4444"
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: system-ui; padding: 20px; background: #f8fafc; }}
.card {{ background: white; border-radius: 8px; padding: 24px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
.metric {{ display: inline-block; margin: 0 24px 16px 0; }}
.metric .label {{ color: #64748b; font-size: 12px; }}
.metric .value {{ font-size: 24px; font-weight: bold; color: #1e293b; }}
h2 {{ color: #1e293b; }}
.meta {{ color: #64748b; font-size: 12px; }}
</style></head><body>
<h2>{title}</h2>
<p class="meta">生成时间: {now}</p>
<div class="card">
    <div class="metric"><div class="label">售价</div><div class="value">{data['selling_price']:,.2f}</div></div>
    <div class="metric"><div class="label">成本</div><div class="value">{data['cost_price']:,.2f}</div></div>
    <div class="metric"><div class="label">利润</div><div class="value" style="color:{color}">{data['profit']:,.2f}</div></div>
    <div class="metric"><div class="label">利润率</div><div class="value" style="color:{color}">{data['margin_percent']:.1f}%</div></div>
    <div class="metric"><div class="label">加价率</div><div class="value">{data['markup_percent']:.1f}%</div></div>
</div>
</body></html>"""


def _cbm_report(data: dict, title: str, now: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: system-ui; padding: 20px; background: #f8fafc; }}
.card {{ background: white; border-radius: 8px; padding: 24px; margin: 16px 0; }}
h2 {{ color: #1e293b; }}
.meta {{ color: #64748b; font-size: 12px; }}
.big {{ font-size: 32px; font-weight: bold; color: #3b82f6; }}
</style></head><body>
<h2>{title}</h2>
<p class="meta">生成时间: {now}</p>
<div class="card">
    <p>尺寸: {data['dimensions']}</p>
    <p>数量: {data['quantity']}</p>
    <p>单箱体积: {data['cbm_per_box']:.6f} CBM</p>
    <p class="big">总体积: {data['total_cbm']:.4f} CBM</p>
</div>
</body></html>"""


def _multi_currency_report(data: dict, title: str, now: str) -> str:
    rows = ""
    for cur, info in data["by_currency"].items():
        rate_str = f"×{info['rate']:.4f}" if "rate" in info else "="
        rows += f"""
        <tr>
            <td>{cur}</td>
            <td class="num">{info['total']:,.2f}</td>
            <td>{rate_str}</td>
            <td class="num">{info['converted']:,.2f}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: system-ui; padding: 20px; background: #f8fafc; }}
table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; }}
th {{ background: #1e293b; color: white; }}
.num {{ text-align: right; }}
.total {{ font-weight: bold; background: #f1f5f9; }}
h2 {{ color: #1e293b; }}
.meta {{ color: #64748b; font-size: 12px; }}
</style></head><body>
<h2>{title}</h2>
<p class="meta">生成时间: {now} | 目标币种: {data['target_currency']}</p>
<table>
<tr><th>币种</th><th>金额</th><th>汇率</th><th>折合{data['target_currency']}</th></tr>
{rows}
<tr class="total"><td colspan="3">总计</td><td class="num">{data['grand_total']:,.2f} {data['target_currency']}</td></tr>
</table>
</body></html>"""


def _generic_report(data: dict, title: str, now: str) -> str:
    content = json.dumps(data, indent=2, ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>body {{ font-family: monospace; padding: 20px; }}</style></head><body>
<h2>{title}</h2>
<p>生成时间: {now}</p>
<pre>{content}</pre>
</body></html>"""


def save_report(html: str, output_path: str) -> str:
    """Save HTML report to file."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    return os.path.abspath(output_path)
