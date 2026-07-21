#!/bin/bash

set -e

POT="languages/eventkoi-lite.pot"
SLUG="eventkoi-lite"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# WordPress locates a script's translations by hashing the path of the file it
# actually enqueued, so every JavaScript string has to be filed under its built
# bundle. The bundles themselves cannot be parsed reliably (minification renames
# __() in places), so extract from the readable sources and then point the
# references at the bundle that ships them. Getting this wrong is silent: the
# translations build fine and simply never load.
retarget() {
	awk -v target="$2" 'BEGIN { seen = 0 }
		/^#: / { if ( ! seen ) { print "#: " target ":1"; seen = 1 } next }
		/^$/   { seen = 0 }
		{ print }' "$1" > "$1.retargeted" && mv "$1.retargeted" "$1"
}

echo "🧼 Cleaning old POT file..."
rm -f "$POT"

echo "⚛️  Extracting from backend React (scripts/backend/src)..."
wp i18n make-pot scripts/backend/src "$WORK/backend.pot" --slug="$SLUG"
retarget "$WORK/backend.pot" "scripts/backend/build/index.js"

echo "⚛️  Extracting from frontend React (scripts/frontend/src)..."
wp i18n make-pot scripts/frontend/src "$WORK/frontend.pot" --slug="$SLUG"
retarget "$WORK/frontend.pot" "scripts/frontend/build/index.js"

echo "🗃️  Extracting from PHP (includes/) and merging..."
wp i18n make-pot . "$POT" --slug="$SLUG" --include="includes" \
	--merge="$WORK/backend.pot,$WORK/frontend.pot"

echo "✅ Done! POT file created at $POT"
