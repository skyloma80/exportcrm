"""Parser for structured data from PDF files.

Uses pdfplumber for table extraction (structural PDFs) and
pypdf as fallback for text-based extraction.
"""
from __future__ import annotations
from typing import Any


def parse_pdf(file_path: str) -> dict:
    """Parse a PDF file and extract business data.

    Strategy:
    1. Try pdfplumber table extraction (for structured PDFs)
    2. Fall back to pypdf text extraction + regex
    3. Extract common fields: doc_type, customer, items, totals

    Args:
        file_path: Path to the .pdf file

    Returns:
        Dict with same format as excel_parser.parse_excel()
    """
    try:
        from pdfplumber import open as pdfplumber_open

        with pdfplumber_open(file_path) as pdf:
            tables = []
            full_text = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text.append(text)
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)

            text = "\n".join(full_text)

            if tables:
                return _parse_from_tables(text, tables)
            else:
                return _parse_from_text(text)

    except ImportError:
        return _parse_with_pypdf(file_path)


def _parse_from_tables(text: str, tables: list[list]) -> dict:
    """Parse document using pdfplumber table extraction."""
    import re

    doc_type = _detect_type(text)
    doc_code = _extract_value(text, doc_type)
    date = _extract_value(text, "date", r"(?:date|日期)[\s\.:：]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})")
    customer = _extract_customer(text)
    supplier = _extract_supplier(text) if doc_type == "po" else {}
    currency = _detect_currency(text)
    payment_terms = _extract_value(text, "payment",
                                    r"(?:payment terms|付款条件)[\s\.:：]*(.*?)(?:\n|$)")
    bank_info = _extract_bank_info(text) if doc_type in ("pi", "invoice") else ""

    items = _parse_items_from_tables(tables)

    total_amount = 0.0
    for item in items:
        total_amount += item.get("amount", 0) or 0
    if not total_amount:
        total_amount = _extract_total(text)

    incoterm = _extract_value(text, "incoterm",
                               r"(?:incoterm|trade term)[\s\.:：]*(.*?)(?:\n|$)")
    port_of_loading = _extract_value(text, "loading",
                                      r"(?:port of loading|loading port)[\s\.:：]*(.*?)(?:\n|$)")
    port_of_destination = _extract_value(text, "destination",
                                          r"(?:port of destination|destination port)[\s\.:：]*(.*?)(?:\n|$)")

    return {
        "doc_type": doc_type,
        "doc_code": doc_code,
        "date": date,
        "customer": customer,
        "supplier": supplier,
        "items": items,
        "currency": currency,
        "total_amount": total_amount,
        "payment_terms": payment_terms,
        "bank_info": bank_info,
        "incoterm": incoterm,
        "port_of_loading": port_of_loading,
        "port_of_destination": port_of_destination,
        "parse_method": "table",
    }


def _parse_from_text(text: str) -> dict:
    """Parse document using text extraction + regex."""
    import re

    doc_type = _detect_type(text)
    doc_code = _extract_value(text, doc_type)
    date = _extract_value(text, "date", r"(?:date|日期)[\s\.:：]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})")
    customer = _extract_customer(text)
    supplier = _extract_supplier(text) if doc_type == "po" else {}
    currency = _detect_currency(text)
    total_amount = _extract_total(text)
    payment_terms = _extract_value(text, "payment",
                                    r"(?:payment terms|付款条件)[\s\.:：]*(.*?)(?:\n|$)")
    bank_info = _extract_bank_info(text) if doc_type in ("pi", "invoice") else ""

    items = _parse_items_from_text(text)
    if not items and total_amount:
        items = [{"product_name": "Item 1", "quantity": 1,
                   "unit_price": total_amount, "amount": total_amount}]

    incoterm = _extract_value(text, "incoterm",
                               r"(?:incoterm|trade term)[\s\.:：]*(.*?)(?:\n|$)")
    port_of_loading = _extract_value(text, "loading",
                                      r"(?:port of loading)[\s\.:：]*(.*?)(?:\n|$)")
    port_of_destination = _extract_value(text, "destination",
                                          r"(?:port of destination)[\s\.:：]*(.*?)(?:\n|$)")

    return {
        "doc_type": doc_type,
        "doc_code": doc_code,
        "date": date,
        "customer": customer,
        "supplier": supplier,
        "items": items,
        "currency": currency,
        "total_amount": total_amount,
        "payment_terms": payment_terms,
        "bank_info": bank_info,
        "incoterm": incoterm,
        "port_of_loading": port_of_loading,
        "port_of_destination": port_of_destination,
        "parse_method": "text",
    }


def _parse_with_pypdf(file_path: str) -> dict:
    """Fallback parser using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(file_path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return _parse_from_text(text)


def _detect_type(text: str) -> str:
    """Detect document type from text."""
    lower = text.lower()
    if any(k in lower for k in ["proforma invoice", "pi-"]):
        return "pi"
    if any(k in lower for k in ["purchase order", "po-"]):
        return "po"
    if any(k in lower for k in ["quotation", "quote"]):
        return "quotation"
    if any(k in lower for k in ["invoice"]):
        return "invoice"
    return "unknown"


def _extract_value(text: str, field: str, pattern: str = "") -> str:
    """Extract field value using regex pattern."""
    import re
    if pattern:
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else ""

    doc_patterns = {
        "pi": r"PI[-:=\s]*([A-Z0-9\-/]+)",
        "po": r"PO[-:=\s]*([A-Z0-9\-/]+)",
        "quotation": r"(?:QUO|QTN|QT)[-:=\s]*([A-Z0-9\-/]+)",
        "invoice": r"(?:INV)[-:=\s]*([A-Z0-9\-/]+)",
    }
    pattern = doc_patterns.get(field, r"(?:No|CODE)[\.:：\s]*([A-Z0-9\-/]+)")
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extract_customer(text: str) -> dict:
    """Extract customer info from text."""
    import re
    customer = {"name": "", "address": "", "tax_id": "", "contact": ""}

    indicators = ["bill to", "ship to", "customer", "buyer",
                  " sold to", "consignee", "客户", "买方"]
    lines = text.split("\n")
    found = False

    for i, line in enumerate(lines):
        lower = line.lower().strip()
        if any(k in lower for k in indicators):
            found = True
            for j in range(i + 1, min(i + 3, len(lines))):
                if lines[j].strip() and ":" not in lines[j]:
                    customer["name"] = lines[j].strip()
                    break

            for j in range(i + 2, min(i + 8, len(lines))):
                val = lines[j].strip()
                if not val or ":" in val.lower():
                    break
                if val != customer["name"]:
                    if not customer["address"]:
                        customer["address"] = val
                    else:
                        customer["address"] += " " + val
            break

    m = re.search(r"(?:tax|vat|tin)[\s\.:：]*([A-Z0-9\-]+)", text, re.IGNORECASE)
    if m:
        customer["tax_id"] = m.group(1)

    return customer


def _extract_supplier(text: str) -> dict:
    """Extract supplier info from text."""
    supplier = {"name": "", "address": ""}
    indicators = ["supplier", "vendor", "seller", "卖方", "供应商"]
    lines = text.split("\n")
    found = False

    for i, line in enumerate(lines):
        lower = line.lower().strip()
        if any(k in lower for k in indicators):
            found = True
            for j in range(i + 1, min(i + 3, len(lines))):
                if lines[j].strip() and ":" not in lines[j]:
                    supplier["name"] = lines[j].strip()
                    break

            for j in range(i + 2, min(i + 8, len(lines))):
                val = lines[j].strip()
                if not val or ":" in val.lower():
                    break
                if val != supplier["name"]:
                    if not supplier["address"]:
                        supplier["address"] = val
                    else:
                        supplier["address"] += " " + val
            break

    return supplier


def _detect_currency(text: str) -> str:
    """Detect currency from text."""
    import re
    currencies = ["USD", "EUR", "CNY", "GBP", "JPY", "HKD", "AUD", "CAD", "SGD"]
    for cur in currencies:
        if re.search(rf"\b{cur}\b", text, re.IGNORECASE):
            return cur
    return "USD"


def _extract_total(text: str) -> float:
    """Extract total amount from text."""
    import re
    patterns = [
        r"(?:total|合计|总计)[\s\.:：]*[$€£]*\s*([\d,]+\.?\d*)",
        r"(?:amount due|grand total)[\s\.:：]*[$€£]*\s*([\d,]+\.?\d*)",
    ]
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            try:
                return float(matches[-1].replace(",", ""))
            except ValueError:
                pass
    return 0.0


def _extract_bank_info(text: str) -> str:
    """Extract bank info from text."""
    lines = text.split("\n")
    bank_lines = []
    in_section = False
    keywords = ["bank", "remittance", "account", "iban", "swift",
                "银行", "汇款", "账户"]

    for line in lines:
        lower = line.lower()
        if any(k in lower for k in keywords):
            in_section = True
        if in_section:
            bank_lines.append(line.strip())
            if len(bank_lines) > 15:
                break

    return "\n".join(bank_lines).strip()


def _parse_items_from_tables(tables: list[list]) -> list[dict]:
    """Parse line items from extracted tables."""
    items = []
    for table in tables:
        for row in table:
            vals = [str(v or "").strip() for v in row]
            if all(not v for v in vals):
                continue

            item = _parse_numeric_row(vals)
            if item and item.get("quantity", 0) > 0:
                items.append(item)

    return items


def _parse_items_from_text(text: str) -> list[dict]:
    """Parse line items from plain text (regex-based)."""
    import re

    items = []
    lines = text.split("\n")
    in_table = False
    header_found = False

    for line in lines:
        lower = line.lower().strip()
        if any(k in lower for k in ["quantity", "qty", "description",
                                     "product", "item"]):
            if any(k in lower for k in ["unit price", "price", "amount"]):
                header_found = True
                in_table = True
                continue

        if in_table:
            if not line.strip():
                in_table = False
                continue

            nums = re.findall(r"[\d,]+\.?\d*", line.replace(",", ""))
            if len(nums) >= 3:
                try:
                    qty = float(nums[0])
                    price = float(nums[-2])
                    amt = float(nums[-1])
                    desc = re.sub(r"[\d,]+\.?\d*", "", line).strip()
                    items.append({
                        "product_name": desc,
                        "description": desc,
                        "quantity": int(qty) if qty == int(qty) else qty,
                        "unit": "",
                        "unit_price": price,
                        "amount": amt,
                    })
                except (ValueError, IndexError):
                    pass

    return items


def _parse_numeric_row(vals: list[str]) -> dict | None:
    """Parse a row containing numeric values (qty, price, amount)."""
    import re
    item = {"product_name": "", "description": "", "quantity": 0,
            "unit": "", "unit_price": 0.0, "amount": 0.0}

    nums = []
    for v in vals:
        clean = re.sub(r"[^0-9.]", "", v.replace(",", ""))
        try:
            num = float(clean)
            if num > 0:
                nums.append(num)
        except ValueError:
            pass

    if len(nums) >= 3:
        item["quantity"] = int(nums[0]) if nums[0] == int(nums[0]) else nums[0]
        item["unit_price"] = nums[-2]
        item["amount"] = nums[-1]
    elif len(nums) == 2:
        item["quantity"] = int(nums[0]) if nums[0] == int(nums[0]) else nums[0]
        item["unit_price"] = nums[1]
        item["amount"] = nums[0] * nums[1]

    text_vals = [v for v in vals if v and not _looks_numeric(v)]
    if text_vals:
        item["description"] = text_vals[0]
        item["product_name"] = text_vals[0]

    return item


def _looks_numeric(v: str) -> bool:
    import re
    return bool(re.match(r"^[\d,.\-${}€£\s]+$", v))
