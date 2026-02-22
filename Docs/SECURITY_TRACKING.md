# Security Tracking

## Open follow-up items

### DEV-2026-02: vite/esbuild advisory in dev toolchain

- Status: `open`
- Severity: `moderate`
- Affected path: `vitest -> vite -> esbuild`
- Advisory: `GHSA-67mh-4wv8-2f99`
- Current policy: defer to quarterly major-upgrade window
- Blocker: `vitest@4` requires Node 20+, project baseline is Node 18

Suggested labels in GitHub:

- `security`
- `dev-dependency`
- `major-upgrade`

Suggested issue title:

- `security(dev): plan vitest/vite/esbuild major upgrade when Node baseline moves to >=20`

Exit condition:

- Close this item only when the dev toolchain is upgraded and CI is green on the supported Node matrix.
