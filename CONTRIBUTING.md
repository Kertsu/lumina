# Contributing

## Formatting

- Object literals: multiline, one property per line, including single-property
  objects. Empty objects: `{}`.
- Arrays: one line when they fit Biome's line width; let Biome wrap longer arrays.
- Start nonempty object literals with a newline after `{`; Biome preserves
  expansion. After formatting, check objects in every changed file remain expanded.

## Implementation branches

Create and switch to a dedicated branch before implementing each issue or
slice. Start with the branch name suggested by GitHub's **Create a branch for
this issue** action, then append `-<github-name>` for the person doing the
work and making the commit. Get the name with `gh api user --jq .name`.

For example, issue #22 becomes
`1-add-fuzzy-search-functionality-Kurtd-Daniel-Bigtas` when
Kurtd Daniel Bigtas does the work. Open the pull request from that branch.

## Database migrations

Name SQL files `VYYYYMMDDHHmmss_description.sql` using UTC creation time
(year, month, day, hour, minute, second; four-digit year and 24-hour time)
and a lowercase snake_case description. Example: `V20261021161209_foundation.sql`.
Year-first timestamps keep filenames in chronological order.

Register each file in `crates/lumina-persistence/src/migrations.rs` with the
next sequential schema version. Filenames record creation time;
`PRAGMA user_version` stores the sequential version. Append migrations;
keep merged filenames, SQL, and registered versions unchanged.

## Commit messages

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[(scope)][!]: <description>
```

Parenthesized scope and `!` are optional; omit the square brackets.

1. Use `feat` for new features and `fix` for bug fixes. Other types include
   `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, and
   `test`.
2. Use a lowercase type and start the description with a lowercase letter
   unless it starts with a proper noun. Use the imperative mood.
3. Keep the entire subject, including the prefix, at 50 characters or
   fewer, with no ending period.
4. If a body is needed, separate it from the subject with a blank line.
5. Wrap each body line at 72 characters or fewer.
6. Explain what changed and why in the body; let the diff show how.
7. Put issue references at the end of the body, rather than in the subject.

### Scopes

Use one of these lowercase scopes when a change has a clear owner, following
the [architecture responsibility map](docs/architecture.md):

| Scope | Responsibility and paths |
| --- | --- |
| `core` | Domain types and pure rules in `crates/lumina-core/` |
| `app` | Use cases, application state, errors, and interfaces in `crates/lumina-app/` |
| `persistence` | SQLite operations and migrations in `crates/lumina-persistence/` |
| `desktop` | Startup, IPC handlers, native adapters, capabilities, and packaging in `src-tauri/` |
| `frontend` | React composition, routes, features, bridge, shared UI, and styles in `src/`; browser assets in `public/` and `index.html` |

`app` always means the Rust application library. Changes to `src/app/`,
`src/bridge/`, and `src/shared/ui/` use `frontend`. These are the complete
current scopes; update this table when introducing a new architectural area.

- Choose the scope owning the main change. Include related tests, docs,
  configuration, and generated files in the same commit and scope. For example,
  an application contract change with regenerated TypeScript uses `app`.
- Split independent changes. For a cohesive change spanning areas, use its
  primary owner; omit the scope if no single area owns it. Use at most one scope.
- Dependency updates use the affected area's scope, even when declared in a
  root manifest or lockfile. Repository-wide dependency, tooling, CI, and
  contributor-documentation changes omit the scope: `build:`, `chore:`, `ci:`,
  or `docs:` as appropriate. Area-specific docs and tests use that area's scope,
  such as `docs(desktop):` or `test(persistence):`.

```text
feat(core): add verse reference validation
refactor(app): simplify startup state
fix(persistence): preserve migration version
fix(desktop): report database startup failures
feat(frontend): show pending greeting state
ci: cache Rust dependencies
```

### SemVer

The type and breaking-change marker determine release impact; scopes only
identify the affected area. `fix` indicates a patch release and `feat` a minor
release. Other types have no implicit SemVer impact unless they introduce a
breaking change.

Breaking changes of any type indicate a major release: append `!` immediately
before the colon, as in `feat(app)!: replace the greeting contract`, or add a
`BREAKING CHANGE: <description>` footer separated by a blank line. Explain the
incompatibility and required migration in the description or footer.

### Commit body

A body is optional when the subject fully explains a small change.

```text
docs: document commit message conventions

Give contributors one shared format for explaining changes.
Keep commit history easy to scan and useful during review.

Closes #22
```
