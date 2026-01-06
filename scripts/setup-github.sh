#!/bin/bash
set -e

echo "🚀 Setting up GitHub repository..."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
  echo "❌ Error: GitHub CLI (gh) is not installed"
  echo "Install it with: brew install gh"
  exit 1
fi

echo "🔑 Re-authenticating with GitHub CLI (need repo creation permissions)..."
echo "   When prompted, make sure to select 'repo' scope"
echo ""
gh auth refresh -s repo

# Get repo name from package.json or use default
REPO_NAME="fuzzy-img-viewer"
DESCRIPTION="High-performance image browser with fuzzy search and virtualized grid rendering"

echo ""
echo "📦 Creating GitHub repository: $REPO_NAME"
echo "📝 Description: $DESCRIPTION"
echo ""

# Create the repository (public)
gh repo create "$REPO_NAME" \
  --public \
  --description "$DESCRIPTION" \
  --source=. \
  --remote=origin

echo ""
echo "✅ GitHub repository created!"
echo ""
echo "📤 Pushing code to GitHub..."
git push -u origin master

echo ""
echo "🎉 All set! Your repository is now at:"
gh repo view --web

echo ""
echo "🔐 Next step: Add NPM_TOKEN secret for automated publishing"
echo "   1. Create an npm access token at: https://www.npmjs.com/settings/~/tokens"
echo "   2. Add it to GitHub secrets with:"
echo "      gh secret set NPM_TOKEN"
echo ""
