#!/data/data/com.termux/files/usr/bin/bash
set -u

export PORT=3001

for f in tests/*.test.js; do
  echo "========================================"
  echo "PRODUCTION TEST: $f"
  echo "========================================"

  node "$f"
  STATUS=$?

  if [ "$STATUS" -ne 0 ]; then
    echo "FAILED: $f"
    exit "$STATUS"
  fi

  echo "FINISHED: $f"
done

echo "========================================"
echo "BETCODE PRODUCTION SUITE: PASSED"
echo "External service calls: 0"
echo "Live bookmaker creation: DISABLED"
echo "========================================"
