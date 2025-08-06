#!/bin/bash

set -e

echo "🧼 Cleaning old POT file..."
rm -f languages/eventkoi.pot

echo "🗃️  Extracting from PHP (includes/)..."
wp i18n make-pot includes languages/eventkoi.pot --slug=eventkoi

echo "⚛️  Appending from backend React (scripts/backend/src)..."
wp i18n make-pot scripts/backend/src languages/eventkoi.pot --slug=eventkoi --merge

echo "⚛️  Appending from frontend React (scripts/frontend/src)..."
wp i18n make-pot scripts/frontend/src languages/eventkoi.pot --slug=eventkoi --merge

echo "✅ Done! POT file created at languages/eventkoi.pot"
