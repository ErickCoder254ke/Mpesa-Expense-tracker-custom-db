# Script to remove node_modules from Git tracking
# This script removes node_modules from Git's index without deleting the actual files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing .gitignore - Removing node_modules from Git tracking" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git"))
{
    Write-Host "ERROR: Not in a Git repository root directory!" -ForegroundColor Red
    Write-Host "Please run this script from the root of your Git repository." -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Removing node_modules from Git cache..." -ForegroundColor Yellow
Write-Host ""

# Remove root node_modules from Git tracking
if (Test-Path "node_modules")
{
    Write-Host "  Removing node_modules from Git tracking..." -ForegroundColor White
    git rm -r --cached node_modules 2>$null
    if ($LASTEXITCODE -eq 0)
    {
        Write-Host "  Successfully removed node_modules" -ForegroundColor Green
    }
    else
    {
        Write-Host "  node_modules may not have been tracked" -ForegroundColor Gray
    }
}
else
{
    Write-Host "  node_modules does not exist, skipping..." -ForegroundColor Gray
}

# Remove frontend/node_modules from Git tracking
if (Test-Path "frontend/node_modules")
{
    Write-Host "  Removing frontend/node_modules from Git tracking..." -ForegroundColor White
    git rm -r --cached frontend/node_modules 2>$null
    if ($LASTEXITCODE -eq 0)
    {
        Write-Host "  Successfully removed frontend/node_modules" -ForegroundColor Green
    }
    else
    {
        Write-Host "  frontend/node_modules may not have been tracked" -ForegroundColor Gray
    }
}
else
{
    Write-Host "  frontend/node_modules does not exist, skipping..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Adding .gitignore to staging..." -ForegroundColor Yellow
git add .gitignore

if ($LASTEXITCODE -eq 0)
{
    Write-Host "  .gitignore added successfully" -ForegroundColor Green
}
else
{
    Write-Host "  Failed to add .gitignore" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 3: Current Git status..." -ForegroundColor Yellow
Write-Host ""
git status

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To complete the fix, run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  git commit -m `"Fix .gitignore to properly exclude node_modules`"" -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
Write-Host ""
Write-Host "This will commit the changes and push to your repository." -ForegroundColor Gray
Write-Host ""
