#!/usr/bin/env bash
# Bygger public/cv/david-backman-cv.pdf från cv/cv.html med headless Chromium.
# Kräver chromium (eller google-chrome) i PATH och nätverk för Google Fonts.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
src="$here/cv.html"
out_dir="$here/../public/cv"
out="$out_dir/david-backman-cv.pdf"

browser=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$candidate" >/dev/null 2>&1; then browser="$candidate"; break; fi
done
if [ -z "$browser" ]; then
  echo "Hittar ingen Chromium/Chrome i PATH." >&2
  exit 1
fi

mkdir -p "$out_dir"
"$browser" --headless=new --disable-gpu --no-sandbox \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=8000 \
  --no-pdf-header-footer \
  --print-to-pdf="$out" \
  "file://$src" >/dev/null 2>&1

echo "Skrev $out ($(du -h "$out" | cut -f1))"
