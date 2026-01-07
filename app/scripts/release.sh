#!/bin/bash
set -e

# Release script - auto-bumps version and triggers automated release
# Usage:
#   ./scripts/release.sh        # bumps patch (0.1.6 -> 0.1.7)
#   ./scripts/release.sh minor  # bumps minor (0.1.6 -> 0.2.0)
#   ./scripts/release.sh major  # bumps major (0.1.6 -> 1.0.0)
#   ./scripts/release.sh 0.2.0  # sets explicit version

cd "$(dirname "$0")/.."

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Parse current version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Determine new version
if [ -z "$1" ] || [ "$1" = "patch" ]; then
  NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
elif [ "$1" = "minor" ]; then
  NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
elif [ "$1" = "major" ]; then
  NEW_VERSION="$((MAJOR + 1)).0.0"
else
  # Explicit version provided
  NEW_VERSION="$1"
fi

echo "🚀 Releasing v$NEW_VERSION..."
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes. They will be included in the release."
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Update Cargo.toml version
echo "📝 Updating backend/Cargo.toml..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" backend/Cargo.toml
else
  sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" backend/Cargo.toml
fi

# Update main package.json
echo "📝 Updating package.json..."
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
echo "📦 Committing and tagging..."
git add -A
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo ""
echo "🚀 Pushing to origin..."
git push
git push --tags

echo ""
echo "✅ Release v$NEW_VERSION triggered!"
echo ""
echo "🤖 GitHub Actions will now:"
echo "   • Build binaries for all platforms"
echo "   • Publish npm packages"
echo "   • Create GitHub release"
echo ""
echo "📊 Monitor: https://github.com/vmasrani/fuzzy-img-viewer/actions"
