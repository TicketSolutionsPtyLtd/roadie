#!/bin/bash

# Font optimization script wrapper
# Creates optimized fonts keeping only specific OpenType features: case, ss02, ss03, cv05, cv08, cv11

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔤 Font Optimization Tool"
echo "========================="
echo

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Setup virtual environment
VENV_DIR="$SCRIPT_DIR/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install fonttools if not available
if ! python3 -c "import fontTools" 2>/dev/null; then
    echo "📦 Installing fonttools..."
    pip install -r "$SCRIPT_DIR/requirements.txt"
    echo
fi

# Change to project root directory
cd "$PROJECT_ROOT"

# Run the subsetting script
echo "🚀 Running font subsetting..."
python3 "$SCRIPT_DIR/subset-fonts.py"

echo
echo "🎆 Font optimization complete!"
