# Design: Publish `goldenchart-mcp` to npm (v0.1.0)

**Date:** 2026-05-26
**Status:** Approved (pending spec review)
**Topic:** Make the MCP server (`goldenchart-mcp`) installable/runnable from npm (`npx goldenchart-mcp`) via a decoupled, tag-triggered GitHub Actions release with provenance. Sub-project 2 of the 3-part "ship it" effort.

## Context

`goldenchart@0.1.0` is live on npm (sub-project 1). `goldenchart-mcp` lives in `mcp/` (same repo), is feature-complete (~43 tools, snapshot-locked), and has a `bin` entry (`goldenchart-mcp` → `dist/index.js`) with a shebang already handled by tsup (`banner: { js: '#!/usr/bin/env node' }`). Its `goldenchart` dependency is `file:..`, which cannot be published as-is. This is the last code-side blocker to it being installable. The docs/playground site (sub-project 3) is out of scope.

Verified facts:
- mcp build (tsup, ESM, `external: ['goldenchart','goldenchart/server','react','react-dom','@resvg/resvg-js']`) emits a 79 KB `dist/index.js` with **no inlined fonts** — esbuild's `external: ['goldenchart']` already covers subpaths (`/fonts`, `/server`), so they resolve from the installed `goldenchart` at runtime. No tsup change needed.
- `mcp/package.json`: `name: goldenchart-mcp`, `v0.0.1`, `license: MIT`, `bin`, `files: ["dist"]`, `goldenchart: file:..`. Has `mcp/README.md`, no `mcp/LICENSE`.
- The existing `.github/workflows/release.yml` (`v*` tags) publishes only the root library; it is not touched here.

## Design

### 1. Dependency flow (the crux)
Keep `mcp/package.json`'s `"goldenchart": "file:.."` **committed unchanged**, and rewrite it to a published caret range only at publish time in CI.

Rationale: committed `file:..` preserves the local `--install-links` dev workflow and keeps the mcp CI job (in `ci.yml`) testing against the freshly-built local library on every push — catching lib+mcp integration breaks at the commit that causes them. Committing `^0.1.0` instead would make CI test mcp against whatever is already on npm, losing that coverage. Publishing `file:..` is broken for consumers, so a publish-time rewrite is mandatory regardless; this is its clean form.

The release workflow, after building the local lib and installing it into mcp, reads the resolved lib version and pins the range:
```
LIB=$(node -p "require('goldenchart/package.json').version")   # run from mcp/
npm pkg set dependencies.goldenchart="^$LIB"
```
This makes the published tarball declare `^<the lib version it was built/tested against>` (e.g. `^0.1.0`) while the repo keeps `file:..`. Caret range lets mcp consumers receive library 0.1.x updates. Requirement: that lib version must already be on npm (0.1.0 is).

### 2. `mcp/package.json` metadata
- `version`: `0.0.1` → `0.1.0`.
- Add `author`: `"Ben Severn"`.
- Add `repository`: `{ "type": "git", "url": "git+https://github.com/benseverndev-oss/GoldenChart.git", "directory": "mcp" }` (the `directory` field marks it as a subdir package).
- Add `homepage`: `https://github.com/benseverndev-oss/GoldenChart/tree/main/mcp#readme`.
- Add `bugs`: `{ "url": "https://github.com/benseverndev-oss/GoldenChart/issues" }`.
- Add `publishConfig`: `{ "access": "public", "provenance": true }`.
- Add script `prepublishOnly: "npm run build"` (so `dist/` — including the `bin` — is fresh on any publish path).
- Do NOT change `name`, `license`, `bin`, `files`, `type`, dependencies (the `file:..` stays committed), devDependencies, or the other scripts.

### 3. `mcp/LICENSE`
Add an MIT `LICENSE` in `mcp/` (same text as the root, `Copyright (c) 2026 Ben Severn`) so the published package includes its license file.

### 4. Release workflow `.github/workflows/release-mcp.yml`
- **Trigger:** `on: push: tags: ['mcp-v*']`.
- **Permissions (job level):** `id-token: write`, `contents: read`.
- **Job (ubuntu-latest, node 20):**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: 20`, `registry-url: 'https://registry.npmjs.org'`.
  3. `npm ci` (root) then `npm run build` (root) — builds the local `goldenchart` so mcp's `file:..` resolves. (CI is Linux; `file:..` works without the Windows `--install-links` workaround.)
  4. `npm install` in `mcp/` (working-directory: `mcp`).
  5. **Tag/version guard** (working-directory: `mcp`): read version via `node -p "require('./package.json').version"`; assert it equals `${GITHUB_REF_NAME#mcp-v}`; fail on mismatch.
  6. `npm run build`, `npm run typecheck`, `npm test` — all in `mcp/`.
  7. **Pin step** (working-directory: `mcp`): `LIB=$(node -p "require('goldenchart/package.json').version"); npm pkg set dependencies.goldenchart="^$LIB"; echo "pinned ^$LIB"`.
  8. `npm publish` (working-directory: `mcp`) with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (access + provenance from `publishConfig`).

This is a NEW workflow file; `release.yml` and `ci.yml` are unchanged.

### 5. Verification (during implementation)
- `npm run build` (root) → `cd mcp && npm install` → `npm run build && npm run typecheck && npm test` all green.
- Locally simulate the pin step: confirm `node -p "require('goldenchart/package.json').version"` (from mcp) returns `0.1.0` and that `npm pkg set` would write `^0.1.0` — but **do not commit** the rewritten dep; verify then `git checkout -- mcp/package.json` if a real `npm pkg set` was run locally to test it.
- `cd mcp && npm pack --dry-run`: tarball contains only `dist/**`, `package.json`, `README.md`, `LICENSE`; `bin` present; `dist/index.js` begins with the `#!/usr/bin/env node` shebang. No `src/`, tests, scripts, or `node_modules`.
- `release-mcp.yml` YAML parses; the tag-guard and pin shell logic validated locally with a simulated `GITHUB_REF_NAME=mcp-v0.1.0`.

## Manual prerequisites (user actions)
1. `NPM_TOKEN` org secret already exists (visibility `all`) and reaches this repo — no action.
2. The pinned library version (`0.1.0`) is already on npm — no action.
3. To release: after merge, push tag **`mcp-v0.1.0`** (or cut a GitHub Release at that tag) to trigger the publish. Inert until then.

## Out of scope (YAGNI)
- Docs/playground site (sub-project 3).
- Any library (`src/`) or `release.yml` change.
- Converting the repo to npm workspaces (preserving `file:..` + publish-time rewrite avoids the restructure).
- Lockstep lib/mcp versioning (decoupled `mcp-v*` was chosen).
- Changelog automation.

## Risks
- **Publishing `file:..`:** prevented — the pin step rewrites the dep before `npm publish`, and `prepublishOnly` only builds (doesn't touch deps). If the pin step is skipped, npm would publish a broken `file:..` dep; the step is therefore required and ordered before publish.
- **Lib version not on npm:** the pinned `^<libversion>` must be published first; 0.1.0 is. Documented.
- **Tag/version drift:** mitigated by the `mcp-v*` tag-vs-`package.json` guard.
- **Provenance:** requires `id-token: write` + public repo + CI publish — all satisfied. `repository.url` matches the building repo (the `directory` field is informational and does not break provenance).

## Success criteria
- `mcp/package.json` at `0.1.0` with metadata, `publishConfig`, `prepublishOnly`; `goldenchart` dep still `file:..` in the repo; `name`/`bin`/`files`/`license` unchanged.
- `mcp/LICENSE` present.
- `release-mcp.yml` committed, YAML-valid, would publish `goldenchart-mcp@0.1.0` with provenance and a `^0.1.0` goldenchart dependency on a `mcp-v0.1.0` tag.
- `npm pack --dry-run` shows a clean tarball with an executable bin.
- mcp build/typecheck/test green; no library or `release.yml`/`ci.yml` changes.
