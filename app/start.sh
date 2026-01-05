#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if folder path argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <folder_path>"
    echo "Example: $0 /path/to/your/images"
    echo "The folder path will be automatically scanned for images on startup."
    exit 1
fi

FOLDER_PATH="$1"

# Check if the folder exists
if [ ! -d "$FOLDER_PATH" ]; then
    echo "❌ Error: Folder does not exist: $FOLDER_PATH"
    exit 1
fi

echo "📁 Image folder: $FOLDER_PATH"

# Start the Rust backend with folder path argument
echo "🚀 Starting Rust backend on http://localhost:3000..."
(cd "$SCRIPT_DIR/backend" && cargo run -- "$FOLDER_PATH") &
BACKEND_PID=$!

# Wait for backend to start (cargo build can take a while on first run)
echo "⏳ Waiting for backend to be ready..."
BACKEND_READY=0
for i in {1..60}; do
    if curl -fsS "http://127.0.0.1:3000/api/initial" >/dev/null 2>&1; then
        echo "✅ Backend is ready"
        BACKEND_READY=1
        break
    fi
    sleep 1
done
if [ $BACKEND_READY -ne 1 ]; then
    echo "⚠️  Backend not responding yet; starting frontend anyway."
fi

# Start the Vite frontend
echo "🎨 Starting Vite frontend on http://localhost:5173..."
(cd "$SCRIPT_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ AquaEye Viz is running!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
