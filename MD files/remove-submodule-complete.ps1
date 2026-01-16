# Comprehensive script to completely remove frontend submodule and convert to regular directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Frontend Submodule Removal" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current git status
Write-Host "Step 1: Current git status:" -ForegroundColor Yellow
git status
Write-Host ""

# Step 2: Remove frontend from git's index (this is the KEY step)
Write-Host "Step 2: Removing frontend from git's index/cache..." -ForegroundColor Yellow
git rm --cached -r frontend 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend removed from git index" -ForegroundColor Green
}
else {
    Write-Host "Frontend may not be in index (continuing anyway)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Remove .gitmodules if it exists and only contains frontend
Write-Host "Step 3: Checking for .gitmodules file..." -ForegroundColor Yellow
if (Test-Path ".gitmodules") {
    $content = Get-Content ".gitmodules" -Raw -ErrorAction SilentlyContinue
    if ($content -match "frontend") {
        Remove-Item ".gitmodules" -Force
        git rm --cached .gitmodules 2>$null
        Write-Host "Removed .gitmodules file" -ForegroundColor Green
    }
    else {
        Write-Host ".gitmodules contains other submodules, keeping it" -ForegroundColor Yellow
    }
}
else {
    Write-Host "No .gitmodules file found" -ForegroundColor Green
}
Write-Host ""

# Step 4: Remove .git directory from inside frontend (if still there)
Write-Host "Step 4: Ensuring frontend\.git is removed..." -ForegroundColor Yellow
if (Test-Path "frontend\.git") {
    Remove-Item -Recurse -Force "frontend\.git"
    Write-Host "Removed frontend\.git directory" -ForegroundColor Green
}
else {
    Write-Host "frontend\.git already removed" -ForegroundColor Green
}
Write-Host ""

# Step 5: Now add frontend as regular files
Write-Host "Step 5: Adding frontend as regular directory..." -ForegroundColor Yellow
git add frontend/
Write-Host "Frontend added as regular files" -ForegroundColor Green
Write-Host ""

# Step 6: Add the script and any other files
Write-Host "Step 6: Adding other files..." -ForegroundColor Yellow
git add remove-submodule-complete.ps1
git add ANALYTICS_TEST_CHECKLIST.md 2>$null
Write-Host "Other files added" -ForegroundColor Green
Write-Host ""

# Step 7: Show what's about to be committed
Write-Host "Step 7: Changes to be committed:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git status
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Step 8: Show a summary of changes
Write-Host "Step 8: Summary of changes:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
git diff --cached --stat
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Step 9: Ask for confirmation before committing
Write-Host "Review the changes above." -ForegroundColor Cyan
Write-Host "Press any key to commit, or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 10: Commit the changes
Write-Host "Step 9: Committing changes..." -ForegroundColor Yellow
git commit -m "Convert frontend from submodule to regular directory"
Write-Host "Changes committed" -ForegroundColor Green
Write-Host ""

# Step 11: Show commit
Write-Host "Step 10: Last commit:" -ForegroundColor Yellow
git log -1 --stat
Write-Host ""

# Step 12: Ask before pushing
Write-Host "Ready to push to remote repository." -ForegroundColor Cyan
Write-Host "Press any key to push, or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 13: Push to remote
Write-Host "Step 11: Pushing to remote..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to remote" -ForegroundColor Green
}
else {
    Write-Host "Push failed - check error above" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Frontend is now a regular directory!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The frontend folder is now tracked as regular files in your repository." -ForegroundColor White
Write-Host "You can verify by running: git log -1 --stat" -ForegroundColor Gray
