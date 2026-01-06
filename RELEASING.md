# Release Process

This document explains the fully automated release process for fuzzy-img-viewer.

## One-Time Setup

### 1. Set up GitHub Repository

```bash
./scripts/setup-github.sh
```

This will:
- Create a public GitHub repository
- Push your code
- Set up the remote

### 2. Set up NPM Token

1. Create an npm access token:
   - Go to https://www.npmjs.com/settings/~/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token

2. Add it to GitHub secrets:
   ```bash
   gh secret set NPM_TOKEN
   # Paste your npm token when prompted
   ```

That's it! You're ready to publish.

## Releasing a New Version

### The Easy Way (Recommended)

```bash
# Update version and get ready to release
./app/scripts/release.sh 0.1.4

# Review changes
git diff

# Push and trigger automated release
git add . && git commit -m 'Release v0.1.4' && git tag v0.1.4 && git push && git push --tags
```

That's it! GitHub Actions will automatically:
1. ✅ Build binaries for all 5 platforms (macOS, Linux, Windows)
2. ✅ Publish all platform-specific npm packages
3. ✅ Publish the main npm package
4. ✅ Create a GitHub release with binaries attached

### What Happens Automatically

When you push a tag like `v0.1.4`:

1. **Build Job** (runs in parallel for all platforms):
   - macOS ARM64 (on native M1 runner)
   - macOS x64 (on native Intel runner)
   - Linux x64 (on Ubuntu runner)
   - Linux ARM64 (using cross with Docker)
   - Windows x64 (on Windows runner)

2. **Publish Platform Packages**:
   - Waits for all builds to complete
   - Publishes each platform package to npm:
     - `@vmasrani/fuzzy-img-viewer-darwin-arm64`
     - `@vmasrani/fuzzy-img-viewer-darwin-x64`
     - `@vmasrani/fuzzy-img-viewer-linux-x64`
     - `@vmasrani/fuzzy-img-viewer-linux-arm64`
     - `@vmasrani/fuzzy-img-viewer-win32-x64`

3. **Publish Main Package**:
   - Waits for platform packages
   - Builds the React frontend
   - Publishes `@vmasrani/fuzzy-img-viewer`

4. **Create GitHub Release**:
   - Creates a release on GitHub
   - Attaches all binaries as downloadable assets
   - Generates release notes from commits

### Monitoring the Release

Watch the progress:
```bash
# View in browser
gh run watch

# Or check status
gh run list
```

### If Something Goes Wrong

1. **Cancel a running release**:
   ```bash
   gh run cancel
   ```

2. **Delete a tag and retry**:
   ```bash
   git tag -d v0.1.4
   git push origin :refs/tags/v0.1.4
   ```

3. **Check logs**:
   ```bash
   gh run view --log
   ```

## Local Development Builds

For local testing (macOS only):
```bash
./app/scripts/build-binaries.sh
```

For all platforms locally (requires Docker):
```bash
BUILD_ALL=true ./app/scripts/build-binaries.sh
```

## Testing Before Release

```bash
# Build and test locally
cd app
npm run build
npm pack

# Install locally to test
npm install -g ./vmasrani-fuzzy-img-viewer-0.1.4.tgz

# Test the CLI
fuzzy-img-viewer --help
```

## Version Numbering

Follow semantic versioning:
- `0.1.x` - Bug fixes
- `0.x.0` - New features (backward compatible)
- `x.0.0` - Breaking changes

## Troubleshooting

### NPM_TOKEN Issues
If npm publish fails with authentication error:
```bash
# Regenerate npm token and update
gh secret set NPM_TOKEN
```

### Build Failures
Check the GitHub Actions logs:
```bash
gh run view --log-failed
```

Common issues:
- Rust compilation errors: Check `app/backend/Cargo.toml` dependencies
- Frontend build errors: Check `app/package.json` and TypeScript errors
- Platform-specific issues: Check the matrix build logs for that platform
