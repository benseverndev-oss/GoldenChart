# GoldenChart — agent guide

Hand-drawn React charts (D3 math + Rough.js + a Vibe engine). Root package = the
`goldenchart` library; `mcp/` = the `goldenchart-mcp` server (separate package).

## Commands
- `npm run build` / `npm test` / `npm run typecheck` — library (root).
- `npm run check:bundle` — after `build`; fails if fonts leak into the browser entry or it exceeds 75 KB gzipped (CI runs it).
- `npm run playground` — interactive demo; `npm run playground:build` — Pages build.
- mcp: run from `mcp/` — `npm test` / `npm run typecheck` / `npm run build`.
- `cd mcp && npm run compare` — before/after visual render; `npm run assets` — regen README images.

## Fonts / bundle (don't break this)
- Browser entry (`goldenchart`) ships NO font bytes — CSS-only. Font bytes live behind the opt-in `goldenchart/fonts` subpath; the headless `goldenchart/server` auto-embeds `@font-face`.
- Never import `src/assets/fonts` from `src/index.ts` or `Surface.tsx` — `check:bundle` will fail.
- `src/assets/fonts.ts` is ~800 KB (inlined base64) — don't read it whole; append/grep only.

## mcp ↔ library coupling
- `mcp/` resolves `goldenchart` from the built `dist/` via `file:..`. After changing `src/`, rebuild root then refresh the copy: `npm run build` then `rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)` (plain symlink is unreliable on Windows).
- The library `exports` map omits `./package.json` — `require('goldenchart/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`; use `fs.readFileSync` instead.

## Branding & vibe
- `vibe` = how it's drawn (texture/roughness); `brand` (palette/primary/ink/page/font/logo) = identity, layered on top. `resolveVibe(config, brandOverrides?)` precedence: preset < brand < explicit vibe.
- `Surface` paints `brand.page`, renders the logo `<image>`, and threads brand colour/font through `VibeProvider`. Charts read categorical colours via `resolveBrand(brand).palette` in their own body — NOT context — because the chart body renders above `Surface`'s providers (only descendant primitives see brand/vibe context).

## Tests / output
- CI (`.github/workflows/ci.yml`) runs the full gates on every PR — `library` (typecheck/test/build/check:bundle) and `mcp` (build lib → install → typecheck/test/build). Prefer pushing a PR to verify; the whole vitest suite is heavy to run locally.
- Output-affecting changes ship a carried-forward `cd mcp && npm run compare` render.
- MCP render tools are golden-snapshotted; `mcp/vitest.setup.ts` masks font bytes as `<font-bytes>`.
- Local quirk: `cd mcp && npm test` re-dirties `mcp/src/__snapshots__/{charts,diagrams,extraCharts}.test.ts.snap` with line-ending-only changes (autocrlf). `git checkout --` them; don't commit. (A repo-wide `.gitattributes` `*.snap text eol=lf` would fix it.)

## Releases (tag-triggered, npm provenance)
- `v*` tag → publish `goldenchart`; `mcp-v*` tag → publish `goldenchart-mcp`; push to `main` → deploy the playground to GitHub Pages.
- Bump the relevant `package.json` version before tagging (workflows guard tag == version).
