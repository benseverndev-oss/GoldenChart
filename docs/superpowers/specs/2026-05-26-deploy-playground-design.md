# Design: Deploy the playground to GitHub Pages

**Date:** 2026-05-26
**Status:** Approved (pending spec review)
**Topic:** Publish the existing GoldenChart playground as a live public demo at `https://benseverndev-oss.github.io/GoldenChart/` via GitHub Pages + Actions. Sub-project 3 (final) of the "ship it" effort.

## Context

`goldenchart@0.1.0` and `goldenchart-mcp@0.1.0` are live on npm (sub-projects 1 & 2). The `playground/` is a complete interactive demo (`playground/src/App.tsx` imports every chart/diagram type and all vibe presets with live controls). Deploying it makes the project discoverable and gives the package `homepage` a real target.

Verified facts:
- `playground/vite.config.ts`: `root: <playground dir>`, `plugins: [react()]`, aliases `goldenchart` → `../src/index.ts` (library **source**, so the build doesn't depend on the published npm package). **No `base` is set.**
- `playground:build` script = `vite build --config playground/vite.config.ts` → outputs to `playground/dist` (vite default relative to `root`).
- `playground/index.html` `<title>` is `GoldenChart Playground`.
- Repo `benseverndev-oss/GoldenChart` is public. The site is a project page, so it serves under the `/GoldenChart/` path.

## Design

### 1. Conditional `base` in `playground/vite.config.ts`
A project page serves under `/GoldenChart/`, so the production build needs that base, but `npm run playground` (dev) should stay at `/`. Switch the config to the function form and set `base` only for `build`:
```ts
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/GoldenChart/' : '/',
  root: dir,
  plugins: [react()],
  resolve: { alias: { goldenchart: resolve(dir, '../src/index.ts') } },
}));
```
Nothing else in the config changes. Dev server stays at `/`; built asset URLs are prefixed `/GoldenChart/`.

### 2. Deploy workflow `.github/workflows/deploy-pages.yml`
Standard GitHub Pages-via-Actions pattern:
- **Trigger:** `on: push: branches: [main]` plus `workflow_dispatch` (manual re-run button).
- **Permissions (workflow level):** `pages: write`, `id-token: write`, `contents: read`.
- **Concurrency:** group `pages`, `cancel-in-progress: false` (the standard Pages setting so in-flight deploys aren't cancelled mid-publish).
- **`build` job (ubuntu-latest, node 20):** checkout → `actions/configure-pages@v5` → `npm ci` → `npm run playground:build` → `actions/upload-pages-artifact@v3` with `path: playground/dist`.
- **`deploy` job:** `needs: build`, `environment: github-pages`, step `actions/deploy-pages@v4`.

Because the playground aliases the library source, the deployed demo always reflects the repo (no dependency on the npm release).

### 3. README "Live demo" link
Add a short live-demo link near the top of `README.md` (the README is currently the package `homepage`), pointing to `https://benseverndev-oss.github.io/GoldenChart/`.

### 4. Homepage repoint (repo-only until next publish)
Update the `homepage` field in both `package.json` (root → `https://benseverndev-oss.github.io/GoldenChart/`) and `mcp/package.json` (→ same site, or keep the mcp subdir readme — see below). This is a metadata edit that only affects npm on the **next** publish (`v0.1.1` / `mcp-v0.1.1`); it does NOT trigger or require a republish now. For mcp, point `homepage` at the demo site too (the server renders what the demo shows). Keep `repository.directory: "mcp"` as-is.

### 5. Verification (during implementation)
- `npm run playground:build` succeeds; `playground/dist/index.html` references assets under `/GoldenChart/` (e.g. `grep -c "/GoldenChart/" playground/dist/index.html` ≥ 1).
- `npm run playground` (dev) still serves at `/` (base not applied in dev) — spot-check the config logic, no need to leave a server running.
- `deploy-pages.yml` YAML parses.
- Existing build/test/typecheck unaffected (this touches only the playground config, a new workflow, README, and `homepage` fields).

## Manual prerequisite (user action — cannot be automated here)
Enable Pages: repo **Settings → Pages → Build and deployment → Source = "GitHub Actions"**. Until this is set, the deploy job fails (no Pages site configured). After it's set, the first push to `main` (or a `workflow_dispatch` run) publishes the site.

## Out of scope (YAGNI)
- No new landing page, docs framework, or content beyond the existing playground.
- No custom domain.
- No library, MCP, or other-workflow changes; `release.yml`/`release-mcp.yml`/`ci.yml` untouched.
- No republish to update `homepage` on npm now (it rides the next version bump).

## Risks
- **Wrong `base` → blank page / 404 assets:** the most common Pages failure. Mitigated by the `command === 'build'` conditional and the dist-asset-path verification.
- **Pages not enabled:** the deploy job fails until the user flips the repo setting; documented, not a code defect.
- **Deploy on every main push:** intentional (keeps the demo current); `workflow_dispatch` allows manual re-runs. Low risk for a static build.

## Success criteria
- `playground/vite.config.ts` sets `base: '/GoldenChart/'` for build only; dev stays `/`.
- `deploy-pages.yml` committed, YAML-valid, would build the playground and deploy to Pages on a main push.
- README links the live demo; both `homepage` fields point at the site.
- `npm run playground:build` produces a dist with `/GoldenChart/`-prefixed assets; no other build/test breakage.
