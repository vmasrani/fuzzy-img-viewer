# Publishing Guide

This package uses platform-specific binaries to ensure the Rust backend works on all platforms.

## Architecture

The package is split into:
- **Main package** (`@vmasrani/fuzzy-img-viewer`): Contains the frontend and CLI
- **Platform packages**: Each contains a pre-compiled binary for a specific platform:
  - `@vmasrani/fuzzy-img-viewer-darwin-arm64` (macOS Apple Silicon)
  - `@vmasrani/fuzzy-img-viewer-darwin-x64` (macOS Intel)
  - `@vmasrani/fuzzy-img-viewer-linux-x64` (Linux x64)
  - `@vmasrani/fuzzy-img-viewer-linux-arm64` (Linux ARM64)
  - `@vmasrani/fuzzy-img-viewer-win32-x64` (Windows x64)

## How It Works

1. When users install the main package, npm automatically tries to install the matching platform package from `optionalDependencies`
2. The `postinstall` script (`install.js`) runs and copies the correct binary from the platform package to `bin/`
3. The CLI (`bin/cli.js`) executes the binary from the `bin/` directory

## Building & Publishing

### Prerequisites

For cross-compilation, install [cross](https://github.com/cross-rs/cross):
```bash
cargo install cross
```

### Build Process

1. **Build all platform binaries:**
   ```bash
   ./scripts/build-binaries.sh
   ```

   This compiles the Rust backend for all platforms and copies them to `npm/[platform]/`

2. **Build the frontend:**
   ```bash
   npm run build
   ```

3. **Test locally (optional):**
   ```bash
   npm pack
   npm install -g vmasrani-fuzzy-img-viewer-0.1.1.tgz
   ```

### Publishing

1. **Bump version** in all package.json files:
   - `app/package.json`
   - `app/npm/darwin-arm64/package.json`
   - `app/npm/darwin-x64/package.json`
   - `app/npm/linux-x64/package.json`
   - `app/npm/linux-arm64/package.json`
   - `app/npm/win32-x64/package.json`

2. **Login to npm:**
   ```bash
   npm login
   ```

3. **Publish all packages:**
   ```bash
   ./scripts/publish-all.sh
   ```

   This will:
   - Publish all 5 platform packages
   - Publish the main package

## Manual Publishing

If you prefer to publish manually:

```bash
# Publish platform packages first
cd npm/darwin-arm64 && npm publish --access public && cd ../..
cd npm/darwin-x64 && npm publish --access public && cd ../..
cd npm/linux-x64 && npm publish --access public && cd ../..
cd npm/linux-arm64 && npm publish --access public && cd ../..
cd npm/win32-x64 && npm publish --access public && cd ../..

# Then publish the main package
npm publish --access public
```

## Version Management

Always keep versions in sync across all packages. The main package's `optionalDependencies` must reference the exact versions of the platform packages.

## Troubleshooting

### Binary not found on user's machine

If users report "Backend binary not found", it usually means:
1. Their platform isn't supported
2. The platform package failed to install (check npm logs)
3. The postinstall script failed

Ask them to check:
```bash
npm ls @vmasrani/fuzzy-img-viewer-[their-platform]
```

### Cross-compilation fails

Some platforms may require additional setup:
- **Linux targets**: May need `musl` or `glibc` toolchains
- **Windows targets**: May need `mingw-w64`
- **macOS cross-compilation from Linux**: Requires OSXCross

Consider using GitHub Actions for building on native platforms instead.
