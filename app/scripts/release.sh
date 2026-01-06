#!/bin/bash
set -e

# Release script - updates version and triggers automated release
# Usage: ./scripts/release.sh 0.1.4

if [ -z "$1" ]; then
  echo "❌ Error: Version number required"
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.1.4"
  exit 1
fi

NEW_VERSION="$1"

echo "🚀 Preparing release v$NEW_VERSION..."
echo ""

# Update Cargo.toml version
echo "📝 Updating backend/Cargo.toml..."
cd "$(dirname "$0")/.."
sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" backend/Cargo.toml

# Update main package.json
echo "📝 Updating app/package.json..."
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  pkg.optionalDependencies = {
    '@vmasrani/fuzzy-img-viewer-darwin-arm64': '$NEW_VERSION',
    '@vmasrani/fuzzy-img-viewer-darwin-x64': '$NEW_VERSION',
    '@vmasrani/fuzzy-img-viewer-linux-x64': '$NEW_VERSION',
    '@vmasrani/fuzzy-img-viewer-linux-arm64': '$NEW_VERSION',
    '@vmasrani/fuzzy-img-viewer-win32-x64': '$NEW_VERSION'
  };
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update platform package.json files
for platform in darwin-arm64 darwin-x64 linux-x64 linux-arm64 win32-x64; do
  echo "📝 Updating npm/$platform/package.json..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('npm/$platform/package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('npm/$platform/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
done

echo ""
echo "✅ Version updated to $NEW_VERSION in all package.json files"
echo ""
echo "📋 Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Commit and tag: git add . && git commit -m 'Bump version to $NEW_VERSION' && git tag v$NEW_VERSION"
echo "  3. Push with tags: git push && git push --tags"
echo ""
echo "🤖 After pushing the tag, GitHub Actions will automatically:"
echo "  ✓ Build binaries for all platforms"
echo "  ✓ Publish all npm packages"
echo "  ✓ Create a GitHub release"
echo ""
echo "Or run this all-in-one command:"
echo "  git add . && git commit -m 'Release v$NEW_VERSION' && git tag v$NEW_VERSION && git push && git push --tags"
