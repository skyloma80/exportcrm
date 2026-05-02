# ExportCRM One-Click Deploy
# Usage: .\deploy.ps1 [-ServerIP "42.194.150.84"] [-SkipBuild]

param(
    [string]$ServerIP = "69.5.23.121",
    [string]$ServerUser = "ubuntu",
    [string]$ServerPath = "/home/ubuntu/exportcrm",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$TarFile = "crm.tar"
$EnvFile = ".env.production"
$ComposeFile = "docker-compose.yml"
$MigrationsDir = "pocketbase/pb_migrations"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ExportCRM One-Click Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Server: $ServerIP" -ForegroundColor Gray
Write-Host "  Path:   $ServerPath" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
if (-not $SkipBuild) {
    Write-Host "[1/5] Building Docker image..." -ForegroundColor Yellow
    docker build -t crm:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Image built" -ForegroundColor Green
    Write-Host ""

    # Step 2: Export
    Write-Host "[2/5] Exporting image..." -ForegroundColor Yellow
    docker save crm:latest -o $TarFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Export failed" -ForegroundColor Red
        exit 1
    }
    $sizeBytes = (Get-Item $TarFile).Length
    $sizeMB = [math]::Round($sizeBytes / 1048576, 2)
    Write-Host "OK: Image exported ($sizeMB MB)" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "[1/5] Skipping build (-SkipBuild)" -ForegroundColor Gray
    Write-Host "[2/5] Skipping export" -ForegroundColor Gray
    Write-Host ""
}

# Step 3: Upload
Write-Host "[3/5] Uploading files to server..." -ForegroundColor Yellow

# Create directories and fix permissions
ssh ${ServerUser}@${ServerIP} "mkdir -p $ServerPath/pocketbase/pb_migrations $ServerPath/pocketbase/pb_data && sudo chown -R ${ServerUser}:${ServerUser} $ServerPath/pocketbase"

# Upload image
Write-Host "  - Uploading image..." -ForegroundColor Gray
scp $TarFile ${ServerUser}@${ServerIP}:${ServerPath}/
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Image upload failed" -ForegroundColor Red; exit 1 }

# Upload config files
Write-Host "  - Uploading config files..." -ForegroundColor Gray
scp $EnvFile ${ServerUser}@${ServerIP}:${ServerPath}/
scp $ComposeFile ${ServerUser}@${ServerIP}:${ServerPath}/
scp nginx.conf ${ServerUser}@${ServerIP}:${ServerPath}/
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Config upload failed" -ForegroundColor Red; exit 1 }

# Upload migrations
Write-Host "  - Uploading migrations..." -ForegroundColor Gray
if (Test-Path $MigrationsDir) {
    scp -r ${MigrationsDir}/* ${ServerUser}@${ServerIP}:${ServerPath}/pocketbase/pb_migrations/ 2>$null
}

Write-Host "OK: Files uploaded" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy
Write-Host "[4/5] Deploying services..." -ForegroundColor Yellow

$deployCmd = "cd $ServerPath && docker load -i $TarFile && docker-compose up -d --force-recreate && sleep 8"
ssh ${ServerUser}@${ServerIP} $deployCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deploy failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Services deployed" -ForegroundColor Green
Write-Host ""

# Step 5: Verify
Write-Host "[5/5] Verifying deployment..." -ForegroundColor Yellow

$verifyCmd = "cd $ServerPath && docker-compose ps && echo '--- PocketBase ---' && docker-compose logs --tail 10 pocketbase && echo '--- NextJS ---' && docker-compose logs --tail 5 nextjs"
ssh ${ServerUser}@${ServerIP} $verifyCmd

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  CRM:        http://${ServerIP}:3333" -ForegroundColor White
Write-Host "  PocketBase: http://${ServerIP}:8091/_/" -ForegroundColor White
Write-Host "  MinIO:      http://${ServerIP}:9001" -ForegroundColor White
Write-Host ""
