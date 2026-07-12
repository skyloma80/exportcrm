"""
Page Agent Bridge - Browser automation for CRM form operations.

Uses Playwright + Page Agent to open the CRM web UI,
pre-fill forms, and let users preview/confirm before submission.

Usage:
    with PageAgentForm(headless=False) as pa:
        pa.login("email", "pass")
        pa.fill_new_so_form({"customer": "ABC Corp", ...})
        pa.wait_for_user("请确认订单信息无误后提交")

Environment variables:
    CRM_FRONTEND_URL     - CRM web UI URL (default: http://42.194.150.84:3333)
    CRM_USER / CRM_PASS  - CRM login credentials
    PAGE_AGENT_MODE      - "demo" (default, free test API) or "production" (own LLM)
    PAGE_AGENT_API_KEY   - LLM API key (required in production mode)
    PAGE_AGENT_MODEL     - Model name (default: qwen3.5-plus)
    PAGE_AGENT_BASE_URL  - LLM API base URL
"""
from __future__ import annotations
import os
import time
import json
import atexit
from typing import Any

# --- CDN paths ---
_DEMO_CDN = "https://cdn.jsdelivr.net/npm/page-agent@1.12.1/dist/iife/page-agent.demo.js"
_DEMO_CDN_CN = "https://registry.npmmirror.com/page-agent/1.12.1/files/dist/iife/page-agent.demo.js"
_PROD_CDN = "https://cdn.jsdelivr.net/npm/page-agent@1.12.1/dist/iife/page-agent.js"
_PROD_CDN_CN = "https://registry.npmmirror.com/page-agent/1.12.1/files/dist/iife/page-agent.js"

# --- Environment defaults ---
CRM_URL = os.environ.get("CRM_FRONTEND_URL", "http://42.194.150.84:3333")
CRM_API_URL = os.environ.get("CRM_API_URL", "http://42.194.150.84:8091")


def _page_agent_config() -> dict:
    """Resolve Page Agent LLM config from env vars.

    PAGE_AGENT_MODE=demo (default):
        Uses the demo CDN which includes a free test API key.
        Suitable for evaluation only.

    PAGE_AGENT_MODE=production:
        PAGE_AGENT_API_KEY is required.
        Model defaults to qwen3.5-plus, baseURL defaults to DashScope.
    """
    mode = os.environ.get("PAGE_AGENT_MODE", "demo").lower()

    if mode == "production":
        api_key = os.environ.get("PAGE_AGENT_API_KEY")
        if not api_key:
            raise ValueError(
                "PAGE_AGENT_MODE=production requires PAGE_AGENT_API_KEY. "
                "Set it in .env.local or environment."
            )
        return {
            "model": os.environ.get("PAGE_AGENT_MODEL", "qwen3.5-plus"),
            "baseURL": os.environ.get(
                "PAGE_AGENT_BASE_URL",
                "https://dashscope.aliyuncs.com/compatible-mode/v1",
            ),
            "apiKey": api_key,
            "language": os.environ.get("PAGE_AGENT_LANGUAGE", "zh-CN"),
        }

    # demo mode — no config needed, demo CDN has a baked-in free key
    return {"language": "zh-CN"}


def _inject_page_agent(page):
    """Inject Page Agent JS into the browser page.

    Priority (production mode):
    1. node_modules/page-agent/dist/iife/page-agent.js (local build)
    2. Raise error — production IIFE must be built locally

    Priority (demo mode):
    1. node_modules/page-agent/dist/iife/page-agent.demo.js (local)
    2. Demo CDN (free test API)
    """
    mode = os.environ.get("PAGE_AGENT_MODE", "demo").lower()
    root = os.getcwd()

    if mode == "production":
        local_paths = [
            os.path.join(root, "node_modules", "page-agent", "dist", "iife", "page-agent.js"),
            os.path.join(root, "public", "page-agent.js"),
            os.path.join(root, "..", "node_modules", "page-agent", "dist", "iife", "page-agent.js"),
        ]
        for local in local_paths:
            if os.path.isfile(local):
                page.add_script_tag(path=local)
                return
        raise RuntimeError(
            "Production IIFE not found. Run: npm run build:page-agent"
        )

    # demo mode
    local = os.path.join(root, "node_modules", "page-agent", "dist", "iife", "page-agent.demo.js")
    if os.path.isfile(local):
        page.add_script_tag(path=local)
        return

    for url in (_DEMO_CDN, _DEMO_CDN_CN):
        try:
            page.add_script_tag(url=url)
            return
        except Exception:
            continue
    raise RuntimeError("Failed to load Page Agent demo CDN")


def _build_pa_script(commands: str | list[str], config: dict) -> str:
    """Build a JS string that creates a PageAgent instance and executes commands."""
    if isinstance(commands, str):
        commands = [commands]

    config_json = json.dumps(config, ensure_ascii=False)
    steps = ";\n    ".join(
        f"await pa.execute({json.dumps(cmd, ensure_ascii=False)})"
        for cmd in commands
    )

    return f"""
    (async () => {{
        const pa = new window.PageAgent({config_json});
        {steps};
    }})();
    """


class PageAgentForm:
    """Context manager for browser-based CRM form operations.

    Args:
        headless: Run browser in headless mode (default False)
        crm_url: CRM web UI base URL
    """

    def __init__(self, headless: bool = False, crm_url: str = None):
        self.crm_url = crm_url or CRM_URL
        self.headless = headless
        self.browser = None
        self.page = None
        self._pa_config = _page_agent_config()
        self._pa_injected = False

    def __enter__(self):
        self._start_browser()
        return self

    def __exit__(self, *args):
        self.close()

    def _start_browser(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        self.browser = self._pw.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = self.browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
        )
        self.page = context.new_page()
        atexit.register(self.close)

    def _ensure_pa(self):
        if not self._pa_injected:
            _inject_page_agent(self.page)
            self._pa_injected = True

    def _exec(self, commands: str | list[str]):
        """Execute one or more Page Agent commands."""
        script = _build_pa_script(commands, self._pa_config)
        try:
            self.page.evaluate(script)
        except Exception as e:
            print(f"  ⚠ Page Agent command failed: {e}")
            if isinstance(commands, list):
                for i, cmd in enumerate(commands):
                    print(f"     [{i}] {cmd}")

    def login(self, email: str = None, password: str = None):
        """Navigate to CRM login page and authenticate."""
        email = email or os.environ.get("CRM_USER", "")
        password = password or os.environ.get("CRM_PASS", "")
        if not email or not password:
            raise ValueError(
                "CRM credentials required. Set CRM_USER/CRM_PASS env vars "
                "or pass email/password arguments."
            )

        self.page.goto(f"{self.crm_url}/login", wait_until="networkidle")
        self._ensure_pa()

        mode = os.environ.get("PAGE_AGENT_MODE", "demo").lower()
        if mode == "production":
            self._exec([
                f'在邮箱输入框中输入 "{email}"',
                f'在密码输入框中输入 "{password}"',
                '点击登录按钮',
            ])
        else:
            # demo mode: PageAgent demo CDN has baked-in free API key,
            # we still need to pass basic config
            self._exec([
                f'在邮箱输入框中输入 "{email}"',
                f'在密码输入框中输入 "{password}"',
                '点击登录按钮',
            ])

        self.page.wait_for_load_state("networkidle", timeout=15000)
        time.sleep(2)

    def navigate(self, path: str):
        """Navigate to a CRM page.

        Args:
            path: Route path like '/so/new', '/quotations/new'
        """
        self.page.goto(f"{self.crm_url}{path}", wait_until="networkidle")
        self._ensure_pa()
        time.sleep(1)

    def fill_form(self, instructions: str | list[str], wait_after: float = 2.0):
        """Use Page Agent to fill form fields with natural language instructions."""
        self._exec(instructions)
        if wait_after:
            time.sleep(wait_after)

    def fill_new_so_form(self, so_data: dict):
        """Fill a New Sales Order form with structured data."""
        instructions = []

        if so_data.get("customer_name"):
            instructions.append(f'在客户名称输入框中输入 "{so_data["customer_name"]}"')
        if so_data.get("currency"):
            instructions.append(f'选择币种为 {so_data["currency"]}')
        if so_data.get("incoterm"):
            instructions.append(f'在贸易术语中选择 {so_data["incoterm"]}')
        if so_data.get("payment_terms"):
            instructions.append(f'在付款条款中输入 "{so_data["payment_terms"]}"')
        if so_data.get("customer_po"):
            instructions.append(f'在客户PO号输入框中输入 "{so_data["customer_po"]}"')
        if so_data.get("remarks"):
            instructions.append(f'在备注输入框中输入 "{so_data["remarks"]}"')
        if so_data.get("expected_delivery_date"):
            instructions.append(f'选择预计交货日期为 {so_data["expected_delivery_date"]}')
        if so_data.get("total_amount"):
            instructions.append(f'确认总金额为 {so_data["total_amount"]}')

        items = so_data.get("items", [])
        for i, item in enumerate(items):
            product_name = item.get("product_name", item.get("description_en", ""))
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0)
            instructions.append(
                f'在产品明细第{i+1}行，输入产品名称 "{product_name}"、数量 {qty}、单价 {price}'
            )

        self.fill_form(instructions)

    def fill_new_quotation_form(self, quotation_data: dict):
        """Fill a New Quotation form with structured data."""
        instructions = []

        if quotation_data.get("customer_name"):
            instructions.append(f'在客户名称输入框中输入 "{quotation_data["customer_name"]}"')
        if quotation_data.get("currency"):
            instructions.append(f'选择币种为 {quotation_data["currency"]}')
        if quotation_data.get("incoterm"):
            instructions.append(f'在贸易术语中选择 {quotation_data["incoterm"]}')
        if quotation_data.get("payment_terms"):
            instructions.append(f'在付款条款中输入 "{quotation_data["payment_terms"]}"')

        items = quotation_data.get("items", [])
        for i, item in enumerate(items):
            pn = item.get("product_name", item.get("description_en", ""))
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0)
            instructions.append(f'在明细第{i+1}行，输入产品 "{pn}"、数量 {qty}、单价 {price}')

        self.fill_form(instructions)

    def fill_new_po_form(self, po_data: dict):
        """Fill a New Purchase Order form with structured data."""
        instructions = []

        if po_data.get("supplier_name"):
            instructions.append(f'在供应商输入框中输入 "{po_data["supplier_name"]}"')
        if po_data.get("currency"):
            instructions.append(f'选择币种为 {po_data["currency"]}')
        if po_data.get("payment_terms"):
            instructions.append(f'在付款条款中输入 "{po_data["payment_terms"]}"')

        items = po_data.get("items", [])
        for i, item in enumerate(items):
            pn = item.get("product_name", item.get("description_en", ""))
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0)
            instructions.append(f'在明细第{i+1}行，输入产品 "{pn}"、数量 {qty}、单价 {price}')

        self.fill_form(instructions)

    def wait_for_user(self, message: str = "请确认表单信息无误后提交"):
        """Wait for the user to review and confirm in the browser."""
        print(f"\n{'='*60}")
        print(f"  {message}")
        print(f"  Browser is open at: {self.page.url}")
        print(f"  Review the form and click Submit when ready.")
        print(f"  Close the browser window or press Ctrl+C to cancel.")
        print(f"{'='*60}\n")

        while True:
            try:
                if self.page.is_closed():
                    print("  Browser closed by user.")
                    break
                time.sleep(1)
            except KeyboardInterrupt:
                print("\n  Cancelled by user.")
                break
            except Exception:
                break

    def close(self):
        try:
            if self.page and not self.page.is_closed():
                self.page.close()
        except Exception:
            pass
        try:
            if self.browser and self.browser.is_connected():
                self.browser.close()
        except Exception:
            pass
        try:
            if hasattr(self, '_pw'):
                self._pw.stop()
        except Exception:
            pass


def preview_and_confirm(
    form_type: str,
    form_data: dict,
    headless: bool = False,
    message: str = None,
) -> bool:
    """Quick one-shot: open browser, fill form, wait for user confirmation.

    Args:
        form_type: One of 'so', 'quotation', 'po'
        form_data: Form data dict
        headless: Run headless (default False so user can see the form)
        message: Custom confirmation message

    Returns:
        True if user completed review
    """
    messages = {
        "so": "请确认销售订单（SO）信息无误后提交",
        "quotation": "请确认报价单信息无误后提交",
        "po": "请确认采购订单（PO）信息无误后提交",
    }
    route_map = {
        "so": "/so/new",
        "quotation": "/quotations/new",
        "po": "/po/new",
    }
    fillers = {
        "so": "fill_new_so_form",
        "quotation": "fill_new_quotation_form",
        "po": "fill_new_po_form",
    }

    with PageAgentForm(headless=headless) as pa:
        pa.login()
        pa.navigate(route_map.get(form_type, f"/{form_type}/new"))
        filler = getattr(pa, fillers.get(form_type, ""))
        if filler:
            filler(form_data)
        pa.wait_for_user(message or messages.get(form_type, "请确认表单信息"))
    return True


__all__ = [
    "PageAgentForm",
    "preview_and_confirm",
]
