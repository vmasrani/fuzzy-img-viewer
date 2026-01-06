#!/bin/bash
set -e

# Script to bump version across all packages

if [ -z "$1" ]; then
  echo "Usage: ./scripts/bump-version.sh <new-version>"
  echo "Example: ./scripts/bump-version.sh 0.1.2"
  exit 1
fi

NEW_VERSION="$1"

echo "📦 Bumping version to $NEW_VERSION across all packages..."
echo ""

cd "$(dirname "$0")/.."

# Update main package
echo "Updating main package.json..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json
sed -i.bak "s/\"@vmasrani\/fuzzy-img-viewer-.*\": \"[^\"]*\"/\"@vmasrani\/fuzzy-img-viewer-darwin-arm64\": \"$NEW_VERSION\",\n    \"@vmasrani\/fuzzy-img-viewer-darwin-x64\": \"$NEW_VERSION\",\n    \"@vmasrani\/fuzzy-img-viewer-linux-x64\": \"$NEW_VERSION\",\n    \"@vmasrani\/fuzzy-img-viewer-linux-arm64\": \"$NEW_VERSION\",\n    \"@vmasrani\/fuzzy-img-viewer-win32-x64\": \"$NEW_VERSION\"/" package.json

# Update platform packages
for platform in darwin-arm64 darwin-x64 linux-x64 linux-arm64 win32-x64; do
  echo "Updating npm/$platform/package.json..."
  sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "npm/$platform/package.json"
  rm "npm/$platform/package.json.bak"
done

rm package.json.bak

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add -A && git commit -m 'Bump version to $NEW_VERSION'"
echo "  3. Build binaries: ./scripts/build-binaries.sh (or ./scripts/build-linux.sh for quick Linux build)"
echo "  4. Publish: ./scripts/publish-all.sh"
