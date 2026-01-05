#!/bin/bash

set -e

echo "🏗️  Building AquaEye Viz for distribution..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Build frontend
echo ""
echo "📦 Building frontend..."
cd "$APP_DIR"
npm run build:frontend

# Build backend
echo ""
echo "🦀 Building Rust backend (release mode)..."
npm run build:backend

# Verify builds
echo ""
echo "✅ Build complete!"
echo ""
echo "Frontend: $APP_DIR/dist"
echo "Backend:  $APP_DIR/backend/target/release/aquaeye-viz-backend"
echo ""
echo "To package for distribution:"
echo "  npm pack"
echo ""
echo "To test locally:"
echo "  node bin/cli.js /path/to/images"
