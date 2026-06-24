# `quiet_indigo` vibe — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in `quiet_indigo` vibe preset (PRISM "Quiet Indigo" look) to GoldenChart, ship it via PR, and enable the GoldenChart MCP server locally so the preset is callable.

**Architecture:** Purely additive to the library's vibe registry: one member on the `VibePreset` union (`src/types/vibe.ts`) + one entry in `VIBE_PRESETS` (`src/vibe/presets.ts`), with unit tests. The MCP server's preset enum is derived at runtime from `Object.keys(VIBE_PRESETS)`, so it picks the preset up automatically once the MCP's copy of the built library is refreshed — no MCP source edit. Output snapshots regenerated via `mcp`'s `compare`.

**Tech Stack:** TypeScript, Rough.js (drawing), D3 (math), Vitest, tsup, an MCP server (`mcp/`), Node 22.

**Spec:** `docs/superpowers/specs/2026-06-24-quiet-indigo-vibe-design.md`

---

## CRITICAL constraints (read before any task)

- **Run npm via the PowerShell tool, NOT git-bash.** Per the machine's Windows-node setup, the git-bash `npx`/`npm` shim is unreliable; use PowerShell for all `npm`/`node` commands. File edits use Edit/Write; `git` is fine via either shell.
- **This repo DOES build/test locally** (unlike the sibling PRISM repo). Local `npm test` / `npm run typecheck` / `npm run build` / `npm run compare` are expected and required — the compare snapshot in particular CANNOT be produced by CI, only locally.
- **Repo uses AI attribution.** End commits with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (matches the repo's existing history). A `Claude-Session:` trailer is fine too.
- **Branch:** all work on `feat/quiet-indigo-vibe` (already created off `main`; the spec is already committed there at `5c97570`). Additive only.
- **Library↔MCP coupling (CLAUDE.md):** after changing `src/`, the MCP's copy of `goldenchart` is stale until refreshed. The drift test in `mcp/` (`driftSurface.test.ts`) compares the MCP enum to the *installed* library's `VIBE_PRESETS` keys, so MCP tests will FAIL against a stale copy. Always: build the lib, then `rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)` before running mcp tests.

## Reference shapes (verified against code — do not re-derive)

```ts
// src/types/vibe.ts — VibePreset is a string-literal union (ends with 'amber_crt').
// ResolvedVibe requires EXACTLY these 16 keys (clean_blueprint is the reference entry):
//   preset, roughness, bowing, strokeWidth, stroke, fill, fillStyle, fillWeight,
//   hachureAngle, hachureGap, curveStepCount, curveTightness, disableMultiStroke,
//   seed, fontFamily, fontSize
// background/texture/animate are OPTIONAL (omit them).
// FillStyle union includes 'hachure'. fill is string | null.

// src/vibe/presets.ts
//   export const VIBE_PRESETS: Record<VibePreset, ResolvedVibe> = { ... }
//   const PAPER_TEXTURED: VibePreset[] = [...]; // do NOT add quiet_indigo here
//   for (const p of PAPER_TEXTURED) VIBE_PRESETS[p].texture = 'paper';

// VibeConfig merge is FLAT: resolveVibe({ preset, roughness: 2 }) — there is NO `overrides` key.

// mcp/src/schemas.ts:27 — VIBE_PRESET_NAMES = Object.keys(VIBE_PRESETS) (runtime-derived).
//   => no MCP source change needed; the drift test passes once mcp's goldenchart copy is refreshed.
```

The exact preset to add (colors pinned from PRISM `oklch(0.52 0.18 270)` → `#435BCF`):

```ts
quiet_indigo: {
  preset: 'quiet_indigo',
  roughness: 0.6,
  bowing: 0.4,
  strokeWidth: 1.25,
  stroke: '#435BCF',
  fill: '#435BCF',
  fillStyle: 'hachure',
  fillWeight: 0.5,
  hachureAngle: -30,
  hachureGap: 6,
  curveStepCount: 14,
  curveTightness: 0,
  disableMultiStroke: true,
  seed: 11,
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  fontSize: 13,
},
```

---

## Task 1: Add the `quiet_indigo` preset to the library

**Files:**
- Modify: `src/types/vibe.ts` (add union member)
- Modify: `src/vibe/presets.ts` (add `VIBE_PRESETS` entry)
- Test: `src/vibe/resolveVibe.test.ts` (add assertions)

- [ ] **Step 1: Write the failing test** — append to `src/vibe/resolveVibe.test.ts`, inside the top-level `describe('resolveVibe', …)` block (so it can use the existing imports `resolveVibe`, `VIBE_PRESETS`):

```ts
describe('quiet_indigo preset', () => {
  it('resolves with the PRISM indigo stroke, soft hachure, and IBM Plex Sans', () => {
    const v = resolveVibe('quiet_indigo');
    expect(v.preset).toBe('quiet_indigo');
    expect(v.stroke).toBe('#435BCF');
    expect(v.fill).toBe('#435BCF');
    expect(v.fillStyle).toBe('hachure');
    expect(v.fontFamily).toContain('IBM Plex Sans');
  });

  it('is digital (not paper-textured)', () => {
    expect(VIBE_PRESETS.quiet_indigo.texture).toBeUndefined();
  });

  it('participates in the flat override merge', () => {
    const v = resolveVibe({ preset: 'quiet_indigo', roughness: 2 });
    expect(v.roughness).toBe(2);
    expect(v.stroke).toBe('#435BCF'); // untouched preset knob survives
  });
});
```

- [ ] **Step 2: Verify it fails** — `npm test` (via PowerShell) for the vibe test. Expected: TypeScript/test error — `'quiet_indigo'` is not a valid `VibePreset`, and `VIBE_PRESETS.quiet_indigo` is undefined.

  PowerShell: `npm test -- src/vibe/resolveVibe.test.ts`

- [ ] **Step 3a: Add the union member** — in `src/types/vibe.ts`, add `| 'quiet_indigo'` to the `VibePreset` union (append after `'amber_crt'`).

- [ ] **Step 3b: Add the preset entry** — in `src/vibe/presets.ts`, add the `quiet_indigo` object (verbatim from the Reference block above) as a new key in `VIBE_PRESETS`. Do NOT add `quiet_indigo` to `PAPER_TEXTURED`.

- [ ] **Step 3c: Re-verify the hex** — confirm `oklch(0.52 0.18 270)` converts to `#435BCF` (oklch→oklab→linear-sRGB→sRGB). If your conversion yields a different value, use that and update the test + spec to match; otherwise keep `#435BCF`.

- [ ] **Step 4: Verify it passes**

  PowerShell: `npm test -- src/vibe/resolveVibe.test.ts` → PASS
  PowerShell: `npm run typecheck` → clean (the union + entry must satisfy `Record<VibePreset, ResolvedVibe>`)

- [ ] **Step 5: Commit**

```bash
git add src/types/vibe.ts src/vibe/presets.ts src/vibe/resolveVibe.test.ts
git commit -m "feat(vibe): add quiet_indigo preset (PRISM Quiet Indigo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Rebuild, refresh MCP, run full checks (compare expected to be a no-op)

**Files:**
- (No source edits, and — for this change — expected to produce NO artifact changes; see Step 4.)

- [ ] **Step 1: Build the library**

  PowerShell: `npm run build`
  Expected: clean. Then `npm run check:bundle` → PASS (quiet_indigo adds no font bytes; browser entry unaffected).

- [ ] **Step 2: Refresh the MCP's copy of the library** (CLAUDE.md incantation — symlinks unreliable on Windows)

  PowerShell:
  ```powershell
  Remove-Item -Recurse -Force mcp/node_modules/goldenchart
  cd mcp; npm install --install-links; cd ..
  ```

- [ ] **Step 3: Run MCP checks — the drift test is the key gate**

  PowerShell: `cd mcp; npm run typecheck; npm test; cd ..`
  Expected: `driftSurface.test.ts` PASSES — `VibeConfigSchema` (via `Object.keys(VIBE_PRESETS)`) now includes `quiet_indigo`, so the enum set still equals the library keys. If it fails with `quiet_indigo` missing from the enum, the refresh in Step 2 didn't take — redo it.

- [ ] **Step 4: Run the compare check (expect NO diff)** — verification only.

  PowerShell: `cd mcp; npm run compare; cd ..`
  **Expected: no change.** `mcp/scripts/compare-agent-surface.mjs` renders a FIXED set of scenes (its `presets` scene hardcodes `messy_sketch` + `synthwave`; no scene references `quiet_indigo`). Adding a registry entry doesn't alter any rendered scene, so `git status` should show **no** new/changed files under `comparisons/`, and no `mcp/src/__snapshots__/*.snap` churn either (no existing snapshot test exercises the new preset). This step exists only to confirm we didn't accidentally perturb existing output.

  - If a `.snap` shows a diff, it's almost certainly LF/CRLF line-ending churn — do NOT commit it (CLAUDE.md). Investigate instead.
  - There is intentionally NO visual artifact for `quiet_indigo` in this PR; the compare gallery is a drift baseline, not a per-preset showcase. (A playground/gallery tile would be a separate, optional follow-up — see Open items.)

- [ ] **Step 5: (Usually skipped) commit artifacts only if compare genuinely changed something**

  Run `git status`. If — and only if — there are real, intended artifact changes, commit them:
  ```bash
  git add comparisons mcp
  git commit -m "test(vibe): refresh compare artifacts

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```
  Otherwise skip this commit entirely. Do not fabricate files. The expected outcome for this change is **nothing to commit here.**

---

## Task 3: Push + PR + CI

- [ ] **Step 1: Push**

```bash
git push -u origin feat/quiet-indigo-vibe
```

- [ ] **Step 2: Open the PR** to `benseverndev-oss/GoldenChart`, base `main`:

```bash
gh pr create --base main --title "feat(vibe): quiet_indigo preset (PRISM Quiet Indigo)" --body "<summary>"
```
Body: one new vibe preset mapping PRISM's Quiet Indigo (`#435BCF` indigo, soft sparse hachure, IBM Plex Sans). Additive — union member + registry entry; MCP enum auto-derives it. Links the spec. NO bundle-size impact.

- [ ] **Step 3: Watch CI**

```bash
gh pr checks <num> --watch
```
Expected: the library + mcp CI checks (`build`, `typecheck`, `test`, `check:bundle`, drift) all PASS. If a check fails, read the log, fix, re-push.

- [ ] **Step 4: Merge** (Ben's call, or auto if the repo allows). Once green:

```bash
gh pr merge <num> --squash --delete-branch
```

---

## Task 4: Enable the MCP server locally (controller-run; NOT part of the PR)

This edits the user's global `~/.claude.json` and needs an MCP restart — run it directly, not via an implementer subagent.

- [ ] **Step 1: Build the MCP server binary**

  PowerShell: `cd D:/show_case/GoldenChart/mcp; npm install; npm run build; cd ..`
  Confirm `mcp/dist/index.js` now exists.

- [ ] **Step 2: Add the stdio server to `~/.claude.json`** under `mcpServers` (top level):

```json
"goldenchart": {
  "command": "node",
  "args": ["D:/show_case/GoldenChart/mcp/dist/index.js"]
}
```
No API key. (Edit the JSON carefully — preserve existing `mcpServers` entries; back up first.)

- [ ] **Step 3: Smoke-test** after the MCP reloads: call `list_vibe_presets` (expect `quiet_indigo` present) and `preview_vibe` with `{ vibe: 'quiet_indigo' }` (expect indigo SVG). If the server was built before Task 1's lib changes were refreshed into it, rebuild per Task 2 Step 2 first.

---

## Done criteria

- `quiet_indigo` resolves in the library with `#435BCF` stroke/fill, soft hachure, IBM Plex Sans; unit tests pass; `typecheck` + `check:bundle` clean.
- MCP drift test passes (enum includes `quiet_indigo`); compare check run and confirmed to produce no diff (no per-preset artifact expected).
- PR open + CI green on `benseverndev-oss/GoldenChart`.
- MCP server enabled in `~/.claude.json`; `list_vibe_presets` shows `quiet_indigo` and `preview_vibe` renders it indigo.
- No new fonts, no bundle-size regression, no MCP source edits.

## Open items / follow-ups

- **Visual showcase:** this PR adds no compare/gallery tile for `quiet_indigo`. If the playground or docs gallery iterates `Object.keys(VIBE_PRESETS)`, the preset shows up there for free; if either hand-lists presets, adding a `quiet_indigo` entry is an optional follow-up (verify during Task 3 if CI/docs surface it).
```
