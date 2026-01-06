#!/bin/bash
set -e

# Test the install process locally before publishing

echo "🧪 Testing install process..."

cd "$(dirname "$0")/.."

# Clean up previous test
rm -rf bin/fuzzy-img-viewer-backend test-install
mkdir -p test-install

echo ""
echo "1. Creating test environment..."

# Create a fake node_modules structure
mkdir -p test-install/node_modules/@vmasrani/fuzzy-img-viewer-darwin-arm64
cp npm/darwin-arm64/fuzzy-img-viewer-backend test-install/node_modules/@vmasrani/fuzzy-img-viewer-darwin-arm64/

# Copy install script
cp install.js test-install/
cp -r bin test-install/ || mkdir -p test-install/bin
cp bin/cli.js test-install/bin/ 2>/dev/null || true

echo ""
echo "2. Running install script..."
cd test-install
node install.js

echo ""
echo "3. Verifying binary was copied..."
if [ -f "bin/fuzzy-img-viewer-backend" ]; then
  echo "✅ Binary found at bin/fuzzy-img-viewer-backend"
  ls -lh bin/fuzzy-img-viewer-backend
else
  echo "❌ Binary not found!"
  exit 1
fi

echo ""
echo "4. Checking if binary is executable..."
if [ -x "bin/fuzzy-img-viewer-backend" ]; then
  echo "✅ Binary is executable"
else
  echo "❌ Binary is not executable!"
  exit 1
fi

cd ..
rm -rf test-install

echo ""
echo "🎉 Install test passed!"
echo ""
echo "Next steps:"
echo "  1. Build for Linux: Install cross-compilation tools or use GitHub Actions"
echo "  2. Copy Linux binary to npm/linux-x64/"
echo "  3. Publish platform packages: ./scripts/publish-all.sh"
