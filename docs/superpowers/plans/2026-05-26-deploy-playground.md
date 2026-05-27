# Deploy Playground to GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing GoldenChart playground as a live demo at `https://benseverndev-oss.github.io/GoldenChart/` via GitHub Pages + Actions.

**Architecture:** Add a build-only `base` to the playground's Vite config, a standard Pages-deploy workflow that builds `playground/dist` and publishes it, a README live-demo link, and repoint both packages' `homepage`. The playground aliases the library *source*, so the deployed demo tracks the repo (not the npm release).

**Tech Stack:** Vite, GitHub Pages via Actions. No library/MCP code changes.

**Spec:** `docs/superpowers/specs/2026-05-26-deploy-playground-design.md`

---

## Notes for the implementer

- Config/CI/docs work; verify with concrete commands (build + asset-path grep, YAML parse), not unit tests.
- Do NOT change library `src/`, MCP code, or the other workflows (`release.yml`, `release-mcp.yml`, `ci.yml`).
- `playground/dist` is a build artifact — do NOT commit it (confirm it's gitignored; `dist` is in `.gitignore`).
- Append to each commit message a blank line then `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Branch is `feature/deploy-playground`.

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `playground/vite.config.ts` | Modify | Convert object export → function form; add build-only `base: '/GoldenChart/'`. |
| `.github/workflows/deploy-pages.yml` | **Create** | Build the playground and deploy to GitHub Pages on main push / manual dispatch. |
| `README.md` | Modify | Add a "Live demo" link near the top. |
| `package.json`, `mcp/package.json` | Modify | Repoint `homepage` to the Pages URL (effective on next publish). |

---

## Task 1: Build-only `base` in the Vite config

**Files:**
- Modify: `playground/vite.config.ts`

The current file exports an OBJECT. Convert it to the FUNCTION form so `base` can be conditional (object form would apply the base in dev too, breaking `npm run playground`).

- [ ] **Step 1: Replace the whole `playground/vite.config.ts`** with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));

// The playground imports the library straight from source so edits show up live.
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project page under /GoldenChart/; dev stays at /.
  base: command === 'build' ? '/GoldenChart/' : '/',
  root: dir,
  plugins: [react()],
  resolve: {
    alias: {
      goldenchart: resolve(dir, '../src/index.ts'),
    },
  },
}));
```

- [ ] **Step 2: Build and verify the base is applied.**
```bash
npm run playground:build 2>&1 | tail -5
grep -c "/GoldenChart/" playground/dist/index.html
```
Expected: build succeeds; the grep count is ≥ 1 (asset `src`/`href` URLs are prefixed with `/GoldenChart/`).

- [ ] **Step 3: Confirm `playground/dist` is not tracked.** `git status --short playground/` should show ONLY `playground/vite.config.ts` (modified), not `playground/dist/`. If `dist/` appears, it's gitignored at repo root — confirm with `git check-ignore playground/dist` (should print the path). Do not `git add` dist.

- [ ] **Step 4: Commit.**
```bash
git add playground/vite.config.ts
git commit -m "Set build-only /GoldenChart/ base for the playground (GitHub Pages)"
```

---

## Task 2: Pages deploy workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Create `.github/workflows/deploy-pages.yml`** with this exact content:

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  pages: write
  id-token: write
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run playground:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: playground/dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Note: both jobs declare `runs-on: ubuntu-latest` — every job needs it; there is no implicit default.)
```

- [ ] **Step 2: Validate the YAML parses.**
```bash
npx --yes js-yaml .github/workflows/deploy-pages.yml > /dev/null && echo "YAML OK"
```
(Fallback if offline: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-pages.yml')); print('YAML OK')"`.)

- [ ] **Step 3: Commit.**
```bash
git add .github/workflows/deploy-pages.yml
git commit -m "Add GitHub Pages deploy workflow for the playground"
```

---

## Task 3: README live-demo link + homepage repoint

**Files:**
- Modify: `README.md`, `package.json`, `mcp/package.json`

- [ ] **Step 1: Add a live-demo link to `README.md`.** Read the top of the file first. After the hero image / tagline near the top (before "## Install"), add a line:
```markdown
**[Live demo →](https://benseverndev-oss.github.io/GoldenChart/)** · [npm](https://www.npmjs.com/package/goldenchart)
```
Place it where it reads naturally (e.g. right after the `**D3 does the math...**` tagline line). Keep it to one line; do not restructure the README.

- [ ] **Step 2: Repoint the root `package.json` `homepage`.** Change the current value (`"https://github.com/benseverndev-oss/GoldenChart#readme"`) to:
```json
  "homepage": "https://benseverndev-oss.github.io/GoldenChart/",
```

- [ ] **Step 3: Repoint `mcp/package.json` `homepage`.** Change the current value (`"https://github.com/benseverndev-oss/GoldenChart/tree/main/mcp#readme"`) to:
```json
  "homepage": "https://benseverndev-oss.github.io/GoldenChart/",
```

- [ ] **Step 4: Verify JSON validity** (both files still parse and `homepage` is the new URL):
```bash
node -e "const r=require('./package.json'),m=require('./mcp/package.json'); if(r.homepage!=='https://benseverndev-oss.github.io/GoldenChart/')throw new Error('root homepage'); if(m.homepage!=='https://benseverndev-oss.github.io/GoldenChart/')throw new Error('mcp homepage'); console.log('homepages OK');"
```
Expected: `homepages OK`.

- [ ] **Step 5: Commit.**
```bash
git add README.md package.json mcp/package.json
git commit -m "Link the live demo and point package homepages at the Pages site"
```

> Note: the `homepage` change only reaches npm on the next publish (`v0.1.1` / `mcp-v0.1.1`). This does not require or trigger a republish now.

---

## Task 4: Final verification

- [ ] **Step 1: Library build/test unaffected.** From repo root:
```bash
npm run build && npm run check:bundle && npm test && npm run typecheck
```
All green (this change touches only the playground config, a new workflow, README, and `homepage` fields — none affect the library build or tests).

- [ ] **Step 2: Playground build produces a deployable dist.**
```bash
npm run playground:build && grep -c "/GoldenChart/" playground/dist/index.html
```
Expected: build succeeds, grep ≥ 1.

- [ ] **Step 3: Clean tree.** `git status` clean except intended; NO `playground/dist/`, `dist/`, `*.tgz`, or `node_modules/` staged; no library `src/`, MCP, `release.yml`, `release-mcp.yml`, or `ci.yml` changes. (If the lib `npm test` re-dirtied the 3 pre-existing `mcp/src/__snapshots__/{charts,diagrams,extraCharts}.test.ts.snap` via the known CRLF quirk, those are line-endings-only — `git checkout -- mcp/src/__snapshots__/` to clear them.)

No commit in this task (verification only).

---

## Final checklist (before finishing the branch)

- [ ] `playground/vite.config.ts` is the function form with build-only `base: '/GoldenChart/'`; dev base is `/`.
- [ ] `deploy-pages.yml` present, YAML-valid, builds `playground/dist` and deploys via `deploy-pages@v4` with `pages:write`+`id-token:write`.
- [ ] README links the live demo; both `homepage` fields are the Pages URL.
- [ ] `npm run playground:build` dist has `/GoldenChart/`-prefixed assets.
- [ ] No library/MCP/other-workflow changes; full suite green.

## Manual prerequisite (user — not implementation)
Enable Pages: repo **Settings → Pages → Build and deployment → Source = "GitHub Actions"**. The deploy job fails until this is set. After it's set, the next push to `main` (or a `workflow_dispatch` run) publishes the site. (Merging this branch's PR to main will itself trigger the workflow once Pages is enabled.)

## Out of scope (YAGNI)
- New landing page / docs framework / content beyond the existing playground.
- Custom domain.
- Library, MCP, or other-workflow changes; republishing to update `homepage` now.
