#!/bin/bash
set -e

echo "🔨 Building local DMG..."
npm run build:local

DMG="dist/Polvoo-$(node -p "require('./package.json').version")-arm64.dmg"

echo "📦 Installing..."
# Close app if running
pkill -f "Polvoo" 2>/dev/null || true
sleep 1

# Mount DMG
MOUNT=$(hdiutil attach "$DMG" -nobrowse 2>/dev/null | grep '/Volumes/' | grep -o '/Volumes/.*')

# Copy app
rm -rf "/Applications/Polvoo.app"
cp -R "$MOUNT/Polvoo.app" /Applications/

# Unmount
hdiutil detach "$MOUNT" -quiet

# Remove quarantine
xattr -cr "/Applications/Polvoo.app"

echo "✅ Installed! Launching..."
open "/Applications/Polvoo.app"
