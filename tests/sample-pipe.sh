#!/usr/bin/env bash
# Pipe sample (matches README-style usage). Output goes to tmp/ (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build --silent
mkdir -p tmp
cat tests/mac_nfd_data.txt | node bin/unorm.js -f NFC > tmp/clean_nfc_data.txt
echo "Wrote tmp/clean_nfc_data.txt"
