#!/bin/bash
set -e

# Build script for creating platform-specific binaries
# This requires Rust cross-compilation toolchains to be installed

echo "🔨 Building fuzzy-img-viewer binaries for all platforms..."

cd "$(dirname "$0")/../backend"

# Array of target platforms
declare -A TARGETS
TARGETS=(
  ["darwin-arm64"]="aarch64-apple-darwin"
  ["darwin-x64"]="x86_64-apple-darwin"
  ["linux-x64"]="x86_64-unknown-linux-gnu"
  ["linux-arm64"]="aarch64-unknown-linux-gnu"
  ["win32-x64"]="x86_64-pc-windows-gnu"
)

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
for platform in "${!TARGETS[@]}"; do
  target="${TARGETS[$platform]}"
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
echo "🎉 All binaries built successfully!"
echo ""
echo "Next steps:"
echo "  1. Test locally: npm run build && npm pack"
echo "  2. Publish platform packages: cd npm/[platform] && npm publish --access public"
echo "  3. Publish main package: npm publish --access public"
