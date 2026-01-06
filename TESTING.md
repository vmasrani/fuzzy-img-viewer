# Testing Release Process

This guide helps you test everything before making your first public release.

## Quick Local Test (5 minutes)

Test the entire build and package process locally:

```bash
./scripts/test-release.sh
```

This will:
- ✅ Build backend binaries (macOS only)
- ✅ Build frontend
- ✅ Create npm package
- ✅ Verify package contents
- ✅ Test binary execution

## Full Manual Test (10 minutes)

### 1. Test Local Installation

```bash
cd app
npm run build
npm pack

# Install globally to test
npm install -g ./vmasrani-fuzzy-img-viewer-0.1.3.tgz

# Test the CLI
fuzzy-img-viewer --help
cd ~/Pictures  # or any directory with images
fuzzy-img-viewer

# Uninstall when done
npm uninstall -g @vmasrani/fuzzy-img-viewer
```

### 2. Test GitHub Actions Locally (Optional)

Install [act](https://github.com/nektos/act) to run GitHub Actions locally:

```bash
# Install act
brew install act

# Test the workflow (won't actually publish)
act push --secret NPM_TOKEN=fake-token-for-testing -j build

# This will show you if the build steps work
```

Note: `act` has limitations (slower, Docker issues on ARM Mac), but it can catch syntax errors.

## Safe First Release Strategy

### Option 1: Test Branch First (Recommended)

Create a test release on a branch to verify the workflow:

```bash
# Create test branch
git checkout -b test-release

# Make a test version
./app/scripts/release.sh 0.1.4-beta.1

# Commit and tag
git add .
git commit -m 'Test release workflow'
git tag v0.1.4-beta.1

# Push to test branch (NOT main/master)
git push origin test-release
git push origin v0.1.4-beta.1

# Watch it run
gh run watch
```

If it works:
- Delete the test tag: `git tag -d v0.1.4-beta.1 && git push origin :refs/tags/v0.1.4-beta.1`
- Merge to main and do real release

If it fails:
- Fix the issues
- Delete the tag and try again

### Option 2: Just Go For It

The workflow is based on standard practices and should work. Worst case:
- Build fails → You can see the error and fix it
- Cancel the run: `gh run cancel`
- Delete the tag: `git tag -d v0.1.4 && git push origin :refs/tags/v0.1.4`
- Fix and retry

GitHub Actions failures are normal! Even big projects have them.

## Common Issues and Fixes

### Frontend Build Fails
```bash
cd app
npm install
npm run build
# Fix any TypeScript errors
```

### Backend Build Fails
```bash
cd app/backend
cargo check
cargo test
# Fix any Rust errors
```

### NPM Publish Fails
- Check `NPM_TOKEN` secret is set correctly
- Verify you have permission to publish to `@vmasrani` scope
- Check version doesn't already exist on npm

### GitHub Actions Syntax Error
```bash
# Validate workflow file
gh workflow view release
```

## Pre-Release Checklist

Before running `./app/scripts/release.sh`:

- [ ] `./scripts/test-release.sh` passes
- [ ] All changes committed to git
- [ ] Version number is correct
- [ ] `NPM_TOKEN` secret is set
- [ ] GitHub repo is public (or Actions are enabled for private)
- [ ] You're on the main/master branch

## Dry Run (No Publishing)

Want to test everything except npm publishing?

Temporarily modify `.github/workflows/release.yml`:

```yaml
# Comment out the npm publish steps
# - name: Publish platform packages
#   working-directory: app/npm
#   env:
#     NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
#   run: |
#     ... publishing commands ...
```

Then push a test tag. GitHub Actions will build everything but skip publishing.

## Monitoring Your First Release

```bash
# Watch in terminal
gh run watch

# View in browser
gh run view --web

# Check logs if something fails
gh run view --log-failed
```

The release takes about 10-15 minutes. Don't panic if it takes time - cross-compilation is slow!
