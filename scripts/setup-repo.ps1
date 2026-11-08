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
      * a ruleset protecting `main` (pull requests, required checks, CodeQL gate, signed commits,
        no force pushes or deletion);
      * a ruleset protecting release tags `v*`;
      * optionally, the initial v1.0.0 release that release-please continues from.

    The social preview image cannot be set through the API: upload .github/assets/social-preview.png
    in Settings -> General -> Social preview.

.PARAMETER Repository
    owner/name of the repository. Defaults to danielfyo/design-patterns.

.PARAMETER CreateInitialRelease
    Also tag the current `main` as v1.0.0 and publish the GitHub release (run after the first merge).

.EXAMPLE
    ./scripts/setup-repo.ps1
    ./scripts/setup-repo.ps1 -CreateInitialRelease
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $Repository = 'danielfyo/design-patterns',
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
gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Run "gh auth login" first.' }

Write-Host "Configuring $Repository" -ForegroundColor Cyan

Write-Host '1. Repository and merge options'
Invoke-GitHub PATCH "repos/$Repository" @{
    description                 = 'The 23 GoF design patterns with the same practical example in C#/.NET, TypeScript/React, Python and Go: lessons, runnable code and tests.'
    has_issues                  = $true
    has_wiki                    = $false
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
    can_approve_pull_request_reviews = $false
} | Out-Null
try {
    Invoke-GitHub PUT "repos/$Repository/actions/permissions/fork-pr-contributor-approval" @{
        approval_policy = 'all_external_contributors'
    } | Out-Null
}
catch {
    Write-Warning 'Could not set the fork approval policy through the API. Set it in Settings -> Actions -> General -> "Approval for running fork pull request workflows from contributors" -> "Require approval for all external contributors".'
}

Write-Host '4. Ruleset: protect main'
Set-Ruleset @{
    name          = 'Protect main'
    target        = 'branch'
    enforcement   = 'active'
    conditions    = @{ ref_name = @{ include = @('~DEFAULT_BRANCH'); exclude = @() } }
    # Admins may merge pull requests that are not yet approved (solo maintainer), but cannot push directly.
    bypass_actors = @(@{ actor_id = $AdminRoleId; actor_type = 'RepositoryRole'; bypass_mode = 'pull_request' })
    rules         = @(
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
        },
        @{
            type       = 'code_scanning'
            parameters = @{
                code_scanning_tools = @(@{
                        tool                      = 'CodeQL'
                        security_alerts_threshold = 'high_or_higher'
                        alerts_threshold          = 'errors'
                    })
            }
        }
    )
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
        @{ type = 'creation' },
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
        gh release create v1.0.0 --repo $Repository --target main --title 'v1.0.0' `
            --notes 'First release: the 23 GoF design patterns in C#, TypeScript/React, Python and Go. See CHANGELOG.md.'
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the v1.0.0 release.' }
    }
}

Write-Host ''
Write-Host 'Done. Remaining manual step:' -ForegroundColor Green
Write-Host '  Settings -> General -> Social preview -> upload .github/assets/social-preview.png'
