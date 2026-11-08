#!/usr/bin/env bash
# Runs every example in every language and checks that all of them print
# exactly the pattern's expected_output.txt.
#
# Usage:
#   bash scripts/verify.sh                         # every pattern, every language
#   bash scripts/verify.sh behavioral/strategy     # one pattern
#   LANGS="python go" bash scripts/verify.sh       # subset of languages
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

LANGS="${LANGS:-csharp typescript python go}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ $# -gt 0 ]]; then
  PATTERNS=("${@/#/patterns/}")
else
  mapfile -t PATTERNS < <(find patterns -mindepth 2 -maxdepth 2 -type d | sort)
fi

run() { # $1 = language, $2 = pattern dir
  case "$1" in
    csharp)     dotnet run --project "$2/csharp" ;;
    typescript) npx --no-install tsx "$2/typescript/main.ts" ;;
    python)     python3 "$2/python/main.py" ;;
    go)         go run "./$2/go" ;;
  esac
}

failures=0
for dir in "${PATTERNS[@]}"; do
  expected="$dir/expected_output.txt"
  if [[ ! -f "$expected" ]]; then
    echo "MISSING  $expected"; failures=$((failures + 1)); continue
  fi
  for lang in $LANGS; do
    out="$TMP/out.txt"
    if ! run "$lang" "$dir" >"$out" 2>"$TMP/err.txt"; then
      echo "ERROR    $dir [$lang]"; sed 's/^/         /' "$TMP/err.txt" | head -20
      failures=$((failures + 1)); continue
    fi
    if diff -u "$expected" "$out" >"$TMP/diff.txt"; then
      echo "OK       $dir [$lang]"
    else
      echo "DIFF     $dir [$lang]"; sed 's/^/         /' "$TMP/diff.txt" | head -40
      failures=$((failures + 1))
    fi
  done
done

echo
if [[ $failures -eq 0 ]]; then echo "All examples match their expected output."; else echo "$failures failure(s)."; exit 1; fi
