# One command to verify everything. Mirrors .github/workflows/ci.yml job by job.
# Shell scripts are run through bash so they work even without the executable bit.
.PHONY: all csharp python go typescript examples docs setup-repo

all: docs csharp python go typescript examples

# C#: locked restore, analyzers + code style as errors, xUnit.
csharp:
	dotnet restore DesignPatterns.sln --locked-mode
	dotnet build DesignPatterns.sln --no-restore --configuration Release
	dotnet test DesignPatterns.sln --no-build --configuration Release

# Python: ruff (lint + format), mypy --strict per pattern, pytest with coverage.
python:
	bash scripts/check-python.sh --cov

# Go: formatting, vet, tests with the race detector.
go:
	test -z "$$(gofmt -l .)" || { gofmt -l .; exit 1; }
	go vet ./...
	go test -race ./...

# TypeScript + React: dependency audit, strict type-check, Vitest with coverage, playground build.
typescript:
	npm ci
	npm audit --audit-level=moderate
	npm run typecheck
	npm run coverage
	npm run build:playground

# Every example in every language prints its expected_output.txt.
examples:
	bash scripts/verify.sh

# Lesson output blocks are generated, and every relative link and anchor resolves.
docs:
	python3 scripts/sync_readme.py --check
	python3 scripts/check_links.py

# Applies GitHub repository settings (rulesets, security features, topics). Requires admin rights.
# On Windows use: .\scripts\setup-repo.ps1
setup-repo:
	bash scripts/setup-repo.sh
