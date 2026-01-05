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
- **Browser-based**: Access through Chrome/Firefox - no X11 or desktop environment needed!

## Architecture

- **Frontend**: React + Vite (runs on http://localhost:5173)
- **Backend**: Rust + Axum web server (runs on http://localhost:3000)
- **Communication**: REST API with fetch() instead of desktop IPC

## Prerequisites

- **Rust** (1.70+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (20+): `nvm install 20` or download from [nodejs.org](https://nodejs.org)

No system GUI libraries required! Works great on headless servers.

## Installation

```bash
# Install Node dependencies
npm install

# Rust dependencies are downloaded automatically when you run the backend
```

## Quick Start

### Option 1: Using the start script (recommended)

```bash
./start.sh
```

This starts both backend and frontend automatically. Open **http://localhost:5173** in your browser.

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
cargo run
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open your browser to: **http://localhost:5173**

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
- **src/commands.ts**: HTTP API client (replaces Tauri IPC)
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

## Build for Production

```bash
# Frontend
npm run build  # Creates optimized build in dist/

# Backend
cd backend
cargo build --release  # Creates binary in target/release/
```

## Migration from Tauri

This project was originally built with Tauri (desktop app) but has been converted to a web app for better accessibility and easier deployment. The UI and functionality remain identical.

## License

MIT
