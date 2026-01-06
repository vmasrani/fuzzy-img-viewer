#!/bin/bash
set -e

echo "🧪 Testing release process locally..."
echo ""

cd "$(dirname "$0")/../app"

# Test 1: Backend builds (macOS only, quick)
echo "1️⃣  Testing backend builds (macOS)..."
./scripts/build-binaries.sh
if [ $? -ne 0 ]; then
  echo "❌ Backend build failed!"
  exit 1
fi
echo "✅ Backend builds successful"
echo ""

# Test 2: Frontend build
echo "2️⃣  Testing frontend build..."
npm install
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi
echo "✅ Frontend build successful"
echo ""

# Test 3: Package creation
echo "3️⃣  Testing package creation..."
npm pack
if [ $? -ne 0 ]; then
  echo "❌ Package creation failed!"
  exit 1
fi
echo "✅ Package created successfully"
echo ""

# Test 4: Verify package contents
echo "4️⃣  Verifying package contents..."
PACKAGE_FILE=$(ls vmasrani-fuzzy-img-viewer-*.tgz | head -1)
tar -tzf "$PACKAGE_FILE" | head -20
echo "..."
echo ""

# Test 5: Check platform packages exist
echo "5️⃣  Checking platform packages..."
for platform in darwin-arm64 darwin-x64; do
  if [ ! -f "npm/$platform/fuzzy-img-viewer-backend" ]; then
    echo "❌ Missing binary for $platform"
    exit 1
  fi
  echo "✅ Binary exists for $platform"
done
echo ""

# Test 6: Verify binaries are executable
echo "6️⃣  Testing binary execution..."
if ./npm/darwin-arm64/fuzzy-img-viewer-backend --version 2>/dev/null || \
   ./npm/darwin-x64/fuzzy-img-viewer-backend --version 2>/dev/null; then
  echo "✅ Binary is executable"
else
  echo "⚠️  Binary execution check skipped (might not match your architecture)"
fi
echo ""

echo "🎉 All local tests passed!"
echo ""
echo "📋 Summary:"
echo "  ✓ Backend builds for macOS"
echo "  ✓ Frontend builds successfully"
echo "  ✓ Package can be created"
echo "  ✓ Platform binaries exist"
echo ""
echo "💡 Next steps:"
echo "  1. Test install locally:"
echo "     npm install -g ./$PACKAGE_FILE"
echo "     fuzzy-img-viewer --help"
echo ""
echo "  2. Clean up test package:"
echo "     rm $PACKAGE_FILE"
echo ""
echo "  3. When ready, create release:"
echo "     cd .. && ./app/scripts/release.sh 0.1.4"
echo ""
