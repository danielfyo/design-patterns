# Contributing

Thanks for helping other developers learn design patterns! Contributions of every size are welcome:
typo fixes, clearer explanations, better exercises, new language ports or bug fixes.

## Ground rules

1. **One example per pattern, four languages.** Every pattern uses the *same* practical scenario in
   C#, TypeScript (+ a React demo), Python and Go, with the same names. If you change the example in
   one language, change it in all of them — including the tests.
2. **Identical output.** Each console program must print exactly the contents of the pattern's
   `expected_output.txt`. `scripts/verify.sh` checks this for every language.
3. **Tested.** Every pattern has unit tests in every language that prove the pattern's guarantees
   (not just that the demo runs).
4. **Idiomatic code.** Write each language the way an experienced developer in that ecosystem
   would, and explain the idioms in the lesson's *Language notes* section.
5. **No runtime dependencies** in the examples: standard libraries only (plus React for the demos).
   Test and tooling dependencies are fine.
6. **Deterministic.** No randomness, real clocks, real network calls or racy threads, in examples
   or tests.
7. **The README output blocks are generated.** Never edit the block between
   `<!-- output: expected_output.txt -->` markers by hand: edit `expected_output.txt` and run
   `python3 scripts/sync_readme.py`.
8. **English only** for code, comments, docs, commits and pull requests.

## Prerequisites

| Toolchain | Version | Used for |
| --- | --- | --- |
| .NET SDK | 8.0 | C# examples, xUnit tests |
| Node.js | 20+ (CI uses 22) | TypeScript, React, Vitest, the playground |
| Python | 3.10+ | Python examples, ruff, mypy, pytest |
| Go | 1.23+ | Go examples and tests |

```bash
npm ci                        # TypeScript / React tooling
pip install -e ".[dev]"       # ruff, mypy, pytest, pytest-cov
```

## Layout of a pattern

```text
patterns/<category>/<pattern-name>/
├── README.md               # the lesson — copy docs/PATTERN_TEMPLATE.md to start a new one
├── expected_output.txt     # the output every implementation must print
├── csharp/                 # <PatternName>.csproj + Program.cs (+ other .cs files)
├── typescript/             # <core>.ts, main.ts (console), <PatternName>Demo.tsx (React)
│                           # + <core>.test.ts and <PatternName>Demo.test.tsx
├── python/                 # main.py + test_main.py
└── go/                     # main.go (package main) + main_test.go
tests/csharp/DesignPatterns.Tests/<Category>/<PatternName>Tests.cs   # C# tests
```

## Running the checks

Run the checks of every toolchain you touched before opening a pull request:

```bash
# C# — analyzers (latest-recommended) and code style are enforced; warnings are errors
dotnet build DesignPatterns.sln && dotnet test DesignPatterns.sln

# Python — ruff (lint + format), mypy --strict, pytest
scripts/check-python.sh

# Go
gofmt -l . && go vet ./... && go test -race ./...

# TypeScript + React
npm run typecheck && npm test && npm run build:playground

# Every example in every language prints its expected_output.txt
scripts/verify.sh                       # or: scripts/verify.sh behavioral/observer

# Docs
python3 scripts/sync_readme.py --check  # output blocks in the lessons
python3 scripts/check_links.py          # relative links and anchors
```

Coverage: `dotnet test --collect:"XPlat Code Coverage"`, `scripts/check-python.sh --cov`,
`go test -cover ./...` and `npm run coverage`. CI publishes a coverage summary for every run.

## Commit messages and pull request titles

This repository follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Releases and `CHANGELOG.md` are generated from them, and CI rejects pull request titles that don't comply.

```text
<type>(<optional scope>): <lowercase description>

feat(observer): add a weak-reference subscriber exercise
fix(go): close the pipe in the iterator test helper
docs(visitor): clarify double dispatch with a sequence diagram
```

| Type | Use it for | Release impact |
| --- | --- | --- |
| `feat` | a new example, section, exercise or language | minor |
| `fix` | a bug in code or an error in the docs | patch |
| `docs` | documentation only | none |
| `test`, `refactor`, `perf`, `style` | code changes without new behaviour | none |
| `build`, `ci`, `chore` | tooling, dependencies, pipelines | none |

Useful scopes: a pattern folder name (`observer`, `factory-method`), a language (`csharp`,
`typescript`, `react`, `python`, `go`), `playground`, `readme`, `ci`.
Add `!` after the type (`feat!:`) for breaking changes.

## Pull request process

Nobody pushes to `main` directly, maintainers included: every change arrives through a pull request.

1. **Fork** the repository and create a branch from `main` (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`).
2. Make your change in all four languages, with tests, and run the checks above.
3. Open a pull request from your fork using the template. Its title must be a Conventional Commit.
4. **Workflow approval.** For security, GitHub Actions do not run on pull requests from outside
   contributors until a maintainer approves them. Expect a short wait before CI starts.
5. **Merge requirements** on `main`:
   - CI, CodeQL and the PR title check are green, with no high-severity code scanning alerts.
   - A code owner has approved the latest changes and every review conversation is resolved.
   - **Commits are signed** ([how to sign commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)).
   - Pull requests are squashed or merged with a merge commit (no rebase merges).

## Adding a new language

Add a sibling folder (for example `java/` or `rust/`) to **every** pattern with its tests, extend
the `run()` function in `scripts/verify.sh`, add a CI job, and add a row to each lesson's
*Implementations* table.

## Code of Conduct

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
Security issues: see [SECURITY.md](SECURITY.md).
