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
  uninstall.php \
  readme.txt \
  "$PLUGIN_SLUG/"

# Copy entire scripts folder but exclude node_modules
if [ -d scripts ]; then
  rsync -a \
    --exclude "node_modules" \
    scripts "$PLUGIN_SLUG/"
fi

# Zip the whole folder
zip -qr "$ZIP_NAME" "$PLUGIN_SLUG"

# Cleanup temp folder
rm -rf "$PLUGIN_SLUG"

echo "✅ Build complete: $ZIP_NAME"
