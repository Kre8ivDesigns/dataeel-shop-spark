#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/dist"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}/start" "${OUT_DIR}/finish"

cp "${SCRIPT_DIR}/start.mjs" "${OUT_DIR}/start/index.mjs"
cp "${SCRIPT_DIR}/finish.mjs" "${OUT_DIR}/finish/index.mjs"
cp "${SCRIPT_DIR}/parser.mjs" "${OUT_DIR}/finish/parser.mjs"
cp "${SCRIPT_DIR}/package.json" "${OUT_DIR}/start/package.json"
cp "${SCRIPT_DIR}/package.json" "${OUT_DIR}/finish/package.json"

npm install --omit=dev --ignore-scripts --no-audit --no-fund --prefix "${OUT_DIR}/start" >/dev/null
npm install --omit=dev --ignore-scripts --no-audit --no-fund --prefix "${OUT_DIR}/finish" >/dev/null

(cd "${OUT_DIR}/start" && zip -qr "../dataeel-racecard-digitize-start.zip" .)
(cd "${OUT_DIR}/finish" && zip -qr "../dataeel-racecard-digitize-finish.zip" .)

echo "${OUT_DIR}/dataeel-racecard-digitize-start.zip"
echo "${OUT_DIR}/dataeel-racecard-digitize-finish.zip"
