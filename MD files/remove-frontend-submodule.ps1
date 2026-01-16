#!/usr/bin/env pwsh
# Script to remove frontend as a git submodule and convert it to a regular directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Removing Frontend Submodule" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Reset any staged changes
Write-Host "Step 1: Resetting staged changes..." -ForegroundColor Yellow
git reset
Write-Host "✓ Reset complete" -ForegroundColor Green
Write-Host ""

# Step 2: Remove the .git directory from inside frontend
Write-Host "Step 2: Removing .git directory from frontend..." -ForegroundColor Yellow
if (Test-Path "frontend\.git") {
    Remove-Item -Recurse -Force "frontend\.git"
    Write-Host "✓ Removed frontend\.git directory" -ForegroundColor Green
} else {
    Write-Host "! frontend\.git not found (may already be removed)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Add frontend as regular files
Write-Host "Step 3: Adding frontend as regular directory..." -ForegroundColor Yellow
git add frontend/
Write-Host "✓ Frontend added to git" -ForegroundColor Green
Write-Host ""

# Step 4: Add any other untracked files
Write-Host "Step 4: Adding other untracked files..." -ForegroundColor Yellow
git add .
Write-Host "✓ All files staged" -ForegroundColor Green
Write-Host ""

# Step 5: Show status
Write-Host "Step 5: Current git status:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git status
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Step 6: Ask for confirmation before committing
Write-Host "Ready to commit changes. Press any key to continue or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 7: Commit the changes
Write-Host "Step 6: Committing changes..." -ForegroundColor Yellow
git commit -m "Convert frontend from submodule to regular directory"
Write-Host "✓ Changes committed" -ForegroundColor Green
Write-Host ""

# Step 8: Ask before pushing
Write-Host "Ready to push to remote. Press any key to continue or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 9: Push to remote
Write-Host "Step 7: Pushing to remote..." -ForegroundColor Yellow
git push
Write-Host "✓ Pushed to remote" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Frontend submodule removal complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
