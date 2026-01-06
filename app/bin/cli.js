#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform } from 'os';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine binary name based on platform
const isWindows = platform() === 'win32';
const binaryName = isWindows ? 'fuzzy-img-viewer-backend.exe' : 'fuzzy-img-viewer-backend';

// Find the binary path (installed by postinstall script from platform package)
const packageRoot = join(__dirname, '..');
const binaryPath = join(__dirname, binaryName);

// Check if binary exists
if (!existsSync(binaryPath)) {
  console.error('❌ Error: Backend binary not found at:', binaryPath);
  console.error('   Please run: npm run build:backend');
  process.exit(1);
}

// Check if dist folder exists
const distPath = join(packageRoot, 'dist');
if (!existsSync(distPath)) {
  console.error('❌ Error: Frontend dist folder not found at:', distPath);
  console.error('   Please run: npm run build:frontend');
  process.exit(1);
}

// Get folder path from command line arguments
const folderPath = process.argv[2];

if (!folderPath) {
  console.error('Usage: fuzzy-img-viewer <folder_path>');
  console.error('Example: fuzzy-img-viewer /path/to/your/images');
  process.exit(1);
}

console.log('📁 Image folder:', folderPath);
console.log('🚀 Starting Fuzzy Image Viewer backend...');

// Start the backend server
const backend = spawn(binaryPath, [folderPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down...');
  backend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('error', (err) => {
  console.error('❌ Failed to start backend:', err);
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Backend exited with code ${code}`);
    process.exit(code);
  }
});

// Wait a moment then print instructions
setTimeout(() => {
  console.log('\n✅ Fuzzy Image Viewer is running!');
  console.log('   Open in browser: http://localhost:3000');
  console.log('   Press Ctrl+C to stop\n');
}, 2000);
