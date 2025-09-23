#!/bin/bash

set -e

echo "🧼 Cleaning old POT file..."
rm -f languages/eventkoi-lite.pot

echo "🗃️  Extracting from PHP (includes/)..."
wp i18n make-pot includes languages/eventkoi-lite.pot --slug=eventkoi-lite

echo "⚛️  Appending from backend React (scripts/backend/src)..."
wp i18n make-pot scripts/backend/src languages/eventkoi-lite.pot --slug=eventkoi-lite --merge

echo "⚛️  Appending from frontend React (scripts/frontend/src)..."
wp i18n make-pot scripts/frontend/src languages/eventkoi-lite.pot --slug=eventkoi-lite --merge

echo "✅ Done! POT file created at languages/eventkoi-lite.pot"
