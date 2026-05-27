# Publish `goldenchart-mcp` to npm (v0.1.0) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MCP server `goldenchart-mcp` publishable to npm (`npx goldenchart-mcp`) via a decoupled, tag-triggered (`mcp-v*`) GitHub Actions release with provenance — packaging only, no library or MCP runtime code changes.

**Architecture:** Add the missing publish artifacts to `mcp/` (LICENSE, metadata, build guard, version) and a `release-mcp.yml` workflow. The committed `goldenchart` dependency stays `file:..` (preserves local + CI integration testing); the workflow rewrites it to `^<libversion>` only at publish time. Inert until `NPM_TOKEN` (already set) + a pushed `mcp-v0.1.0` tag.

**Tech Stack:** npm (provenance), GitHub Actions, tsup. The `goldenchart` library is already live on npm at `0.1.0`.

**Spec:** `docs/superpowers/specs/2026-05-26-publish-mcp-design.md`

---

## Notes for the implementer

- This is config/packaging work; verify with concrete commands (`npm pack --dry-run`, font grep, YAML parse), not unit tests.
- Do NOT change MCP runtime code (`mcp/src/**`), the library (`src/**`), `release.yml`, `ci.yml`, or `mcp/tsup.config.ts`. Do NOT change the committed `goldenchart: "file:.."` dependency — it stays `file:..` in the repo (the workflow rewrites it at publish only).
- `mcp/dist/` is git-ignored; never commit it.
- The root `LICENSE` already exists (added when the library was published) — reuse it.
- Append to each commit message a blank line then `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Branch is `feature/publish-mcp`.
- mcp commands run from the `mcp/` directory. The `goldenchart` dep is installed into `mcp/node_modules` via `file:..`; if it's stale, refresh per the repo's Windows recipe: `npm run build` (root) then `rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)`.

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `mcp/LICENSE` | **Create** | MIT license (copy of root) so the published package carries it. |
| `mcp/package.json` | Modify | Version bump, registry metadata, `keywords`, `publishConfig`, `prepublishOnly`. Dependency stays `file:..`. |
| `.github/workflows/release-mcp.yml` | **Create** | `mcp-v*` tag → build lib → install/build/test mcp → pin dep → `npm publish` with provenance. |

---

## Task 1: Add `mcp/LICENSE`

**Files:**
- Create: `mcp/LICENSE`

- [ ] **Step 1: Copy the root LICENSE into `mcp/`.**
```bash
cp LICENSE mcp/LICENSE
```

- [ ] **Step 2: Verify** it's the MIT text: `head -1 mcp/LICENSE` → `MIT License`, and `grep -c "Ben Severn" mcp/LICENSE` → `1`.

- [ ] **Step 3: Commit.**
```bash
git add mcp/LICENSE
git commit -m "Add MIT LICENSE to the MCP package"
```

---

## Task 2: `mcp/package.json` publish metadata

**Files:**
- Modify: `mcp/package.json`

Current relevant structure: line 2 `"name": "goldenchart-mcp"`, line 3 `"version": "0.0.1",`, line 4 `"description": "..."` (ends with comma), line 5 `"license": "MIT",`, then `"type"`, `"bin"`, `"files": ["dist"]` block, `"scripts"` (first entry `"dev": "tsx src/index.ts",` then `"build": "tsup",`), `"dependencies"` (includes `"goldenchart": "file:.."`).

- [ ] **Step 1: Bump version.** Change `"version": "0.0.1",` → `"version": "0.1.0",`.

- [ ] **Step 2: Add metadata + keywords** immediately AFTER the `"description": "..."` line (which ends with a comma):
```json
  "author": "Ben Severn",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/benseverndev-oss/GoldenChart.git",
    "directory": "mcp"
  },
  "homepage": "https://github.com/benseverndev-oss/GoldenChart/tree/main/mcp#readme",
  "bugs": {
    "url": "https://github.com/benseverndev-oss/GoldenChart/issues"
  },
  "keywords": ["mcp", "model-context-protocol", "goldenchart", "charts", "svg", "ai", "llm"],
```

- [ ] **Step 3: Add `publishConfig`** after the `"files": ["dist"]` block's closing `],`:
```json
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
```

- [ ] **Step 4: Add the build guard** inside `"scripts"`, right after `"build": "tsup",`:
```json
    "prepublishOnly": "npm run build",
```

- [ ] **Step 5: Verify JSON validity + fields + that protected fields are unchanged.** Run from `mcp/`:
```bash
cd mcp && node -e "const p=require('./package.json'); if(p.version!=='0.1.0')throw new Error('version'); if(!p.repository||p.repository.directory!=='mcp'||!p.homepage||!p.bugs||!p.author)throw new Error('metadata'); if(!Array.isArray(p.keywords)||!p.keywords.includes('mcp'))throw new Error('keywords'); if(p.publishConfig.access!=='public'||p.publishConfig.provenance!==true)throw new Error('publishConfig'); if(p.scripts.prepublishOnly!=='npm run build')throw new Error('prepublishOnly'); if(p.name!=='goldenchart-mcp'||p.license!=='MIT'||p.bin['goldenchart-mcp']!=='dist/index.js'||p.dependencies.goldenchart!=='file:..')throw new Error('protected field changed'); console.log('mcp package.json OK:', p.name, p.version, 'dep:', p.dependencies.goldenchart);" ; cd ..
```
Expected: `mcp package.json OK: goldenchart-mcp 0.1.0 dep: file:..` (confirms the dep is STILL `file:..` — it must not be changed here).

- [ ] **Step 6: Commit.**
```bash
git add mcp/package.json
git commit -m "Add npm publish metadata, keywords, publishConfig, prepublishOnly to MCP package; bump to 0.1.0"
```

---

## Task 3: Release workflow `release-mcp.yml`

**Files:**
- Create: `.github/workflows/release-mcp.yml`

- [ ] **Step 1: Create `.github/workflows/release-mcp.yml`** with this exact content:

```yaml
name: Release MCP

on:
  push:
    tags:
      - 'mcp-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      # Build the local library so the MCP package's file:.. dependency resolves.
      - run: npm ci
      - run: npm run build
      - name: Install MCP deps
        working-directory: mcp
        run: npm install
      - name: Verify tag matches MCP package.json version
        working-directory: mcp
        run: |
          PKG_VERSION="$(node -p "require('./package.json').version")"
          TAG_VERSION="${GITHUB_REF_NAME#mcp-v}"
          if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
            echo "Tag $GITHUB_REF_NAME ($TAG_VERSION) != MCP version $PKG_VERSION"
            exit 1
          fi
          echo "Version OK: $PKG_VERSION"
      - name: Build, typecheck, test MCP
        working-directory: mcp
        run: |
          npm run build
          npm run typecheck
          npm test
      # Replace the committed file:.. with a published caret range for the tarball.
      # prepublishOnly will rebuild on publish; that double-build is intentional.
      - name: Pin goldenchart dependency for publish
        working-directory: mcp
        run: |
          LIB_VERSION="$(node -p "require('goldenchart/package.json').version")"
          npm pkg set dependencies.goldenchart="^$LIB_VERSION"
          echo "Pinned goldenchart ^$LIB_VERSION"
      - name: Publish
        working-directory: mcp
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Validate the YAML parses.**
```bash
npx --yes js-yaml .github/workflows/release-mcp.yml > /dev/null && echo "YAML OK"
```
(Fallback if `npx` is offline: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-mcp.yml')); print('YAML OK')"`.)

- [ ] **Step 3: Sanity-check the tag-guard + pin logic locally** (the `goldenchart` dep must be installed in `mcp/node_modules` first — run `npm run build` at root then `cd mcp && npm install` if needed):
```bash
cd mcp
GITHUB_REF_NAME=mcp-v0.1.0; PKG="$(node -p "require('./package.json').version")"; TAG="${GITHUB_REF_NAME#mcp-v}"; [ "$PKG" = "$TAG" ] && echo "tag guard passes for mcp-v0.1.0 (version $PKG)"
GITHUB_REF_NAME=mcp-v9.9.9; TAG="${GITHUB_REF_NAME#mcp-v}"; [ "$PKG" != "$TAG" ] && echo "tag guard rejects mcp-v9.9.9"
LIB="$(node -p "require('goldenchart/package.json').version")"; echo "pin would set: ^$LIB"
cd ..
```
Expected: both guard echoes print, and `pin would set: ^0.1.0`.

- [ ] **Step 4: Commit.**
```bash
git add .github/workflows/release-mcp.yml
git commit -m "Add tag-triggered MCP release workflow (mcp-v*) with provenance"
```

---

## Task 4: Final verification

- [ ] **Step 1: Build + integration green.** From repo root:
```bash
npm run build && (cd mcp && npm install && npm run build && npm run typecheck && npm test)
```
All pass.

- [ ] **Step 2: Confirm fonts are externalized (not inlined).**
```bash
grep -c "data:font/ttf;base64" mcp/dist/index.js
```
Expected: `0`. Also confirm the bin shebang: `head -1 mcp/dist/index.js` → `#!/usr/bin/env node`.

- [ ] **Step 3: Inspect the publish tarball.**
```bash
cd mcp && npm pack --dry-run 2>&1 | grep -E "npm notice|files|size" | head -40 ; cd ..
```
Confirm contents are only `dist/**`, `package.json`, `README.md`, `LICENSE` — no `src/`, tests, `scripts/`, or `node_modules`. Note the `bin` is included.

- [ ] **Step 4: Confirm the dep pin does NOT get committed.** If any local `npm pkg set` was run while testing, restore: `git checkout -- mcp/package.json`. Then confirm the committed dep is still `file:..`:
```bash
node -p "require('./mcp/package.json').dependencies.goldenchart"
```
Expected: `file:..`.

- [ ] **Step 5: Clean tree.** `git status` clean except intended; no `mcp/dist/`, `*.tgz`, or `node_modules/` staged; no `mcp/src/`, `src/`, `release.yml`, or `ci.yml` changes.

No commit in this task (verification only).

---

## Final checklist (before finishing the branch)

- [ ] `mcp/LICENSE` present (MIT, Ben Severn).
- [ ] `mcp/package.json` at `0.1.0` with metadata/keywords/publishConfig/prepublishOnly; `name`/`bin`/`files`/`license` unchanged; **dependency still `file:..`**.
- [ ] `release-mcp.yml` present, YAML-valid, tag-guard + pin verified, `mcp-v*` trigger, `id-token: write`.
- [ ] mcp build 79 KB, no inlined fonts, shebang present.
- [ ] `npm pack --dry-run` tarball clean with bin.
- [ ] No MCP/library runtime changes; `release.yml`/`ci.yml` untouched.

## Manual prerequisites (user — not implementation)
1. `NPM_TOKEN` org secret already reaches this repo — no action.
2. `goldenchart@0.1.0` already on npm — no action.
3. After merge, push tag **`mcp-v0.1.0`** (or cut a GitHub Release at that tag) to trigger the publish. Inert until then.

## Out of scope (YAGNI)
- Docs/playground site (sub-project 3).
- Any library, MCP runtime, `release.yml`, `ci.yml`, or `tsup.config.ts` change.
- npm workspaces conversion; lockstep versioning; changelog automation.
