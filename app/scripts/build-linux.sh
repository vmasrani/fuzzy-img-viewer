#!/bin/bash
set -e

# Quick script to build just the Linux x64 binary
# This is the most common use case for cross-platform npm packages

echo "🐧 Building fuzzy-img-viewer for Linux x64..."
echo ""

cd "$(dirname "$0")/../backend"

# Check if cross is installed
if command -v cross &> /dev/null; then
  echo "✅ Using 'cross' for cross-compilation"
  cross build --release --target x86_64-unknown-linux-gnu
elif command -v cargo &> /dev/null; then
  echo "⚠️  Using 'cargo' - make sure you have the Linux target installed:"
  echo "   rustup target add x86_64-unknown-linux-gnu"
  echo ""
  cargo build --release --target x86_64-unknown-linux-gnu
else
  echo "❌ Neither 'cross' nor 'cargo' found!"
  echo "   Install Rust from https://rustup.rs/"
  exit 1
fi

# Copy to the npm platform directory
npm_dir="../npm/linux-x64"
mkdir -p "$npm_dir"

if [ -f "target/x86_64-unknown-linux-gnu/release/fuzzy-img-viewer-backend" ]; then
  cp "target/x86_64-unknown-linux-gnu/release/fuzzy-img-viewer-backend" "$npm_dir/"
  echo ""
  echo "✅ Linux binary built and copied to $npm_dir/"
  ls -lh "$npm_dir/fuzzy-img-viewer-backend"
else
  echo ""
  echo "❌ Build failed - binary not found"
  exit 1
fi

echo ""
echo "🎉 Done! You can now:"
echo "  1. Test: cd npm/linux-x64 && npm pack"
echo "  2. Publish: cd npm/linux-x64 && npm publish --access public"
