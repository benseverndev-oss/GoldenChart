# `quiet_indigo` vibe — design

**Date:** 2026-06-24
**Status:** Design (approved in brainstorm)
**Repo:** `benseverndev-oss/GoldenChart`

## 1. Goal

Add a new built-in vibe preset, `quiet_indigo`, that maps the PRISM dashboards'
"Quiet Indigo" design language onto GoldenChart's Rough.js drawing parameters.
The result: charts that read as calm, clean, and unmistakably indigo — on-brand
with the PRISM/`mjh-dashboards` UI — while keeping GoldenChart's hand-drawn
identity (low roughness, not zero; a *whisper* of hachure texture, not flat).

Secondary goal (local, not part of the repo PR): enable the GoldenChart MCP
server on this machine so the new vibe is callable via `list_vibe_presets` /
`resolve_vibe` / `preview_vibe`.

## 2. Non-goals

- No new brand (palette/primary/ink/page/font/logo identity layer). A vibe is
  drawing texture + default stroke/fill colors + font only. Full PRISM brand
  theming is out of scope.
- No new font. `quiet_indigo` reuses the already-bundled `IBM Plex Sans` so it
  renders in headless/MCP/PNG output (un-bundled fonts would not embed).
- No changes to `resolveVibe` logic, the `VibeConfig`/`ResolvedVibe` types, or
  the MCP tool surface. Purely additive: one union member + one preset entry.
- Not added to `PAPER_TEXTURED` — Quiet Indigo is a digital/clean look, not a
  matte physical medium.

## 3. The preset

Add to `VIBE_PRESETS` in `src/vibe/presets.ts`:

```ts
quiet_indigo: {
  preset: 'quiet_indigo',
  roughness: 0.6,          // clean, minimal jitter (matches clean_blueprint)
  bowing: 0.4,
  strokeWidth: 1.25,
  stroke: '#435BCF',       // PRISM primary indigo = oklch(0.52 0.18 270)
  fill: '#435BCF',         // same indigo; sparse hachure keeps it light/airy
  fillStyle: 'hachure',    // soft texture, not flat (chosen over 'solid')
  fillWeight: 0.5,
  hachureAngle: -30,
  hachureGap: 6,           // sparse → calm
  curveStepCount: 14,      // smooth lines
  curveTightness: 0,
  disableMultiStroke: true,// single clean outline
  seed: 11,
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  fontSize: 13,
}
```

**Color provenance (PRISM `app/globals.css`):**
- `stroke`/`fill` = `--primary` = `oklch(0.52 0.18 270)` → sRGB `#435BCF`
  (conversion: oklch→oklab→linear-sRGB→sRGB; verify with the same math at
  implementation and keep `#435BCF` unless the conversion differs).
- No `background` key → charts sit on the default page (white), matching the
  dashboards' near-white canvas. (PRISM `--background` = `oklch(1 0 0)`.)
- Reference ink for context: PRISM `--foreground` = `oklch(0.18 0.012 265)` →
  `#0F1217` (not set on the vibe; documented for traceability).

**Why these parameters:** `roughness 0.6` + `disableMultiStroke` give clean
single outlines; `hachure` at `fillWeight 0.5` / `hachureGap 6` is the lightest
texture that still signals "hand-drawn"; `IBM Plex Sans` is the bundled font
closest to PRISM's UI type. The whole set is tuned to "calm," consistent with
the existing `clean_blueprint` (the calmest current preset) but indigo and
sans-serif rather than blueprint-blue and monospace.

## 4. Files changed (library PR)

| File | Change |
| --- | --- |
| `src/types/vibe.ts` | add `'quiet_indigo'` to the `VibePreset` string-literal union |
| `src/vibe/presets.ts` | add the `quiet_indigo` entry to `VIBE_PRESETS` (NOT to `PAPER_TEXTURED`) |
| `src/vibe/resolveVibe.test.ts` | add a test (see §5) |
| `comparisons/` | before/after render PNGs from `cd mcp && npm run compare` (the agent-surface compare writes PNGs here) |
| `mcp/src/__snapshots__/*.snap` | any vitest golden snapshots the mcp tests refresh — LF-pinned via `.gitattributes` (`*.snap text eol=lf`). Distinct mechanism from the `comparisons/` PNGs. |

`VibePreset` lookup is by string key with a dev-warning fallback, so adding the
union member + the registry entry is sufficient for `resolveVibe('quiet_indigo')`
to work and for the MCP `list_vibe_presets` to surface it.

## 5. Testing

Unit (`resolveVibe.test.ts`, mirroring existing preset assertions):
- `resolveVibe('quiet_indigo')` returns a `ResolvedVibe` whose `preset` is
  `'quiet_indigo'`, `stroke` is `'#435BCF'`, `fillStyle` is `'hachure'`, and
  `fontFamily` contains `IBM Plex Sans`.
- The resolved vibe has no `texture: 'paper'` (confirms it's excluded from
  `PAPER_TEXTURED`).
- Overrides still apply on top. `VibeConfig` spreads overrides FLAT onto the
  config (there is no `overrides` key), so the assertion is
  `resolveVibe({ preset: 'quiet_indigo', roughness: 2 }).roughness === 2`
  (confirms the new preset participates in the normal merge precedence).

Output snapshot:
- `cd mcp && npm run compare` to regenerate the before/after render PNGs in
  `comparisons/`; commit them. Separately, if the mcp vitest run refreshes any
  golden `.snap` files under `mcp/src/__snapshots__/`, commit those too (LF-pinned
  via `.gitattributes`).

Repo CI:
- `.github/workflows/ci.yml` runs library + mcp full checks (`build`,
  `typecheck`, `test`, `check:bundle`) on the PR. `check:bundle` must still pass
  — `quiet_indigo` adds no font bytes and no `src/index.ts`→fonts import, so the
  75 KB browser budget is unaffected.

## 6. Enable the MCP server (local, not in the PR)

The library `dist/` is already built; `mcp/dist/` is not, and there is no real
`goldenchart` entry in `~/.claude.json` yet.

1. Build the MCP server: `cd /d/show_case/GoldenChart/mcp && npm install && npm run build`.
2. After the vibe is added, rebuild the lib and refresh the MCP's copy so the
   server includes `quiet_indigo` (symlinks unreliable on Windows — CLAUDE.md):
   `npm run build` (root), then
   `rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)`.
3. Add to `~/.claude.json` `mcpServers` (stdio, no API key):
   ```json
   "goldenchart": {
     "command": "node",
     "args": ["D:/show_case/GoldenChart/mcp/dist/index.js"]
   }
   ```
4. Smoke-test after restart: `list_vibe_presets` includes `quiet_indigo`;
   `preview_vibe` (or a chart tool with `vibe: 'quiet_indigo'`) renders indigo.

**Build order:** add vibe → rebuild lib + refresh mcp copy → build mcp → edit
`.claude.json` → smoke-test, so the enabled server already knows the new vibe.

## 7. Delivery

- Branch + PR to `benseverndev-oss/GoldenChart` for the library change (§4–§5),
  respecting the repo's CI gate and compare-snapshot convention.
- The `.claude.json` enable (§6) is a local machine-config edit, not part of the
  PR.

## 8. Open items / follow-ups

- Exact `#435BCF` re-verified at implementation via the oklch→sRGB conversion.
- If a future "PRISM brand" (palette + logo + page) is wanted, that's a separate
  `brand` contribution layered on top of this vibe — not in scope here.
