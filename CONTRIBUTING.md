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

Follow the [seven rules for commit messages](https://cbea.ms/git-commit/):

1. Start the subject with an uppercase letter and use the imperative mood.
2. Keep the subject at 50 characters or fewer, with no ending period.
3. If a body is needed, separate it from the subject with a blank line.
4. Wrap each body line at 72 characters or fewer.
5. Explain what changed and why in the body; let the diff show how.
6. Put issue references at the end of the body, rather than in the subject.

A body is optional when the subject fully explains a small change.

```text
Document commit message conventions

Give contributors one shared format for explaining changes.
Keep commit history easy to scan and useful during review.

Closes #22
```
