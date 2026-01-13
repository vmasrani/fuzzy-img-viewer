# Fuzzy Image Viewer - Development Commands

# Default recipe - show available commands
default:
    @just --list

# Release a new version (triggers GitHub Actions for all platforms)
# Usage: just release          # patch bump (0.1.6 -> 0.1.7)
#        just release minor    # minor bump (0.1.6 -> 0.2.0)
#        just release major    # major bump (0.1.6 -> 1.0.0)
#        just release 0.2.0    # explicit version
release *VERSION:
    cd app && ./scripts/release.sh {{VERSION}}

# Test the release process locally before deploying
test-release:
    ./scripts/test-release.sh

# Build binaries for macOS only (quick local build)
build:
    cd app && ./scripts/build-binaries.sh

# Build binaries for ALL platforms (requires Docker)
build-all:
    cd app && BUILD_ALL=true ./scripts/build-binaries.sh

# Publish all packages to npm manually (usually handled by GitHub Actions)
publish:
    cd app && ./scripts/publish-all.sh

# Install dependencies and build frontend
dev:
    cd app && npm install && npm run build

# Start the app locally
start:
    cd app && ./start.sh

# Show current version
version:
    @node -p "require('./app/package.json').version"
