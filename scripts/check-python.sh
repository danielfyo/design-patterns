#!/usr/bin/env bash
# Lints, type-checks and tests the Python examples.
#   ruff (lint + format), mypy --strict (one run per pattern, because every pattern has its own
#   main.py), pytest with branch coverage.
#
# Usage: bash scripts/check-python.sh [--cov]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

python3 -m ruff check .
python3 -m ruff format --check .

status=0
python3 -m mypy conftest.py scripts || status=1
for dir in patterns/*/*/python; do
  python3 -m mypy --no-error-summary "$dir" || { echo "mypy failed in $dir"; status=1; }
done
[[ $status -eq 0 ]] || exit 1
echo "mypy: no issues found"

if [[ "${1:-}" == "--cov" ]]; then
  python3 -m pytest --cov --cov-report=term
else
  python3 -m pytest -q
fi
