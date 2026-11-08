#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Applies the repository settings documented in SECURITY.md and CONTRIBUTING.md.

.DESCRIPTION
    Run once by a maintainer (and again whenever the settings drift). Requires PowerShell 7+ and the
    GitHub CLI authenticated as a repository administrator (`gh auth login`). The script is idempotent:
    existing rulesets with the same name are updated instead of duplicated.

    It configures:
      * merge options (squash or merge commit, PR title as squash message, delete merged branches);
      * Dependabot alerts and security updates, secret scanning with push protection and private
        vulnerability reporting;
      * GitHub Actions: read-only default token, an allow-list of actions, and approval for workflows
        from outside contributors;
      * a ruleset protecting a branch, `main` by default (pull requests, required checks, signed
        commits, no force pushes or deletion, and a CodeQL gate once code scanning has results);
      * a ruleset protecting release tags `v*`;
      * optionally, the initial v1.0.0 release that release-please continues from.

    The social preview image cannot be set through the API: upload .github/assets/social-preview.png
    in Settings -> General -> Social preview.

.PARAMETER Repository
    owner/name of the repository. Asked interactively when omitted (default danielfyo/design-patterns).

.PARAMETER Branch
    Branch protected by the ruleset. Asked interactively when omitted (default: the default branch).

.PARAMETER CreateInitialRelease
    Also tag the current `main` as v1.0.0 and publish the GitHub release (run after the first merge).

.EXAMPLE
    ./scripts/setup-repo.ps1
    ./scripts/setup-repo.ps1 -Repository danielfyo/design-patterns -Branch main -CreateInitialRelease
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $Repository,
    [string] $Branch,
    [switch] $CreateInitialRelease
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Status checks that must pass before merging into main (job names from .github/workflows).
$RequiredChecks = @(
    'C# (.NET 8)',
    'Python (3.10)',
    'Python (3.13)',
    'Go',
    'TypeScript + React',
    'Same output in every language',
    'Docs',
    'conventional-commits'
)

# Third-party actions allowed to run (GitHub-owned actions are always allowed).
$AllowedActions = @(
    'amannn/action-semantic-pull-request@*',
    'googleapis/release-please-action@*',
    'ossf/scorecard-action@*'
)

$AdminRoleId = 5            # built-in "Repository admin" role
$GitHubActionsAppId = 15368 # the GitHub Actions app (GITHUB_TOKEN), used by release-please

function Invoke-GitHub {
    param(
        [Parameter(Mandatory)] [string] $Method,
        [Parameter(Mandatory)] [string] $Path,
        [object] $Body
    )
    if (-not $PSCmdlet.ShouldProcess("$Method $Path")) { return $null }
    $arguments = @('api', '--method', $Method, '-H', 'Accept: application/vnd.github+json',
        '-H', 'X-GitHub-Api-Version: 2022-11-28', $Path)
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 10 -Compress
        $result = $json | gh @arguments --input -
    }
    else {
        $result = gh @arguments
    }
    if ($LASTEXITCODE -ne 0) { throw "gh api $Method $Path failed (exit code $LASTEXITCODE)." }
    if ($result) { return $result | ConvertFrom-Json }
    return $null
}

function Set-Ruleset {
    param([Parameter(Mandatory)] [hashtable] $Ruleset)
    $existing = Invoke-GitHub GET "repos/$Repository/rulesets" |
        Where-Object { $_.name -eq $Ruleset.name } |
        Select-Object -First 1
    if ($existing) {
        Invoke-GitHub PUT "repos/$Repository/rulesets/$($existing.id)" $Ruleset | Out-Null
        Write-Host "  updated ruleset '$($Ruleset.name)'"
    }
    else {
        Invoke-GitHub POST "repos/$Repository/rulesets" $Ruleset | Out-Null
        Write-Host "  created ruleset '$($Ruleset.name)'"
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'The GitHub CLI (gh) is required: https://cli.github.com/'
}
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'GitHub CLI is not authenticated. Starting "gh auth login"...'
    gh auth login --hostname github.com --git-protocol https --web
    gh auth status *> $null
    if ($LASTEXITCODE -ne 0) { throw 'GitHub authentication failed.' }
}

while ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    if ($Repository) { Write-Host "  '$Repository' is not in owner/name format." }
    $Repository = Read-Host 'Repository (owner/name) [danielfyo/design-patterns]'
    if (-not $Repository) { $Repository = 'danielfyo/design-patterns' }
}
$repoInfo = gh api "repos/$Repository" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Repository '$Repository' not found or not accessible." }
if (-not $repoInfo.permissions.admin) { throw "The authenticated account is not an admin of '$Repository'." }
$DefaultBranch = $repoInfo.default_branch
if (-not $Branch) {
    $Branch = Read-Host "Branch to protect [$DefaultBranch]"
    if (-not $Branch) { $Branch = $DefaultBranch }
}
gh api "repos/$Repository/branches/$Branch" *> $null
if ($LASTEXITCODE -ne 0) { throw "Branch '$Branch' does not exist in '$Repository'." }

Write-Host "Configuring $Repository (protected branch: $Branch)" -ForegroundColor Cyan

Write-Host '1. Repository and merge options'
Invoke-GitHub PATCH "repos/$Repository" @{
    description                 = 'The 23 GoF design patterns with the same practical example in C#/.NET, TypeScript/React, Python and Go: lessons, runnable code and tests.'
    has_issues                  = $true
    has_wiki                    = $false
    has_projects                = $false
    allow_update_branch         = $true
    allow_squash_merge          = $true
    allow_merge_commit          = $true
    allow_rebase_merge          = $false
    allow_auto_merge            = $true
    delete_branch_on_merge      = $true
    squash_merge_commit_title   = 'PR_TITLE'
    squash_merge_commit_message = 'PR_BODY'
    web_commit_signoff_required = $false
} | Out-Null
Invoke-GitHub PUT "repos/$Repository/topics" @{
    names = @('design-patterns', 'gang-of-four', 'gof-patterns', 'csharp', 'dotnet', 'typescript',
        'react', 'python', 'golang', 'software-design', 'object-oriented-programming', 'learning')
} | Out-Null

Write-Host '2. Security features'
Invoke-GitHub PUT "repos/$Repository/vulnerability-alerts" | Out-Null
Invoke-GitHub PUT "repos/$Repository/automated-security-fixes" | Out-Null
Invoke-GitHub PUT "repos/$Repository/private-vulnerability-reporting" | Out-Null
Invoke-GitHub PATCH "repos/$Repository" @{
    security_and_analysis = @{
        secret_scanning                 = @{ status = 'enabled' }
        secret_scanning_push_protection = @{ status = 'enabled' }
    }
} | Out-Null

Write-Host '3. GitHub Actions policy'
Invoke-GitHub PUT "repos/$Repository/actions/permissions" @{
    enabled         = $true
    allowed_actions = 'selected'
} | Out-Null
Invoke-GitHub PUT "repos/$Repository/actions/permissions/selected-actions" @{
    github_owned_allowed = $true
    verified_allowed     = $false
    patterns_allowed     = $AllowedActions
} | Out-Null
Invoke-GitHub PUT "repos/$Repository/actions/permissions/workflow" @{
    default_workflow_permissions     = 'read'
    # Lets Actions open pull requests, which release-please needs for its release PR.
    can_approve_pull_request_reviews = $true
} | Out-Null
try {
    Invoke-GitHub PUT "repos/$Repository/actions/permissions/fork-pr-contributor-approval" @{
        approval_policy = 'all_external_contributors'
    } | Out-Null
}
catch {
    Write-Warning 'Could not set the fork approval policy through the API. Set it in Settings -> Actions -> General -> "Approval for running fork pull request workflows from contributors" -> "Require approval for all external contributors".'
}

Write-Host "4. Ruleset: protect $Branch"
# The CodeQL gate is only added once the repository has code scanning results; before the first
# analysis it would block every merge.
$hasCodeScanning = $false
$analyses = gh api "repos/$Repository/code-scanning/analyses?per_page=1" 2>$null
if ($LASTEXITCODE -eq 0 -and $analyses -and @($analyses | ConvertFrom-Json).Count -gt 0) { $hasCodeScanning = $true }
else { Write-Host '  No code scanning results yet: the CodeQL gate is skipped. Run this script again after CodeQL runs.' }

$branchRef = if ($Branch -eq $DefaultBranch) { '~DEFAULT_BRANCH' } else { "refs/heads/$Branch" }
$branchRules = @(
    @{ type = 'deletion' },
    @{ type = 'non_fast_forward' },
    @{ type = 'required_signatures' },
    @{
        type       = 'pull_request'
        parameters = @{
            required_approving_review_count   = 1
            dismiss_stale_reviews_on_push     = $true
            require_code_owner_review         = $true
            require_last_push_approval        = $true
            required_review_thread_resolution = $true
            allowed_merge_methods             = @('squash', 'merge')
        }
    },
    @{
        type       = 'required_status_checks'
        parameters = @{
            strict_required_status_checks_policy = $true
            required_status_checks               = @($RequiredChecks | ForEach-Object { @{ context = $_ } })
        }
    }
)
if ($hasCodeScanning) {
    $branchRules += @{
        type       = 'code_scanning'
        parameters = @{
            code_scanning_tools = @(@{
                    tool                      = 'CodeQL'
                    security_alerts_threshold = 'high_or_higher'
                    alerts_threshold          = 'errors'
                })
        }
    }
}
Set-Ruleset @{
    name          = "Protect $Branch"
    target        = 'branch'
    enforcement   = 'active'
    conditions    = @{ ref_name = @{ include = @($branchRef); exclude = @() } }
    # Admins may merge pull requests that are not yet approved (solo maintainer), but cannot push directly.
    bypass_actors = @(@{ actor_id = $AdminRoleId; actor_type = 'RepositoryRole'; bypass_mode = 'pull_request' })
    rules         = $branchRules
}

Write-Host '5. Ruleset: protect release tags'
Set-Ruleset @{
    name          = 'Protect release tags'
    target        = 'tag'
    enforcement   = 'active'
    conditions    = @{ ref_name = @{ include = @('refs/tags/v*'); exclude = @() } }
    bypass_actors = @(
        @{ actor_id = $GitHubActionsAppId; actor_type = 'Integration'; bypass_mode = 'always' },
        @{ actor_id = $AdminRoleId; actor_type = 'RepositoryRole'; bypass_mode = 'always' }
    )
    rules         = @(
        @{ type = 'update' },
        @{ type = 'deletion' },
        @{ type = 'non_fast_forward' }
    )
}

if ($CreateInitialRelease) {
    Write-Host '6. Initial release v1.0.0'
    $releases = gh release list --repo $Repository --json tagName | ConvertFrom-Json
    if ($releases | Where-Object { $_.tagName -eq 'v1.0.0' }) {
        Write-Host '  v1.0.0 already exists'
    }
    elseif ($PSCmdlet.ShouldProcess('v1.0.0', 'Create release')) {
        gh release create v1.0.0 --repo $Repository --target $DefaultBranch --title 'v1.0.0' `
            --notes 'First release: the 23 GoF design patterns in C#, TypeScript/React, Python and Go. See CHANGELOG.md.'
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the v1.0.0 release.' }
    }
}

Write-Host ''
Write-Host 'Done. Remaining manual step:' -ForegroundColor Green
Write-Host '  Settings -> General -> Social preview -> upload .github/assets/social-preview.png'
