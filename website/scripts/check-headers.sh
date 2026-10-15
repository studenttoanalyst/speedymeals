#!/usr/bin/env bash
# scripts/check-headers.sh
# Verifies mandatory production security headers against target endpoint

set -euo pipefail

TARGET_URL="${1:-${TARGET_URL:-https://speedymealservices.com}}"
echo "==> Inspecting security headers for: ${TARGET_URL}"

HEADERS=$(curl -sI -L --max-time 10 "${TARGET_URL}")

MISSING=0

check_header() {
  local pattern="$1"
  local name="$2"
  if echo "${HEADERS}" | grep -iq "${pattern}"; then
    echo "  [PASS] ${name}"
  else
    echo "  [FAIL] Missing or invalid: ${name}"
    MISSING=$((MISSING + 1))
  fi
}

echo "--- Checking Security Headers ---"
check_header "^x-content-type-options:\s*nosniff" "X-Content-Type-Options: nosniff"
check_header "^x-frame-options:\s*SAMEORIGIN" "X-Frame-Options: SAMEORIGIN"
check_header "^referrer-policy:\s*strict-origin-when-cross-origin" "Referrer-Policy: strict-origin-when-cross-origin"
check_header "^permissions-policy:" "Permissions-Policy"
check_header "^strict-transport-security:\s*max-age=" "Strict-Transport-Security"
check_header "^cross-origin-opener-policy:\s*same-origin" "Cross-Origin-Opener-Policy: same-origin"
check_header "^cross-origin-resource-policy:\s*same-site" "Cross-Origin-Resource-Policy: same-site"
check_header "^content-security-policy" "Content-Security-Policy (Enforced or Report-Only)"

if [ "${MISSING}" -gt 0 ]; then
  echo "==> FAILED: ${MISSING} required security header(s) missing or incorrect."
  exit 1
else
  echo "==> SUCCESS: All required security headers verified."
  exit 0
fi
