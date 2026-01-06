#!/bin/bash
set -e

# Build script for creating platform-specific binaries
# This requires Rust cross-compilation toolchains to be installed

echo "🔨 Building fuzzy-img-viewer binaries..."

cd "$(dirname "$0")/../backend"

# Determine which platforms to build
# By default, only build macOS targets locally (Linux/Windows need Docker/cross)
if [[ "${BUILD_ALL:-}" == "true" ]]; then
  echo "📋 Building for ALL platforms (requires Docker for Linux/Windows)"
  PLATFORMS=("darwin-arm64" "darwin-x64" "linux-x64" "linux-arm64" "win32-x64")
  TARGETS=("aarch64-apple-darwin" "x86_64-apple-darwin" "x86_64-unknown-linux-gnu" "aarch64-unknown-linux-gnu" "x86_64-pc-windows-gnu")
else
  echo "📋 Building for macOS only (use BUILD_ALL=true for all platforms)"
  PLATFORMS=("darwin-arm64" "darwin-x64")
  TARGETS=("aarch64-apple-darwin" "x86_64-apple-darwin")
fi

# Check if cross is installed (better for cross-compilation)
if command -v cross &> /dev/null; then
  BUILD_CMD="cross"
  echo "✅ Using 'cross' for cross-compilation"
else
  BUILD_CMD="cargo"
  echo "⚠️  Using 'cargo' - some targets may not work without proper setup"
  echo "   Consider installing 'cross': cargo install cross"
fi

# Build for each target
for i in "${!PLATFORMS[@]}"; do
  platform="${PLATFORMS[$i]}"
  target="${TARGETS[$i]}"
  echo ""
  echo "📦 Building for $platform ($target)..."

  # Build the binary
  $BUILD_CMD build --release --target "$target"

  # Determine binary name and extension
  if [[ $platform == win32-* ]]; then
    binary_name="fuzzy-img-viewer-backend.exe"
  else
    binary_name="fuzzy-img-viewer-backend"
  fi

  # Copy to the npm platform directory
  npm_dir="../npm/$platform"
  mkdir -p "$npm_dir"

  cp "target/$target/release/$binary_name" "$npm_dir/"

  echo "✅ Copied binary to $npm_dir/$binary_name"
done

echo ""
echo "🎉 Binaries built successfully!"
echo ""
if [[ "${BUILD_ALL:-}" != "true" ]]; then
  echo "💡 Note: Only macOS binaries were built"
  echo "   To build all platforms locally: BUILD_ALL=true ./scripts/build-binaries.sh"
  echo "   (requires Docker running for Linux/Windows targets)"
  echo "   Or use GitHub Actions for full cross-platform builds"
  echo ""
fi
echo "Next steps:"
echo "  1. Test locally: npm run build && npm pack"
echo "  2. Publish platform packages: cd npm/[platform] && npm publish --access public"
echo "  3. Publish main package: npm publish --access public"
