# AquaEye Viz - Web App

A high-performance image browser with fzf-like fuzzy search, virtualized grid rendering, and keyboard-first navigation. Now accessible through your browser!

## Features

- **fzf-like Search**: Instant, incremental fuzzy search with match highlighting
- **Virtualized Grid**: Smoothly browse thousands of images with TanStack Virtual
- **Keyboard Navigation**: Full keyboard control for fast workflow
- **Smart Thumbnail Caching**: Fast thumbnail generation with SHA2-based caching
- **Filename Parsing**: Automatic extraction of metadata from filenames (dates, subjects, series, frame numbers)
- **Multi-view Modes**: Grid, Detail (with zoom/pan), and Compare modes
- **Multi-selection**: Select multiple images for comparison
- **Browser-based**: Access through Chrome/Firefox - no desktop environment needed!

## Architecture

- **Frontend**: React + Vite → builds to static files
- **Backend**: Rust + Axum web server → serves both API and static frontend
- **Communication**: REST API
- **Distribution**: Single Rust binary + static files, packaged via npm

## Quick Start

### Production Use (via npm package)

```bash
# Install the package (when published)
npm install -g aquaeye-viz

# Run it
aquaeye-viz /path/to/images
```

Then open **http://localhost:3000** in your browser.

### Development

**Prerequisites:**
- **Rust** (1.70+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (20+): `nvm install 20` or download from [nodejs.org](https://nodejs.org)

**Setup:**
```bash
# Install dependencies
npm install
```

**Run development servers:**
```bash
# Option 1: Using the start script (runs both backend and frontend)
./start.sh /path/to/images

# Option 2: Manual start
# Terminal 1 - Backend:
cd backend && cargo run -- /path/to/images

# Terminal 2 - Frontend:
npm run dev
```

Development mode runs frontend on **http://localhost:5173** with hot reload.

## Usage

1. Click "Select Folder" button
2. Enter the **full path** to a folder containing images (e.g., `/home/user/Pictures`)
3. Use keyboard shortcuts to navigate

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

### Filename Parsing

The app automatically parses filenames to extract metadata:

- **Date**: ISO format at start (e.g., `2025-07-23-...`)
- **Subject**: Identified keywords (e.g., `sasamat`, `lake`)
- **Series**: Patterns like `delta3`, `series-01`
- **Numbers**: Extracted as `a`, `b`, `frame` values for filtering

Example: `2025-07-23-sasamat-delta3-0028.png`
- Date: 2025-07-23
- Subject: sasamat
- Series: delta3
- Frame: 0028

## Architecture Details

### Backend (Rust/Axum)

- **backend/src/parser.rs**: Filename parsing and metadata extraction
- **backend/src/thumbnail.rs**: Thumbnail generation and caching with SHA2 hashing
- **backend/src/main.rs**: Axum web server with REST API endpoints

**API Endpoints:**
- `POST /api/scan` - Scan folder for images
- `POST /api/thumbnails` - Generate thumbnails
- `GET /api/image/*path` - Serve image by path
- `GET /api/folders?path=...` - List folders

### Frontend (React)

- **src/store.ts**: Zustand state management
- **src/search.ts**: Fuzzy search implementation
- **src/commands.ts**: HTTP API client
- **src/components/Grid.tsx**: Virtualized grid with TanStack Virtual
- **src/components/Viewer.tsx**: Detail view with zoom/pan
- **src/components/Compare.tsx**: Multi-image comparison

## Performance

- Thumbnails are generated lazily (only for visible items)
- Thumbnails are cached using SHA256(path + mtime + size) as key
- Grid virtualization ensures smooth scrolling with 10k+ images
- Search is debounced and optimized for large datasets
- Parallel thumbnail generation with rayon

## Development

**Frontend** (React + TypeScript):
```bash
npm run dev  # Hot reload enabled
```

**Backend** (Rust):
```bash
cd backend
cargo run  # Auto-recompile with cargo watch
```

## Building for Distribution

Build both frontend and backend for production:

```bash
# Build everything
npm run build

# Or use the build script
./scripts/build-all.sh
```

This creates:
- **Frontend**: Optimized static files in `dist/`
- **Backend**: Release binary in `backend/target/release/aquaeye-viz-backend`

The backend automatically serves the static frontend files when running in production.

### Package for npm

```bash
# Create npm package
npm pack

# This creates: aquaeye-viz-0.1.0.tgz
# Install locally to test:
npm install -g ./aquaeye-viz-0.1.0.tgz
aquaeye-viz /path/to/images
```

The package includes:
- Compiled Rust binary
- Built frontend (dist/)
- CLI wrapper (bin/cli.js)

### Cross-platform Builds

For distributing to different platforms, build the Rust binary on each target platform:

```bash
# macOS (Intel)
cargo build --release --target x86_64-apple-darwin

# macOS (Apple Silicon)
cargo build --release --target aarch64-apple-darwin

# Linux
cargo build --release --target x86_64-unknown-linux-gnu

# Windows
cargo build --release --target x86_64-pc-windows-msvc
```

## License

MIT
