#!/bin/bash
# Script to remove node_modules from Git tracking
# This script removes node_modules from Git's index without deleting the actual files

echo "========================================"
echo "Fixing .gitignore - Removing node_modules from Git tracking"
echo "========================================"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "ERROR: Not in a Git repository root directory!"
    echo "Please run this script from the root of your Git repository."
    exit 1
fi

echo "Step 1: Removing node_modules from Git cache..."
echo ""

# Remove node_modules directories from Git tracking
NODE_MODULES_PATHS=("node_modules" "frontend/node_modules")

for path in "${NODE_MODULES_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "  Removing $path from Git tracking..."
        if git rm -r --cached "$path" 2>/dev/null; then
            echo "  ✓ Successfully removed $path"
        else
            echo "  ℹ $path may not have been tracked"
        fi
    else
        echo "  ℹ $path does not exist, skipping..."
    fi
done

echo ""
echo "Step 2: Adding .gitignore to staging..."
git add .gitignore

if [ $? -eq 0 ]; then
    echo "  ✓ .gitignore added successfully"
else
    echo "  ✗ Failed to add .gitignore"
fi

echo ""
echo "Step 3: Current Git status..."
echo ""
git status

echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo ""
echo "To complete the fix, run:"
echo ""
echo '  git commit -m "Fix .gitignore to properly exclude node_modules"'
echo "  git push"
echo ""
echo "This will commit the changes and push to your repository."
echo ""
