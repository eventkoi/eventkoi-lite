#!/usr/bin/env bash
set -euo pipefail

PLUGIN_SLUG="eventkoi-lite"
ZIP_NAME="$PLUGIN_SLUG.zip"

# ---- Release preflight -------------------------------------------------
# Refuse to build an artifact whose declared versions disagree, whose tree
# is dirty, or whose committed build output is older than its sources.
# Set SKIP_PREFLIGHT=1 to bypass (local experiments only, never a release).
if [ "${SKIP_PREFLIGHT:-0}" != "1" ]; then
  header_version=$(grep -m1 -E '^\s*\*\s*Version:' eventkoi.php | sed -E 's/.*Version:[[:space:]]*//' | tr -d '[:space:]')
  const_version=$(grep -m1 -E "define\(\s*'EVENTKOI_VERSION'" eventkoi.php | sed -E "s/.*'EVENTKOI_VERSION'[^']*'([^']+)'.*/\1/")

  if [ -z "$header_version" ] || [ -z "$const_version" ]; then
    echo "❌ Preflight: could not read the plugin version from eventkoi.php."
    exit 1
  fi

  if [ "$header_version" != "$const_version" ]; then
    echo "❌ Preflight: plugin header ($header_version) and EVENTKOI_VERSION ($const_version) disagree."
    exit 1
  fi

  # readme Stable tag only exists for the WP.org edition.
  if grep -qiE '^Stable tag:' readme.txt 2>/dev/null; then
    stable_tag=$(grep -m1 -iE '^Stable tag:' readme.txt | sed -E 's/.*[Ss]table tag:[[:space:]]*//' | tr -d '[:space:]')
    if [ "$header_version" != "$stable_tag" ]; then
      echo "❌ Preflight: plugin version ($header_version) and readme Stable tag ($stable_tag) disagree."
      exit 1
    fi
    echo "Preflight: version $header_version (header = constant = stable tag)"
  else
    echo "Preflight: version $header_version (header = constant)"
  fi

  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "❌ Preflight: working tree is dirty. Commit or stash before building a release."
    exit 1
  fi

  for app in scripts/frontend scripts/backend; do
    if [ -d "$app/src" ] && [ -d "$app/build" ]; then
      newest_src=$(find "$app/src" -type f -not -name '.DS_Store' -exec stat -f '%m %N' {} + 2>/dev/null | sort -rn | head -1)
      newest_build=$(find "$app/build" -type f -not -name '.DS_Store' -exec stat -f '%m %N' {} + 2>/dev/null | sort -rn | head -1)
      src_ts=${newest_src%% *}
      build_ts=${newest_build%% *}
      if [ -n "$src_ts" ] && [ -n "$build_ts" ] && [ "$src_ts" -gt "$build_ts" ]; then
        echo "❌ Preflight: $app/build is older than its sources (${newest_src#* })."
        echo "   Run: npm run build --prefix $app"
        exit 1
      fi
    fi
  done
  echo "Preflight: build output is current, tree is clean."
fi
# -----------------------------------------------------------------------

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
    --exclude ".vite-hot" \
    --exclude ".DS_Store" \
    --exclude "*.log" \
    --exclude "CLAUDE.md" \
    --exclude ".claude" \
    --exclude ".cursor" \
    --exclude ".aider*" \
    --exclude ".windsurf" \
    --exclude ".codeium" \
    scripts "$PLUGIN_SLUG/"
fi

# Zip the whole folder
zip -qr "$ZIP_NAME" "$PLUGIN_SLUG"

# Cleanup temp folder
rm -rf "$PLUGIN_SLUG"

echo "✅ Build complete: $ZIP_NAME"
