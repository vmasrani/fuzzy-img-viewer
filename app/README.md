# Fuzzy Image Viewer

High-performance image browser with fuzzy search and virtualized grid rendering. Accessible through your browser with a single command.

## Features

- **Fuzzy Search**: Lightning-fast fuzzy search across all images using fuzzysort with match highlighting
- **Recursive Scanning**: Automatically scans subdirectories for images (configurable depth)
- **Virtual Scrolling**: Smooth performance with thousands of images using TanStack Virtual
- **Thumbnail Generation**: Automatic thumbnail caching with SHA2-based hashing for fast loading
- **Multi-format Support**: PNG, JPG, JPEG, WebP, GIF
- **Multi-view Modes**: Grid, Detail (with zoom/pan), and Compare modes
- **Keyboard-first Navigation**: Full keyboard control for fast workflow
- **Cross-platform**: Works on macOS (Intel/ARM), Linux (x64/ARM64), and Windows

## Installation

```bash
npm install -g @vmasrani/fuzzy-img-viewer
```

## Usage

```bash
fuzzy-img-viewer /path/to/your/images
```

The viewer will start a local web server and automatically open in your browser at http://localhost:3000

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search box |
| `↑` `↓` `←` `→` | Navigate through images |
| `Enter` | Open detail view |
| `Space` | Toggle selection (for comparison) |
| `g` | Switch to grid view |
| `c` | Switch to compare view (for selected images) |
| `+` / `-` | Adjust thumbnail size |
| `Esc` | Close view / Clear search |

### Views

1. **Grid View**: Browse images as thumbnails in a virtualized grid
2. **Detail View**: View full-resolution image with zoom/pan (mouse wheel to zoom, drag to pan)
3. **Compare View**: View multiple selected images side-by-side

## Architecture

This package uses platform-specific binaries for cross-platform compatibility:

- **Frontend**: React + Vite → static files served by the backend
- **Backend**: Rust + Axum web server → REST API + static file serving
- **Distribution**: Main npm package + platform-specific binary packages
- **Installation**: Automatically selects and copies the correct binary for your platform

Platform packages:
- `@vmasrani/fuzzy-img-viewer-darwin-arm64` (macOS Apple Silicon)
- `@vmasrani/fuzzy-img-viewer-darwin-x64` (macOS Intel)
- `@vmasrani/fuzzy-img-viewer-linux-x64` (Linux x64)
- `@vmasrani/fuzzy-img-viewer-linux-arm64` (Linux ARM64)
- `@vmasrani/fuzzy-img-viewer-win32-x64` (Windows x64)

## Development

### Prerequisites

- **Node.js** 18+
- **Rust** 1.70+: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- (Optional) **cross**: `cargo install cross` for cross-compilation

### Setup

```bash
cd app
npm install
```

### Development Mode

```bash
# Terminal 1: Start backend with a folder path
cargo run --manifest-path=backend/Cargo.toml -- /path/to/images

# Terminal 2: Start frontend dev server
npm run dev
```

Visit http://localhost:5173 (frontend dev server with hot reload)

### Building

```bash
# Build frontend only
npm run build

# Build for your current platform
cd backend && cargo build --release

# Build for all platforms (requires cross-compilation setup)
./scripts/build-binaries.sh

# Build just for Linux (most common for deployment)
./scripts/build-linux.sh
```

### Testing Locally

```bash
# Test the install process
./scripts/test-install.sh

# Test with a local package
npm run build
npm pack
npm install -g vmasrani-fuzzy-img-viewer-0.1.1.tgz
fuzzy-img-viewer /path/to/images
```

## Publishing

See [PUBLISHING.md](./PUBLISHING.md) for detailed publishing instructions.

### Quick Publish Workflow

```bash
# 1. Bump version across all packages
./scripts/bump-version.sh 0.1.2

# 2. Commit version bump
git add -A && git commit -m "Bump version to 0.1.2"

# 3. Build Linux binary (most important for servers)
./scripts/build-linux.sh

# 4. Copy your macOS binary
cp backend/target/release/fuzzy-img-viewer-backend npm/darwin-arm64/

# 5. Build frontend
npm run build

# 6. Publish all packages
npm login
./scripts/publish-all.sh
```

## Performance

- Thumbnails are generated lazily (only for visible items)
- Thumbnails are cached using SHA256(path + mtime + size) as key
- Grid virtualization ensures smooth scrolling with 10k+ images
- Parallel thumbnail generation with rayon
- Fuzzy search optimized with fuzzysort prepared keys

## Troubleshooting

### Binary not found error

If you see "Backend binary not found" after installation, this usually means:
1. Your platform isn't supported (check `node -p "process.platform + '-' + process.arch"`)
2. The platform package failed to install (check npm logs)
3. The postinstall script failed (try running `node install.js` manually)

### Cross-compilation issues

For Linux builds on macOS, use `cross`:
```bash
cargo install cross
./scripts/build-linux.sh
```

## License

MIT
