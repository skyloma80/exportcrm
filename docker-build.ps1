# Docker build and deployment script
# Usage: .\docker-build.ps1 [build|run|stop|clean|export|import|logs|shell]

param(
    [Parameter(Position=0)]
    [ValidateSet('build', 'run', 'stop', 'clean', 'export', 'import', 'logs', 'shell')]
    [string]$Action = 'build'
)

$ImageName = "crm:latest"
$ContainerName = "crm"
$TarFile = "crm.tar"

function Build-Image {
    Write-Host "Building Docker image..." -ForegroundColor Cyan
    docker build -t $ImageName .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Image built successfully!" -ForegroundColor Green
        docker images | Select-String $ImageName
    } else {
        Write-Host "Image build failed!" -ForegroundColor Red
        exit 1
    }
}

function Run-Container {
    Write-Host "Starting container..." -ForegroundColor Cyan
    
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
    
    docker run -d --name $ContainerName -p 3333:3333 --restart unless-stopped $ImageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container started successfully!" -ForegroundColor Green
        Write-Host "Access URL: http://localhost:3333" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        docker logs $ContainerName --tail 20
    } else {
        Write-Host "Container start failed!" -ForegroundColor Red
        exit 1
    }
}

function Stop-Container {
    Write-Host "Stopping container..." -ForegroundColor Cyan
    docker stop $ContainerName
    docker rm $ContainerName
    Write-Host "Container stopped and removed" -ForegroundColor Green
}

function Clean-Docker {
    Write-Host "Cleaning Docker resources..." -ForegroundColor Cyan
    
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
    docker rmi $ImageName 2>$null
    docker system prune -f
    
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

function Export-Image {
    Write-Host "Exporting image to $TarFile ..." -ForegroundColor Cyan
    docker save $ImageName -o $TarFile
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $TarFile).Length / 1MB
        Write-Host "Image exported successfully! Size: $([math]::Round($size, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "Image export failed!" -ForegroundColor Red
        exit 1
    }
}

function Import-Image {
    Write-Host "Importing image from $TarFile..." -ForegroundColor Cyan
    if (Test-Path $TarFile) {
        docker load -i $TarFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Image imported successfully!" -ForegroundColor Green
            docker images | Select-String $ImageName
        } else {
            Write-Host "Image import failed!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "File not found: $TarFile" -ForegroundColor Red
        exit 1
    }
}

function Show-Logs {
    Write-Host "Viewing container logs..." -ForegroundColor Cyan
    docker logs -f $ContainerName
}

function Enter-Shell {
    Write-Host "Entering container shell..." -ForegroundColor Cyan
    docker exec -it $ContainerName /bin/sh
}

switch ($Action) {
    'build'  { Build-Image }
    'run'    { Run-Container }
    'stop'   { Stop-Container }
    'clean'  { Clean-Docker }
    'export' { Export-Image }
    'import' { Import-Image }
    'logs'   { Show-Logs }
    'shell'  { Enter-Shell }
}
