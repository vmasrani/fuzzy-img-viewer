#!/bin/bash
set -e

# Script to publish all platform packages and the main package
# Make sure you've built all binaries first with ./scripts/build-binaries.sh

echo "📦 Publishing all fuzzy-img-viewer packages..."
echo ""

# Check if logged into npm
if ! npm whoami &> /dev/null; then
  echo "❌ Not logged into npm. Please run: npm login"
  exit 1
fi

# Publish each platform package
for platform in darwin-arm64 darwin-x64 linux-x64 linux-arm64 win32-x64; do
  echo "Publishing @vmasrani/fuzzy-img-viewer-$platform..."
  cd "npm/$platform"

  # Check if binary exists
  if [[ $platform == win32-* ]]; then
    binary_name="fuzzy-img-viewer-backend.exe"
  else
    binary_name="fuzzy-img-viewer-backend"
  fi

  if [ ! -f "$binary_name" ]; then
    echo "❌ Binary not found at npm/$platform/$binary_name"
    echo "   Please run ./scripts/build-binaries.sh first"
    exit 1
  fi

  # Publish
  npm publish --access public || echo "⚠️  Package may already be published"

  cd ../..
  echo ""
done

echo "Publishing main package @vmasrani/fuzzy-img-viewer..."
npm publish --access public || echo "⚠️  Package may already be published"

echo ""
echo "🎉 All packages published successfully!"
