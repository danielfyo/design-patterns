# Contributing

Thanks for helping other developers learn design patterns! Contributions of every size are welcome:
typo fixes, clearer explanations, better exercises, new language ports or bug fixes.

## Ground rules

1. **One example per pattern, four languages.** Every pattern uses the *same* practical scenario in
   C#, TypeScript (+ a React demo), Python and Go. If you change the example in one language, change
   it in all of them.
2. **Identical output.** Each console program must print exactly the contents of the pattern's
   `expected_output.txt`. This keeps the four implementations honest and comparable.
3. **Idiomatic code.** Write each language the way an experienced developer in that ecosystem
   would, and explain the idioms in the README's *Language notes* section.
4. **No external dependencies** in the examples (standard library only; React for the demos).
5. **Deterministic output.** No randomness, real clocks, real network calls or racy threads.
6. **English only**, for code, comments and documentation.

## Layout of a pattern

```
patterns/<category>/<pattern-name>/
├── README.md               # the lesson (see patterns/behavioral/strategy/README.md as the template)
├── expected_output.txt     # the output every implementation must print
├── csharp/                 # <PatternName>.csproj + Program.cs (+ other .cs files)
├── typescript/             # <core>.ts, main.ts (console) and <PatternName>Demo.tsx (React)
├── python/main.py
└── go/main.go              # package main
```

## Before opening a pull request

```bash
npm ci                                  # once
gofmt -l patterns && go vet ./...       # Go must be formatted and vet-clean
npm run typecheck                       # TypeScript + React demos
dotnet build DesignPatterns.sln         # C# (warnings are errors)
scripts/verify.sh                       # runs everything and diffs the output
scripts/verify.sh behavioral/observer   # ...or just the pattern you touched
```

CI runs the same checks on every push and pull request.

## Adding a new language

Add a sibling folder (for example `java/` or `rust/`) to **every** pattern, extend the `run()`
function in `scripts/verify.sh` and the CI workflow, and add a row to each README's
*Implementations* table.
