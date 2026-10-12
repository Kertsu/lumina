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

## Commit messages

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[!]: <description>
```

Omit scopes until modules are defined for both stacks.

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

For SemVer, `fix` indicates a patch release and `feat` a minor release.
Breaking changes indicate a major release: append `!` before the colon or
add a `BREAKING CHANGE: <description>` footer separated by a blank line.

A body is optional when the subject fully explains a small change.

```text
docs: document commit message conventions

Give contributors one shared format for explaining changes.
Keep commit history easy to scan and useful during review.

Closes #22
```
