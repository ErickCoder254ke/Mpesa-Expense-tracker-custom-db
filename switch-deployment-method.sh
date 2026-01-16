#!/bin/bash

# Switch Deployment Method Helper Script
# This script helps you quickly switch between different deployment configurations

set -e

echo "=================================="
echo "Deployment Method Switcher"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "railway.json" ] && [ ! -f "railway.docker.json.backup" ] && [ ! -f "railway.nixpacks.json" ]; then
    echo "❌ Error: Could not find deployment config files."
    echo "   Make sure you're in the project root directory."
    exit 1
fi

echo "Choose deployment method:"
echo ""
echo "1) Nixpacks (Recommended - No Docker Hub needed)"
echo "2) Docker with retry logic (Enhanced Dockerfile)"
echo "3) Docker with GCR mirror (For Docker Hub outages)"
echo "4) Restore original Docker setup"
echo "5) Show current setup"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔄 Switching to Nixpacks builder..."
        
        # Backup current railway.json if it exists
        if [ -f "railway.json" ]; then
            cp railway.json railway.json.backup
            echo "✅ Backed up current railway.json"
        fi
        
        # Use Nixpacks config
        if [ -f "railway.nixpacks.json" ]; then
            cp railway.nixpacks.json railway.json
            echo "✅ Switched to Nixpacks configuration"
            echo ""
            echo "📝 Next steps:"
            echo "   1. git add railway.json nixpacks.toml"
            echo "   2. git commit -m 'Switch to Nixpacks builder'"
            echo "   3. git push"
            echo ""
            echo "✅ This will completely bypass Docker Hub!"
        else
            echo "❌ Error: railway.nixpacks.json not found"
            exit 1
        fi
        ;;
        
    2)
        echo ""
        echo "🔄 Switching to enhanced Dockerfile..."
        
        # Backup current Dockerfile
        if [ -f "Dockerfile" ]; then
            cp Dockerfile Dockerfile.backup
            echo "✅ Backed up current Dockerfile"
        fi
        
        # Restore railway.json for Docker
        if [ -f "railway.docker.json.backup" ]; then
            cp railway.docker.json.backup railway.json
            echo "✅ Restored Docker-based railway.json"
        fi
        
        echo "✅ Using enhanced Dockerfile with retry logic"
        echo ""
        echo "📝 Next steps:"
        echo "   1. git add Dockerfile railway.json"
        echo "   2. git commit -m 'Use enhanced Dockerfile with retry logic'"
        echo "   3. git push"
        echo ""
        echo "ℹ️  This Dockerfile includes:"
        echo "   - Specific Python version (3.11.7-slim-bookworm)"
        echo "   - Increased timeouts (--default-timeout=100)"
        echo "   - Retry logic (--retries 5)"
        ;;
        
    3)
        echo ""
        echo "🔄 Switching to GCR mirror Dockerfile..."
        
        # Backup current Dockerfile
        if [ -f "Dockerfile" ]; then
            cp Dockerfile Dockerfile.dockerhub.backup
            echo "✅ Backed up current Dockerfile"
        fi
        
        # Use GCR Dockerfile
        if [ -f "Dockerfile.gcr" ]; then
            cp Dockerfile.gcr Dockerfile
            echo "✅ Switched to GCR-based Dockerfile"
        else
            echo "❌ Error: Dockerfile.gcr not found"
            exit 1
        fi
        
        # Restore railway.json for Docker
        if [ -f "railway.docker.json.backup" ]; then
            cp railway.docker.json.backup railway.json
            echo "✅ Restored Docker-based railway.json"
        fi
        
        echo ""
        echo "📝 Next steps:"
        echo "   1. git add Dockerfile railway.json"
        echo "   2. git commit -m 'Switch to GCR mirror for Docker base image'"
        echo "   3. git push"
        echo ""
        echo "✅ This uses Google Container Registry as a mirror!"
        ;;
        
    4)
        echo ""
        echo "🔄 Restoring original Docker setup..."
        
        # Restore backups
        restored=0
        
        if [ -f "railway.docker.json.backup" ]; then
            cp railway.docker.json.backup railway.json
            echo "✅ Restored original railway.json"
            restored=1
        fi
        
        if [ -f "Dockerfile.dockerhub.backup" ]; then
            cp Dockerfile.dockerhub.backup Dockerfile
            echo "✅ Restored original Dockerfile"
            restored=1
        elif [ -f "Dockerfile.backup" ]; then
            cp Dockerfile.backup Dockerfile
            echo "✅ Restored Dockerfile from backup"
            restored=1
        fi
        
        if [ $restored -eq 1 ]; then
            echo ""
            echo "📝 Next steps:"
            echo "   1. git add Dockerfile railway.json"
            echo "   2. git commit -m 'Restore original Docker configuration'"
            echo "   3. git push"
        else
            echo "⚠️  No backups found to restore"
        fi
        ;;
        
    5)
        echo ""
        echo "📊 Current Setup:"
        echo "=================================="
        
        if [ -f "railway.json" ]; then
            echo ""
            echo "📄 railway.json:"
            if grep -q "nixpacks" railway.json 2>/dev/null; then
                echo "   ✅ Using Nixpacks builder (No Docker Hub dependency)"
            elif grep -q "dockerfile" railway.json 2>/dev/null; then
                echo "   🐳 Using Dockerfile builder"
            else
                echo "   ❓ Unknown configuration"
            fi
        else
            echo "   ❌ No railway.json found"
        fi
        
        if [ -f "Dockerfile" ]; then
            echo ""
            echo "📄 Dockerfile:"
            if grep -q "3.11.7-slim-bookworm" Dockerfile 2>/dev/null; then
                echo "   ✅ Using enhanced Dockerfile (with retry logic)"
            elif grep -q "gcr.io" Dockerfile 2>/dev/null; then
                echo "   ✅ Using GCR mirror Dockerfile"
            elif grep -q "3.11-slim" Dockerfile 2>/dev/null; then
                echo "   📦 Using standard Docker Hub image"
            else
                echo "   ❓ Unknown Dockerfile configuration"
            fi
        else
            echo "   ❌ No Dockerfile found"
        fi
        
        if [ -f "nixpacks.toml" ]; then
            echo ""
            echo "📄 nixpacks.toml: ✅ Present (ready for Nixpacks deployment)"
        fi
        
        echo ""
        echo "Backup files found:"
        ls -1 *.backup 2>/dev/null || echo "   None"
        
        echo "=================================="
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1-5."
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
