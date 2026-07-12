"""Auto-install missing dependencies."""
import subprocess
import importlib
import sys

REQUIRED = {
    "pdfplumber": "pdfplumber",
    "openpyxl": "openpyxl",
}


def ensure_deps():
    """Check and install missing Python packages."""
    missing = []
    for pkg, pip_name in REQUIRED.items():
        try:
            importlib.import_module(pkg)
        except ImportError:
            missing.append(pip_name)

    if not missing:
        return

    print(f"\n正在安装缺失依赖: {', '.join(missing)} ...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install"] + missing,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("依赖安装完成\n")
    except subprocess.CalledProcessError as e:
        print(f"依赖安装失败: {e}")
        print(f"请手动运行: pip install {' '.join(missing)}")
        raise
