# 清理测试数据脚本
# 使用方法: .\tmp_rovodev_cleanup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   清理测试数据工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$PB_URL = "http://127.0.0.1:8090"
$ADMIN_EMAIL = "admin@example.com"
$ADMIN_PASSWORD = "admin123456"

Write-Host "⚠️  警告：此操作将删除以下测试数据：" -ForegroundColor Yellow
Write-Host "  客户：CUS-2026-0006" -ForegroundColor Yellow
Write-Host "  供应商：SUP-2026-0002, SUP-2026-0005" -ForegroundColor Yellow
Write-Host "  以及所有相关的项目、订单、报价单等数据" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "确认删除吗？(输入 YES 继续)"

if ($confirmation -ne "YES") {
    Write-Host "已取消操作" -ForegroundColor Gray
    exit
}

Write-Host ""
Write-Host "开始清理..." -ForegroundColor Green

# 设置环境变量
$env:PB_URL = $PB_URL
$env:ADMIN_EMAIL = $ADMIN_EMAIL
$env:ADMIN_PASSWORD = $ADMIN_PASSWORD

# 运行清理脚本
node tmp_rovodev_cleanup_test_data.js

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   清理完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
