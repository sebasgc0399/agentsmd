# Dependency Update Policy

## Scope

- Keep project compatibility at `Node.js >= 18`.
- Prefer stability over "latest" versions.
- Keep dependency PRs small and easy to review.

## Update cadence

- Monthly maintenance cycle.
- Maximum 2 dependency PRs per cycle:
1. Runtime deps (`commander`, `mustache`)
2. Dev deps (all development dependencies)

## Runtime update flow (PR A)

1. Run `npm run deps:update:runtime`.
2. Verify with `npm run deps:verify:runtime`.
3. Review `git diff -- package.json package-lock.json`.
4. Reject any implicit major update or engine baseline change.

## Dev update flow (PR B)

1. Run `npm run deps:update:all`.
2. If runtime deps were touched, separate runtime changes into PR A.
3. Verify with `npm run deps:verify:dev`.
4. Review `git diff -- package.json package-lock.json`.
5. Reject any implicit major update or engine baseline change.

## Security policy

- Runtime vulnerabilities (`npm audit --omit=dev`):
  - If severity is `high` or `critical`, open a hotfix PR immediately.
- Dev-only vulnerabilities:
  - Handle in scheduled dependency windows.
  - Avoid `npm audit fix --force` in normal branches.

## Major upgrade window (quarterly)

- Evaluate pending majors once per quarter.
- While `engines.node` stays at `>=18`, do not merge majors that require Node 20+.
- Current blocked majors:
  - `commander` 11 -> 14 (requires Node 20+)
  - `vitest` 1 -> 4 (requires Node 20+)

## Release policy

- Do not release for every dependency PR.
- Bundle maintenance updates and publish a quarterly patch release.
- Include a dedicated `Dependencies` section in changelog entries.

## Required validation baseline

These checks are mandatory before merge:

- `npm run lint`
- `npm test`
- `npm run benchmark:lite`
- `npm pack --dry-run`
