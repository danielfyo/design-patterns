# Security Policy

This repository contains educational examples; it is not a deployed product. Still, the examples
should never teach insecure practices, and the build pipeline and dependencies are kept secure.

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting instead: go to the **Security** tab of this repository and choose
**Report a vulnerability**. You will receive an answer within 7 days, and a fix or mitigation plan as
soon as the issue is confirmed.

Examples of what to report:

- Example code that demonstrates an insecure practice (injection, secrets in code, unsafe deserialisation…).
- A vulnerable dependency that Dependabot has not flagged.
- A weakness in the GitHub Actions workflows (for example, script injection or excessive permissions).

## How the repository is protected

- **Protected `main`:** changes only through pull requests with green CI, CodeQL, code-owner approval and
  signed commits; force pushes and deletion are blocked.
- **Protected release tags:** `v*` tags can only be created by the release workflow or a maintainer, and can
  never be moved or deleted.
- **Pull requests from forks:** workflows from outside contributors need a maintainer's approval before
  they run, and tokens are read-only by default.
- **Supply chain:** every GitHub Action is pinned to a full commit SHA, only allow-listed actions can run,
  checkouts don't persist credentials, and [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/danielfyo/design-patterns)
  grades these practices weekly.

## Automated checks

- **CodeQL** scans every pull request, `main`, and the whole repository weekly.
- **Secret scanning** with push protection blocks commits that contain credentials.
- **Dependabot** alerts on vulnerable dependencies and opens weekly pull requests for NuGet, pip, Go modules,
  npm and GitHub Actions.
