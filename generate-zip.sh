#!/usr/bin/env bash
set -euo pipefail

PLUGIN_SLUG="eventkoi-lite"
ZIP_NAME="$PLUGIN_SLUG.zip"

# Clean old build
rm -f "$ZIP_NAME"
rm -rf "$PLUGIN_SLUG"

# Create a temporary folder matching the slug
mkdir "$PLUGIN_SLUG"

# Copy core plugin files
cp -r \
  includes \
  languages \
  templates \
  vendor-prefixed \
  autoload.php \
  bootstrap.php \
  composer.json \
  eventkoi.php \
  license.txt \
  "$PLUGIN_SLUG/"

# Copy backend build if exists
if [ -d scripts/backend/build ]; then
  mkdir -p "$PLUGIN_SLUG/scripts/backend"
  rsync -a --exclude "node_modules" scripts/backend/build "$PLUGIN_SLUG/scripts/backend/"
fi

# Copy frontend build if exists
if [ -d scripts/frontend/build ]; then
  mkdir -p "$PLUGIN_SLUG/scripts/frontend"
  rsync -a --exclude "node_modules" scripts/frontend/build "$PLUGIN_SLUG/scripts/frontend/"
fi

# Zip the whole folder
zip -qr "$ZIP_NAME" "$PLUGIN_SLUG"

# Cleanup temp folder
rm -rf "$PLUGIN_SLUG"

echo "✅ Build complete: $ZIP_NAME"
