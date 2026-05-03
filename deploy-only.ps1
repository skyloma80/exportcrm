# Deploy using docker-compose
# Usage: .\deploy-only.ps1 -ServerIP "42.194.150.84" -ServerUser "ubuntu"

param(
    [Parameter(Mandatory = $true)]
    [string]$ServerIP = "42.194.150.84",
    [string]$ServerUser = "ubuntu",
    [string]$ServerPath = "/home/ubuntu/exportcrm"
)

$TarFile = "crm.tar"
$EnvFile = ".env.production"
$ComposeFile = "docker-compose.yml"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy with Docker Compose" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check files
if (!(Test-Path $TarFile)) {
    Write-Host "ERROR: $TarFile not found. Run: .\docker-build.ps1 export" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $EnvFile)) {
    Write-Host "ERROR: $EnvFile not found" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $ComposeFile)) {
    Write-Host "ERROR: $ComposeFile not found" -ForegroundColor Red
    exit 1
}

# Create remote directory
Write-Host "Step 0: Creating remote directory..." -ForegroundColor Yellow
ssh ${ServerUser}@${ServerIP} "mkdir -p $ServerPath"

Write-Host "Step 1: Uploading image..." -ForegroundColor Yellow
scp $TarFile ${ServerUser}@${ServerIP}:${ServerPath}/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Image uploaded" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Uploading config files..." -ForegroundColor Yellow
scp $EnvFile ${ServerUser}@${ServerIP}:${ServerPath}/
scp $ComposeFile ${ServerUser}@${ServerIP}:${ServerPath}/
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Config files uploaded" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2.5: Uploading PocketBase migrations..." -ForegroundColor Yellow
ssh ${ServerUser}@${ServerIP} "mkdir -p $ServerPath/pocketbase/pb_migrations"
scp -r pocketbase/pb_migrations/* ${ServerUser}@${ServerIP}:${ServerPath}/pocketbase/pb_migrations/
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Migrations upload failed (may not exist)" -ForegroundColor Yellow
}
else {
    Write-Host "OK: Migrations uploaded" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Deploying on server..." -ForegroundColor Yellow

$deployScript = "cd $ServerPath && " +
"echo 'Loading image...' && " +
"docker load -i $TarFile && " +
"echo 'Restarting services (keeping data)...' && " +
"docker-compose up -d --force-recreate && " +
"echo 'Waiting for PocketBase to apply migrations...' && " +
"sleep 10 && " +
"echo 'Container status:' && " +
"docker-compose ps && " +
"echo 'PocketBase logs:' && " +
"docker-compose logs --tail 30 pocketbase && " +
"echo 'NextJS logs:' && " +
"docker-compose logs --tail 20 nextjs"

ssh ${ServerUser}@${ServerIP} "$deployScript"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Green
    Write-Host "  - CRM:        http://${ServerIP}:3333" -ForegroundColor Green
    Write-Host "  - PocketBase: http://${ServerIP}:8091/_/" -ForegroundColor Green
    Write-Host "  - MinIO:      http://${ServerIP}:9001" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    exit 1
}
