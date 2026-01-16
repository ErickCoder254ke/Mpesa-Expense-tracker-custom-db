# Switch Deployment Method Helper Script (PowerShell)
# This script helps you quickly switch between different deployment configurations

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Deployment Method Switcher" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "railway.json") -and -not (Test-Path "railway.docker.json.backup") -and -not (Test-Path "railway.nixpacks.json")) {
    Write-Host "❌ Error: Could not find deployment config files." -ForegroundColor Red
    Write-Host "   Make sure you're in the project root directory." -ForegroundColor Red
    exit 1
}

Write-Host "Choose deployment method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1) Nixpacks (Recommended - No Docker Hub needed)"
Write-Host "2) Docker with retry logic (Enhanced Dockerfile)"
Write-Host "3) Docker with GCR mirror (For Docker Hub outages)"
Write-Host "4) Restore original Docker setup"
Write-Host "5) Show current setup"
Write-Host ""
$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔄 Switching to Nixpacks builder..." -ForegroundColor Yellow
        
        # Backup current railway.json if it exists
        if (Test-Path "railway.json") {
            Copy-Item "railway.json" "railway.json.backup" -Force
            Write-Host "✅ Backed up current railway.json" -ForegroundColor Green
        }
        
        # Use Nixpacks config
        if (Test-Path "railway.nixpacks.json") {
            Copy-Item "railway.nixpacks.json" "railway.json" -Force
            Write-Host "✅ Switched to Nixpacks configuration" -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 Next steps:" -ForegroundColor Cyan
            Write-Host "   1. git add railway.json nixpacks.toml"
            Write-Host "   2. git commit -m 'Switch to Nixpacks builder'"
            Write-Host "   3. git push"
            Write-Host ""
            Write-Host "✅ This will completely bypass Docker Hub!" -ForegroundColor Green
        } else {
            Write-Host "❌ Error: railway.nixpacks.json not found" -ForegroundColor Red
            exit 1
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔄 Switching to enhanced Dockerfile..." -ForegroundColor Yellow
        
        # Backup current Dockerfile
        if (Test-Path "Dockerfile") {
            Copy-Item "Dockerfile" "Dockerfile.backup" -Force
            Write-Host "✅ Backed up current Dockerfile" -ForegroundColor Green
        }
        
        # Restore railway.json for Docker
        if (Test-Path "railway.docker.json.backup") {
            Copy-Item "railway.docker.json.backup" "railway.json" -Force
            Write-Host "✅ Restored Docker-based railway.json" -ForegroundColor Green
        }
        
        Write-Host "✅ Using enhanced Dockerfile with retry logic" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. git add Dockerfile railway.json"
        Write-Host "   2. git commit -m 'Use enhanced Dockerfile with retry logic'"
        Write-Host "   3. git push"
        Write-Host ""
        Write-Host "ℹ️  This Dockerfile includes:" -ForegroundColor Cyan
        Write-Host "   - Specific Python version (3.11.7-slim-bookworm)"
        Write-Host "   - Increased timeouts (--default-timeout=100)"
        Write-Host "   - Retry logic (--retries 5)"
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔄 Switching to GCR mirror Dockerfile..." -ForegroundColor Yellow
        
        # Backup current Dockerfile
        if (Test-Path "Dockerfile") {
            Copy-Item "Dockerfile" "Dockerfile.dockerhub.backup" -Force
            Write-Host "✅ Backed up current Dockerfile" -ForegroundColor Green
        }
        
        # Use GCR Dockerfile
        if (Test-Path "Dockerfile.gcr") {
            Copy-Item "Dockerfile.gcr" "Dockerfile" -Force
            Write-Host "✅ Switched to GCR-based Dockerfile" -ForegroundColor Green
        } else {
            Write-Host "❌ Error: Dockerfile.gcr not found" -ForegroundColor Red
            exit 1
        }
        
        # Restore railway.json for Docker
        if (Test-Path "railway.docker.json.backup") {
            Copy-Item "railway.docker.json.backup" "railway.json" -Force
            Write-Host "✅ Restored Docker-based railway.json" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. git add Dockerfile railway.json"
        Write-Host "   2. git commit -m 'Switch to GCR mirror for Docker base image'"
        Write-Host "   3. git push"
        Write-Host ""
        Write-Host "✅ This uses Google Container Registry as a mirror!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        Write-Host "🔄 Restoring original Docker setup..." -ForegroundColor Yellow
        
        # Restore backups
        $restored = $false
        
        if (Test-Path "railway.docker.json.backup") {
            Copy-Item "railway.docker.json.backup" "railway.json" -Force
            Write-Host "✅ Restored original railway.json" -ForegroundColor Green
            $restored = $true
        }
        
        if (Test-Path "Dockerfile.dockerhub.backup") {
            Copy-Item "Dockerfile.dockerhub.backup" "Dockerfile" -Force
            Write-Host "✅ Restored original Dockerfile" -ForegroundColor Green
            $restored = $true
        } elseif (Test-Path "Dockerfile.backup") {
            Copy-Item "Dockerfile.backup" "Dockerfile" -Force
            Write-Host "✅ Restored Dockerfile from backup" -ForegroundColor Green
            $restored = $true
        }
        
        if ($restored) {
            Write-Host ""
            Write-Host "📝 Next steps:" -ForegroundColor Cyan
            Write-Host "   1. git add Dockerfile railway.json"
            Write-Host "   2. git commit -m 'Restore original Docker configuration'"
            Write-Host "   3. git push"
        } else {
            Write-Host "⚠️  No backups found to restore" -ForegroundColor Yellow
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "📊 Current Setup:" -ForegroundColor Cyan
        Write-Host "==================================" -ForegroundColor Cyan
        
        if (Test-Path "railway.json") {
            Write-Host ""
            Write-Host "📄 railway.json:" -ForegroundColor Yellow
            $content = Get-Content "railway.json" -Raw
            if ($content -match "nixpacks") {
                Write-Host "   ✅ Using Nixpacks builder (No Docker Hub dependency)" -ForegroundColor Green
            } elseif ($content -match "dockerfile") {
                Write-Host "   🐳 Using Dockerfile builder" -ForegroundColor Blue
            } else {
                Write-Host "   ❓ Unknown configuration" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ❌ No railway.json found" -ForegroundColor Red
        }
        
        if (Test-Path "Dockerfile") {
            Write-Host ""
            Write-Host "📄 Dockerfile:" -ForegroundColor Yellow
            $content = Get-Content "Dockerfile" -Raw
            if ($content -match "3.11.7-slim-bookworm") {
                Write-Host "   ✅ Using enhanced Dockerfile (with retry logic)" -ForegroundColor Green
            } elseif ($content -match "gcr.io") {
                Write-Host "   ✅ Using GCR mirror Dockerfile" -ForegroundColor Green
            } elseif ($content -match "3.11-slim") {
                Write-Host "   📦 Using standard Docker Hub image" -ForegroundColor Blue
            } else {
                Write-Host "   ❓ Unknown Dockerfile configuration" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ❌ No Dockerfile found" -ForegroundColor Red
        }
        
        if (Test-Path "nixpacks.toml") {
            Write-Host ""
            Write-Host "📄 nixpacks.toml: ✅ Present (ready for Nixpacks deployment)" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Backup files found:" -ForegroundColor Yellow
        $backups = Get-ChildItem -Filter "*.backup" -ErrorAction SilentlyContinue
        if ($backups) {
            foreach ($backup in $backups) {
                Write-Host "   - $($backup.Name)"
            }
        } else {
            Write-Host "   None"
        }
        
        Write-Host "==================================" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Invalid choice. Please run the script again and choose 1-5." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
