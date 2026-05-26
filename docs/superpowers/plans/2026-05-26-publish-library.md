# Publish `goldenchart` to npm (v0.1.0) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `goldenchart` library publishable from npm via a tag-triggered GitHub Actions release with provenance — packaging only, no library code or API changes.

**Architecture:** Add the missing publish artifacts (LICENSE, package metadata, build guard, version bump) and a `release.yml` workflow that publishes on a `v*` tag after building/checking/testing. The actual publish stays inert until the user adds an `NPM_TOKEN` secret and pushes a `v0.1.0` tag.

**Tech Stack:** npm (provenance via `publishConfig`), GitHub Actions, tsup build. Node 20.

**Spec:** `docs/superpowers/specs/2026-05-26-publish-library-design.md`

---

## Notes for the implementer

- This is config/packaging work, so most tasks verify with concrete commands (`npm pack --dry-run`, YAML parse) rather than unit tests — there is no `vitest` test for a LICENSE file.
- Do NOT change library code, the `exports` map, `files`, `name`, `license`, dependencies, or `keywords`. Only add the fields/files this plan specifies.
- `dist/` is git-ignored; never commit it. `npm pack`/preflight requires a fresh `npm run build` first (the `prepublishOnly` hook runs on `npm publish`, NOT on `npm pack`).
- Append the trailer to every commit: a blank line then `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Branch is `feature/publish-library`.

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `LICENSE` | **Create** | MIT license text, so the `license: "MIT"` claim is backed by a file (and npm includes it in the tarball). |
| `package.json` | Modify | Version bump + registry metadata + `publishConfig` (access/provenance) + `prepublishOnly` guard. |
| `.github/workflows/release.yml` | **Create** | Tag-triggered publish: build → bundle guard → typecheck → test → `npm publish` with provenance. |

---

## Task 1: Add the MIT LICENSE file

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create `LICENSE`** at the repo root with this exact content:

```
MIT License

Copyright (c) 2026 Ben Severn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Verify** the file exists and is non-empty: `test -s LICENSE && head -1 LICENSE` → prints `MIT License`.

- [ ] **Step 3: Commit.**
```bash
git add LICENSE
git commit -m "Add MIT LICENSE file"
```

---

## Task 2: package.json publish metadata

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump the version.** Change `"version": "0.0.1",` (line 3) to `"version": "0.1.0",`.

- [ ] **Step 2: Add registry metadata.** Immediately after the `"description": "..."` line (line 4), insert these lines (the `description` line already ends with a comma):

```json
  "author": "Ben Severn",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/benseverndev-oss/GoldenChart.git"
  },
  "homepage": "https://github.com/benseverndev-oss/GoldenChart#readme",
  "bugs": {
    "url": "https://github.com/benseverndev-oss/GoldenChart/issues"
  },
```

- [ ] **Step 3: Add `publishConfig`.** After the `"files": ["dist"]` block's closing `],` (line 30), insert:

```json
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
```

- [ ] **Step 4: Add the `prepublishOnly` guard.** Inside `"scripts"`, add an entry (e.g. right after `"build": "tsup",`):

```json
    "prepublishOnly": "npm run build",
```

- [ ] **Step 5: Verify the JSON is valid and fields are set.**
```bash
node -e "const p=require('./package.json'); if(p.version!=='0.1.0')throw new Error('version'); if(!p.repository||!p.homepage||!p.bugs||!p.author)throw new Error('metadata'); if(p.publishConfig.access!=='public'||p.publishConfig.provenance!==true)throw new Error('publishConfig'); if(p.scripts.prepublishOnly!=='npm run build')throw new Error('prepublishOnly'); if(p.name!=='goldenchart'||p.license!=='MIT'||JSON.stringify(p.files)!=='[\"dist\"]')throw new Error('unexpected change to name/license/files'); console.log('package.json OK:', p.name, p.version);"
```
Expected: `package.json OK: goldenchart 0.1.0`. (This also guards that `name`/`license`/`files` were NOT changed.)

- [ ] **Step 6: Inspect the publish tarball (preflight).**
```bash
npm run build && npm pack --dry-run 2>&1
```
Confirm the listed files are ONLY: `dist/**` (the built `index`/`server`/`fonts` `.js`/`.cjs`/`.d.ts` + maps), `package.json`, `README.md`, and `LICENSE`. There must be NO `src/`, `*.test.*`, `mcp/`, `docs/`, `playground/`, or config files in the tarball. (Delete the generated `*.tgz` if `--dry-run` left one — it should not.)

- [ ] **Step 7: Commit.**
```bash
git add package.json
git commit -m "Add npm publish metadata, publishConfig, and prepublishOnly guard; bump to 0.1.0"
```

---

## Task 3: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`** with this exact content:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

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
      - run: npm ci
      - name: Verify tag matches package.json version
        run: |
          PKG_VERSION="$(node -p "require('./package.json').version")"
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
            echo "Tag $GITHUB_REF_NAME ($TAG_VERSION) != package.json version $PKG_VERSION"
            exit 1
          fi
          echo "Version OK: $PKG_VERSION"
      - run: npm run build
      - run: npm run check:bundle
      - run: npm run typecheck
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Validate the YAML parses.**
```bash
npx --yes js-yaml .github/workflows/release.yml > /dev/null && echo "YAML OK"
```
Expected: `YAML OK` (non-zero exit + parse error if malformed). If `npx js-yaml` is unavailable offline, fall back to `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML OK')"`.

- [ ] **Step 3: Sanity-check the tag-guard logic locally** (simulating the GitHub env var):
```bash
GITHUB_REF_NAME=v0.1.0; PKG_VERSION="$(node -p "require('./package.json').version")"; TAG_VERSION="${GITHUB_REF_NAME#v}"; [ "$PKG_VERSION" = "$TAG_VERSION" ] && echo "guard passes for v0.1.0 (version $PKG_VERSION)"
# And confirm a wrong tag would fail:
GITHUB_REF_NAME=v9.9.9; TAG_VERSION="${GITHUB_REF_NAME#v}"; [ "$PKG_VERSION" != "$TAG_VERSION" ] && echo "guard correctly rejects v9.9.9"
```
Expected: both echoes print.

- [ ] **Step 4: Commit.**
```bash
git add .github/workflows/release.yml
git commit -m "Add tag-triggered npm release workflow with provenance"
```

---

## Task 4: Final verification

- [ ] **Step 1: Full green.** From repo root:
```bash
npm run build && npm run check:bundle && npm test && npm run typecheck
```
All pass; bundle guard reports ~35 KB / no font bytes.

- [ ] **Step 2: Final tarball inspection.** `npm pack --dry-run` once more — confirm clean contents (dist + package.json + README + LICENSE only) and note the reported package size + file count in the report.

- [ ] **Step 3: Confirm no stray changes.** `git status` clean; no `dist/`, `*.tgz`, or `node_modules/` staged; no library `src/` modified (only `LICENSE`, `package.json`, `.github/workflows/release.yml` across the three commits).

No commit in this task (verification only).

---

## Final checklist (before finishing the branch)

- [ ] `LICENSE` (MIT, Ben Severn) present and included in the tarball.
- [ ] `package.json` at `0.1.0` with `author`/`repository`/`homepage`/`bugs`/`publishConfig`/`prepublishOnly`; `name`/`license`/`files`/`exports` unchanged.
- [ ] `release.yml` present, YAML-valid, tag-guard verified, runs build→check:bundle→typecheck→test→publish with `id-token: write` for provenance.
- [ ] `npm pack --dry-run` tarball is clean (no source/tests/mcp/docs).
- [ ] All existing checks green; no library code changed.

## Manual prerequisites (user — not part of implementation)
1. Create an npm **Automation** access token on the account that will own `goldenchart`.
2. Add it as the GitHub repo secret **`NPM_TOKEN`**.
3. After this branch merges, push tag `v0.1.0` (or cut a GitHub Release at `v0.1.0`) to trigger the publish. The workflow is inert until then.

## Out of scope (YAGNI)
- Publishing `goldenchart-mcp` (sub-project 2; needs this live first, then `file:..` → `^0.1.0`).
- Docs/playground site (sub-project 3).
- Recurring `npm publish --dry-run` PR check, changelog automation, or any library/API change.
