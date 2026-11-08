#!/usr/bin/env bash
# Applies the repository settings that cannot be stored in files: description and topics, merge
# strategy, security features, Actions permissions, and rulesets protecting a branch and release tags.
#
# Runs from any folder: it only talks to the GitHub API through the GitHub CLI, so the repository does
# not need to be cloned. If gh is not authenticated it starts `gh auth login`. The account must be an
# admin of the repository. Idempotent: rulesets are created or updated by name.
#
# Usage: bash scripts/setup-repo.sh [owner/repo] [branch]      (asked interactively when omitted)
#        CREATE_INITIAL_RELEASE=1 bash scripts/setup-repo.sh    (also publishes v1.0.0 if missing)
# Windows: .\scripts\setup-repo.ps1
set -euo pipefail

REPO="${1:-}"
BRANCH="${2:-}"
REQUIRED_CHECKS=(
  "C# (.NET 8)" "Python (3.10)" "Python (3.13)" "Go" "TypeScript + React"
  "Same output in every language" "Docs" "conventional-commits"
)
ADMIN_ROLE_ID=5            # built-in "Repository admin" role
GITHUB_ACTIONS_APP_ID=15368 # the GitHub Actions app (GITHUB_TOKEN), used by release-please

api() { gh api --silent -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "$@"; }
step() { printf '\n==> %s\n' "$1"; }

command -v gh >/dev/null || { echo "GitHub CLI (gh) is required: https://cli.github.com" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required to build the JSON payloads." >&2; exit 1; }

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Starting \"gh auth login\"..."
  gh auth login --hostname github.com --git-protocol https --web
  gh auth status >/dev/null 2>&1 || { echo "GitHub authentication failed." >&2; exit 1; }
fi

until [[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; do
  [[ -n "$REPO" ]] && echo "  '$REPO' is not in owner/name format."
  read -r -p "Repository (owner/name) [danielfyo/design-patterns]: " REPO
  REPO="${REPO:-danielfyo/design-patterns}"
done
DEFAULT_BRANCH="$(gh api "repos/$REPO" --jq .default_branch 2>/dev/null)" \
  || { echo "Repository '$REPO' not found or not accessible." >&2; exit 1; }
if [[ -z "$BRANCH" ]]; then
  read -r -p "Branch to protect [$DEFAULT_BRANCH]: " BRANCH
  BRANCH="${BRANCH:-$DEFAULT_BRANCH}"
fi
[[ "$(gh api "repos/$REPO" --jq .permissions.admin)" == "true" ]] \
  || { echo "The authenticated account is not an admin of '$REPO'." >&2; exit 1; }
gh api --silent "repos/$REPO/branches/$BRANCH" 2>/dev/null \
  || { echo "Branch '$BRANCH' does not exist in '$REPO'." >&2; exit 1; }
echo "Configuring $REPO (protected branch: $BRANCH)"

step "General settings and merge strategy"
api -X PATCH "repos/$REPO" --input - <<'JSON'
{
  "has_wiki": false,
  "has_projects": false,
  "allow_merge_commit": true,
  "allow_squash_merge": true,
  "allow_rebase_merge": false,
  "allow_auto_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_update_branch": true
}
JSON

# Description and topics are specific to this project.
if [[ "$REPO" == "danielfyo/design-patterns" ]]; then
  step "Description and topics"
  api -X PATCH "repos/$REPO" --input - <<'JSON'
{ "description": "The 23 GoF design patterns with the same practical example in C#/.NET, TypeScript/React, Python and Go: lessons, runnable code and tests." }
JSON
  api -X PUT "repos/$REPO/topics" --input - <<'JSON'
{ "names": ["design-patterns", "gang-of-four", "gof-patterns", "csharp", "dotnet", "typescript", "react",
            "python", "golang", "software-design", "object-oriented-programming", "learning"] }
JSON
fi

step "Security features"
api -X PUT "repos/$REPO/vulnerability-alerts"
api -X PUT "repos/$REPO/automated-security-fixes"
api -X PUT "repos/$REPO/private-vulnerability-reporting"
api -X PATCH "repos/$REPO" --input - <<'JSON' \
  || echo "  Secret scanning needs a public repository or GitHub Advanced Security; skipped."
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON

step "GitHub Actions permissions"
# Only GitHub-owned actions and the allow-listed third-party actions may run.
api -X PUT "repos/$REPO/actions/permissions" --input - <<'JSON'
{ "enabled": true, "allowed_actions": "selected" }
JSON
api -X PUT "repos/$REPO/actions/permissions/selected-actions" --input - <<'JSON'
{ "github_owned_allowed": true, "verified_allowed": false,
  "patterns_allowed": ["amannn/action-semantic-pull-request@*", "googleapis/release-please-action@*", "ossf/scorecard-action@*"] }
JSON
# Read-only GITHUB_TOKEN by default; Actions may open pull requests (release-please needs it).
api -X PUT "repos/$REPO/actions/permissions/workflow" --input - <<'JSON'
{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": true }
JSON
api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" --input - <<'JSON' \
  || echo "  Set it in Settings -> Actions -> General -> require approval for all external contributors."
{ "approval_policy": "all_external_contributors" }
JSON

# Creates the ruleset named in the JSON on stdin, or updates it if it already exists.
upsert_ruleset() {
  local body name id
  body="$(cat)"
  name="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["name"])' "$body")"
  id="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$name\") | .id" | head -n 1)"
  if [[ -n "$id" ]]; then
    printf '%s' "$body" | api -X PUT "repos/$REPO/rulesets/$id" --input -
    echo "  updated ruleset '$name'"
  else
    printf '%s' "$body" | api -X POST "repos/$REPO/rulesets" --input -
    echo "  created ruleset '$name'"
  fi
}

step "Ruleset: protect $BRANCH"
# The CodeQL gate is only added once the repository has code scanning results; before the first
# analysis it would block every merge.
HAS_CODE_SCANNING=0
if gh api "repos/$REPO/code-scanning/analyses?per_page=1" --jq 'length' 2>/dev/null | grep -qv '^0$'; then
  HAS_CODE_SCANNING=1
else
  echo "  No code scanning results yet: the CodeQL gate is skipped. Run this script again after CodeQL runs."
fi
python3 - "$BRANCH" "$DEFAULT_BRANCH" "$ADMIN_ROLE_ID" "$HAS_CODE_SCANNING" "${REQUIRED_CHECKS[@]}" <<'PY' | upsert_ruleset
import json, sys
branch, default_branch, admin_role, has_code_scanning, *checks = sys.argv[1:]
ref = "~DEFAULT_BRANCH" if branch == default_branch else f"refs/heads/{branch}"
rules = [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "required_signatures"},
    {"type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": True,
        "require_code_owner_review": True,
        "require_last_push_approval": True,
        "required_review_thread_resolution": True,
        "allowed_merge_methods": ["squash", "merge"]}},
    {"type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": True,
        "required_status_checks": [{"context": c} for c in checks]}},
]
if has_code_scanning == "1":
    rules.append({"type": "code_scanning", "parameters": {"code_scanning_tools": [
        {"tool": "CodeQL", "security_alerts_threshold": "high_or_higher", "alerts_threshold": "errors"}]}})
print(json.dumps({
    "name": f"Protect {branch}",
    "target": "branch",
    "enforcement": "active",
    "conditions": {"ref_name": {"include": [ref], "exclude": []}},
    # Admins may merge pull requests that are not yet approved (solo maintainer), never push directly.
    "bypass_actors": [{"actor_id": int(admin_role), "actor_type": "RepositoryRole", "bypass_mode": "pull_request"}],
    "rules": rules,
}))
PY

step "Ruleset: protect release tags"
upsert_ruleset <<JSON
{
  "name": "Protect release tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": $GITHUB_ACTIONS_APP_ID, "actor_type": "Integration", "bypass_mode": "always" },
    { "actor_id": $ADMIN_ROLE_ID, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [ { "type": "update" }, { "type": "deletion" }, { "type": "non_fast_forward" } ]
}
JSON

if [[ "${CREATE_INITIAL_RELEASE:-0}" == "1" ]]; then
  step "Initial release v1.0.0"
  if gh release view v1.0.0 --repo "$REPO" >/dev/null 2>&1; then
    echo "  v1.0.0 already exists"
  else
    gh release create v1.0.0 --repo "$REPO" --target "$DEFAULT_BRANCH" --title "v1.0.0" \
      --notes "First release: the 23 GoF design patterns in C#, TypeScript/React, Python and Go. See CHANGELOG.md."
  fi
fi

printf '\nDone. Remaining manual step: Settings -> General -> Social preview -> upload .github/assets/social-preview.png\n'
