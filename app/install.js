#!/usr/bin/env node

import { platform, arch } from 'os';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the platform-specific package name
const PLATFORM = platform();
const ARCH = arch();

// Map Node's arch to our package names
const ARCH_MAP = {
  'x64': 'x64',
  'arm64': 'arm64',
  'aarch64': 'arm64'
};

const mappedArch = ARCH_MAP[ARCH] || ARCH;
const packageName = `@vmasrani/fuzzy-img-viewer-${PLATFORM}-${mappedArch}`;

console.log(`📦 Installing fuzzy-img-viewer for ${PLATFORM}-${mappedArch}`);

// Try to find the platform-specific package
let binarySource;
try {
  // The platform package will be in node_modules as an optional dependency
  const platformPkg = `./node_modules/${packageName}`;
  const binaryName = PLATFORM === 'win32' ? 'fuzzy-img-viewer-backend.exe' : 'fuzzy-img-viewer-backend';
  binarySource = join(__dirname, platformPkg, binaryName);

  if (!existsSync(binarySource)) {
    console.error(`❌ Platform binary not found at: ${binarySource}`);
    console.error(`   This usually means the platform package ${packageName} is not installed.`);
    console.error(`   Supported platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Failed to locate platform binary: ${err.message}`);
  process.exit(1);
}

// Create bin directory if it doesn't exist
const binDir = join(__dirname, 'bin');
if (!existsSync(binDir)) {
  mkdirSync(binDir, { recursive: true });
}

// Copy the binary to the bin directory
const binaryName = PLATFORM === 'win32' ? 'fuzzy-img-viewer-backend.exe' : 'fuzzy-img-viewer-backend';
const binaryDest = join(binDir, binaryName);

try {
  copyFileSync(binarySource, binaryDest);

  // Make executable on Unix
  if (PLATFORM !== 'win32') {
    const { chmodSync } = await import('fs');
    chmodSync(binaryDest, 0o755);
  }

  console.log(`✅ Binary installed successfully to ${binaryDest}`);
} catch (err) {
  console.error(`❌ Failed to install binary: ${err.message}`);
  process.exit(1);
}
