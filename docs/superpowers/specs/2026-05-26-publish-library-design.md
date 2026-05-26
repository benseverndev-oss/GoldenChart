# Design: Publish `goldenchart` to npm (v0.1.0)

**Date:** 2026-05-26
**Status:** Approved (pending spec review)
**Topic:** Make the finished `goldenchart` library installable from npm via a tag-triggered GitHub Actions release with provenance. Packaging only — no library code or API changes.

## Context

The library is feature-complete and hardened (font bundle de-bloated, MCP output snapshot-locked) but unpublished at `v0.0.1`. The npm name `goldenchart` is available (registry returns 404). This is sub-project 1 of a 3-part "ship it" effort; sub-projects 2 (publish `goldenchart-mcp`) and 3 (deploy docs/playground site) follow in their own spec→plan→implement cycles and are **out of scope here**. The MCP publish depends on this one (its `goldenchart` dependency is `file:..` and must become a real semver range only after this is live).

## Current gaps (what blocks a clean publish)

- No `LICENSE` file, though `package.json` declares `"license": "MIT"`.
- Missing registry metadata: `repository`, `homepage`, `bugs`, `author`.
- No build-before-publish guard. `dist/` is git-ignored (not committed) and there is no `prepublishOnly`/`prepack`, so a publish could ship a stale or empty `dist/`.
- Version is `0.0.1`.
- No release workflow.

What is already correct and must stay untouched: `files: ["dist"]`, the `exports` map (`.`, `./server`, `./fonts`), `types`, `sideEffects: false`, `peerDependencies` (react/react-dom), `keywords`.

## Design

### 1. LICENSE file
Add a standard MIT `LICENSE` at repo root: `Copyright (c) 2026 Ben Severn`, standard MIT body.

### 2. `package.json` metadata
- `version`: `0.0.1` → `0.1.0` (first public release; pre-1.0 signals the API may still evolve).
- Add `repository`: `{ "type": "git", "url": "git+https://github.com/benseverndev-oss/GoldenChart.git" }`
- Add `homepage`: `https://github.com/benseverndev-oss/GoldenChart#readme` (repointed to the docs site in sub-project 3).
- Add `bugs`: `{ "url": "https://github.com/benseverndev-oss/GoldenChart/issues" }`
- Add `author`: `"Ben Severn"`
- Add `publishConfig`: `{ "access": "public", "provenance": true }`
- Add script `prepublishOnly: "npm run build"` — a local safety net so no publish path ships a stale/empty `dist/`.

Do not change `name`, `license`, `files`, `exports`, `types`, `sideEffects`, dependency lists, or `keywords`.

### 3. Release workflow `.github/workflows/release.yml`
- **Trigger:** `on: push: tags: ['v*']`.
- **Permissions:** `id-token: write` (required by npm provenance) and `contents: read`.
- **Job (ubuntu-latest, node 20):**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: 20` and `registry-url: 'https://registry.npmjs.org'` (so `NODE_AUTH_TOKEN` is wired for publish).
  3. `npm ci`
  4. **Tag/version guard:** assert the pushed tag (`${GITHUB_REF_NAME}` without the leading `v`) equals `package.json` `version`; fail the job on mismatch so a mis-tagged release can't publish the wrong version.
  5. `npm run build`
  6. `npm run typecheck`
  7. `npm test`
  8. `npm publish` (access + provenance come from `publishConfig`; provenance also needs the `id-token` permission above), with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

This workflow is separate from the existing `ci.yml` (which keeps running on push/PR). The library job in `ci.yml` is unchanged.

### 4. Verification (during implementation)
- `npm run build && npm run check:bundle && npm test && npm run typecheck` all green.
- `npm pack --dry-run` and inspect the file list: the tarball must contain only `dist/**`, `package.json`, `README.md`, and `LICENSE` — **no** `src/`, tests, `mcp/`, `docs/`, or config files. This is the primary preflight that proves the package is clean.
- Validate the workflow YAML parses and the version-guard logic is correct (e.g. run the guard shell snippet locally against a sample tag).

## Manual prerequisites (user actions — cannot be automated here)
1. Create an npm **Automation** access token (the automation type bypasses 2FA in CI) on the account that will own `goldenchart`.
2. Add it as the GitHub repo secret **`NPM_TOKEN`**.
3. The repo must be public (it is) for provenance to work.
4. To release: bump is already to `0.1.0`; after merge, push tag `v0.1.0` (or cut a GitHub Release at that tag) to trigger the publish.

The workflow is inert until the secret exists and a `v*` tag is pushed. Nothing here publishes automatically on merge.

## Out of scope (YAGNI)
- Publishing `goldenchart-mcp` (sub-project 2; depends on this being live).
- Docs/playground site deployment (sub-project 3).
- A recurring `npm publish --dry-run` PR check (the `prepublishOnly` guard + the release workflow's build/test/pack steps are sufficient; can be added later if packaging regressions ever occur).
- Any library code, API, or `exports` changes.
- Changelog/release-notes automation.

## Risks
- **Stale `dist/` in publish:** mitigated by `prepublishOnly` + the workflow building explicitly before `npm publish`.
- **Version/tag drift:** mitigated by the workflow's tag-vs-`package.json` guard.
- **Provenance failure:** requires `id-token: write` + public repo + publishing through the workflow (not local); all satisfied by the design.
- **Token/login gating:** the publish cannot succeed until the user adds `NPM_TOKEN`; this is documented and expected, not a code defect.

## Success criteria
- LICENSE present; `package.json` carries the metadata, `0.1.0`, `publishConfig`, and `prepublishOnly`.
- `release.yml` is committed, YAML-valid, and would publish with provenance on a `v0.1.0` tag.
- `npm pack --dry-run` shows a clean tarball (dist + package.json + README + LICENSE only).
- All existing checks (build, bundle guard, tests, typecheck) stay green.
