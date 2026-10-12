# Verification: Manual App Checks

The maintainer verifies each PR by running the app and may delegate verification to an agent. Agents must not create or modify automated test files unless the maintainer explicitly changes this policy. This policy overrides skill requirements for TDD, regression tests, and test-suite completion.

For each behavior change, provide a short manual check with starting conditions, action, and expected visible result. Include affected success and failure paths where relevant. The maintainer need not report results. When delegated, the agent runs the checks in the app and reports observed results and any checks it could not perform. Claim behavioral verification only from running the app; code review and static checks are separate evidence.

## Manual verification guides

Save guides in `docs/manual-verification/` in the main/master checkout:

- When an issue, ticket, or task has both a number and a name, use `<number>-<name>.md`. Use the full name in lowercase kebab case: replace spaces and punctuation with hyphens, collapse repeated hyphens, and trim leading/trailing hyphens. Example: issue #22, “Add fuzzy search” → `22-add-fuzzy-search.md`.
- When either the number or name is missing, use `MM-DD-YYYY-<short-descriptive-name>.md`, using the creation date in the maintainer's local timezone and a lowercase kebab-case description. Example: `10-13-2026-manual-verification-policy.md`.

Guides contain check instructions; result tracking, status checklists, and post-check updates are not required. Keep filenames stable. This directory is gitignored; keep guides local.

## Worktrees

Use `git worktree list --porcelain` to find the `worktree` path paired with `branch refs/heads/main`, or `branch refs/heads/master` if main is not checked out. Save guides at `<that-worktree>/docs/manual-verification/`, even when implementation happens in another worktree. If neither branch is checked out, ask the maintainer for the shared destination before saving a guide.

Example: a task completed in worktree A saves its guide in the main/master worktree's `docs/manual-verification/`. Implementation stays in worktree A.

## Other checks

Agents may run available non-test checks, such as typecheck, build, lint, and format checks, and report results separately. Existing automated tests may be run when useful; new or changed test files are not a completion criterion.

For bugs, capture the original symptom and reproduction steps before changing code. After the fix, provide the same steps and expected corrected result for the maintainer or delegated agent. Report direct reproduction evidence when available.
