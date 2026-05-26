# MCP Golden-Snapshot Coverage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add golden snapshots for every SVG-emitting MCP tool not already covered, so refactors can't silently change agent-visible SVG output.

**Architecture:** Append `expect(result.content[0].text).toMatchSnapshot()` to each tool's existing structural test (reusing the validated sample input already there), add the two missing primitive tests, and generate the `.snap` files. Follows the `mcp/src/charts.test.ts` convention; the `mcp/vitest.setup.ts` serializer already masks embedded font bytes as `<font-bytes>`.

**Tech Stack:** vitest snapshots, TypeScript. The `mcp/` workspace consumes the built `goldenchart` package from `dist/`.

**Spec:** `docs/superpowers/specs/2026-05-26-mcp-snapshot-coverage-design.md`

---

## Setup (do once, before Task 1)

The `mcp/` workspace resolves `goldenchart` from a COPY of the built `dist/` in `mcp/node_modules/goldenchart` (installed via `--install-links`; symlinks are unreliable on this Windows setup). Snapshots must capture the CURRENT library output, so refresh the copy first:

```
npm run build                                   # repo root → fresh dist/
rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)
```

Confirm `mcp/node_modules/goldenchart/dist/fonts.js` exists. No `src/` changes happen in this plan — only `mcp/` test files — so this refresh is needed only once at the start.

**General notes for every task:**
- Run mcp tests from the `mcp/` directory: `cd mcp && npx vitest run src/<file>.test.ts`.
- Adding `toMatchSnapshot()` and running once WRITES the snapshot (it passes on first write — there is no red phase for a brand-new snapshot). So the rhythm per tool is: add the assertion → run (snapshot written) → **inspect the generated `.snap` to confirm it contains real SVG** (`<svg`, `<path>`/text, expected labels, the `<font-bytes>` placeholder) and not an error string or empty output → re-run to confirm it is stable.
- Snapshots are keyed by the full test name (`describe > it`). Appending `toMatchSnapshot()` to an existing `it` is fine and keeps the input DRY.
- Commit the `.snap` file together with the test file.
- Append the trailer to every commit message: a blank line then `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

---

## Task 1: Primitive tool snapshots

`render_rough_path`, `render_rough_rect`, `render_rough_text` have structural tests already; `render_rough_circle` and `render_rough_line` have NO output test (only the "registers all five" check). Add snapshots to the three, and add full tests for the two missing ones.

**Files:**
- Modify: `mcp/src/primitiveTools.test.ts`
- Generates: `mcp/src/__snapshots__/primitiveTools.test.ts.snap` (new)

- [ ] **Step 1: Append a snapshot assertion to the three existing primitive tests.**

  In `render_rough_path renders a standalone SVG with a path`, after the existing asserts add: `expect(svg).toMatchSnapshot();`
  In `render_rough_rect honors a vibe override`, change to capture the text and snapshot:
  ```ts
  const svg = res.content[0].text;
  expect(svg).toContain('<path');
  expect(svg).toMatchSnapshot();
  ```
  In `render_rough_text includes the label text`, add:
  ```ts
  const svg = res.content[0].text;
  expect(svg).toContain('hi there');
  expect(svg).toMatchSnapshot();
  ```

- [ ] **Step 2: Add tests for the two uncovered primitives** (minimal inputs from their schemas; `viewport` const already exists in the file):

```ts
  it('render_rough_circle renders a standalone SVG with a path', async () => {
    const res = await byName('render_rough_circle').handler({ viewport, cx: 60, cy: 60, diameter: 80 });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });

  it('render_rough_line renders a standalone SVG with a path', async () => {
    const res = await byName('render_rough_line').handler({ viewport, x1: 10, y1: 10, x2: 100, y2: 100 });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });
```

  If `render_rough_circle` / `render_rough_line` reject these inputs (schema mismatch), read their `inputSchema` in `mcp/src/primitiveTools.ts` and adjust the sample to the real field names. Do not guess repeatedly — read the schema.

- [ ] **Step 3: Generate + verify.** `cd mcp && npx vitest run src/primitiveTools.test.ts -u`. Expect all pass and a new `.snap` written. Inspect `mcp/src/__snapshots__/primitiveTools.test.ts.snap`: confirm each entry is a real `<svg ...>...<path .../>...</svg>` (5 entries), `render_rough_text` contains `hi there`, and no entry is empty or an error.

- [ ] **Step 4: Confirm stable.** `cd mcp && npx vitest run src/primitiveTools.test.ts` (no `-u`) → all pass.

- [ ] **Step 5: Commit.**
```bash
git add mcp/src/primitiveTools.test.ts mcp/src/__snapshots__/primitiveTools.test.ts.snap
git commit -m "Add golden snapshots for primitive render tools"
```

---

## Task 2: Vibe + orchestration snapshots

Cover `preview_vibe`, `compose_surface`, and `build_flowchart_from_spec` by appending snapshots to their existing tests.

**Files:**
- Modify: `mcp/src/vibeTools.test.ts`, `mcp/src/orchestrationTools.test.ts`
- Generates: `mcp/src/__snapshots__/vibeTools.test.ts.snap`, `mcp/src/__snapshots__/orchestrationTools.test.ts.snap` (new)

- [ ] **Step 1: `vibeTools.test.ts`** — in `preview_vibe renders a standalone SVG sample`, after the existing asserts add `expect(svg).toMatchSnapshot();`.

- [ ] **Step 2: `orchestrationTools.test.ts`** — in `compose_surface` → `renders a mixed scene ...`, after the existing asserts add `expect(svg).toMatchSnapshot();`. In `build_flowchart_from_spec` → `auto-assigns node shapes and renders a flowchart`, after the existing asserts add `expect(svg).toMatchSnapshot();`. (One representative snapshot per tool; the DAG/orthogonal variants keep their structural-only tests.)

- [ ] **Step 3: Generate + verify.** `cd mcp && npx vitest run src/vibeTools.test.ts src/orchestrationTools.test.ts -u`. Inspect both new `.snap` files: `preview_vibe` entry contains `<svg` + `GoldenChart`; `compose_surface` entry contains `Dashboard` and multiple nested `<svg`; `build_flowchart_from_spec` entry contains `Ready?` and `<path`.

- [ ] **Step 4: Confirm stable.** Re-run both without `-u` → pass.

- [ ] **Step 5: Commit.**
```bash
git add mcp/src/vibeTools.test.ts mcp/src/orchestrationTools.test.ts mcp/src/__snapshots__/vibeTools.test.ts.snap mcp/src/__snapshots__/orchestrationTools.test.ts.snap
git commit -m "Add golden snapshots for preview_vibe, compose_surface, build_flowchart_from_spec"
```

---

## Task 3: DSL + visualize snapshots

Cover `render_diagram` (all 7 kinds it loops), `build_diagram_from_mermaid` (flowchart + sequence), and `visualize_data`.

**Files:**
- Modify: `mcp/src/dslTools.test.ts`, `mcp/src/chartFeatures.test.ts`
- Generates: `mcp/src/__snapshots__/dslTools.test.ts.snap`, `mcp/src/__snapshots__/chartFeatures.test.ts.snap` (new)

- [ ] **Step 1: `dslTools.test.ts` — `render_diagram`.** In the per-kind loop's `renders standalone SVG tagged with the kind` test, after the existing asserts add `expect(result.content[0].text).toMatchSnapshot();`. This yields 7 snapshot entries (flowchart, sequence, mindmap, arch, er, timeline, org).

- [ ] **Step 2: `dslTools.test.ts` — `build_diagram_from_mermaid`.** In `renders a Mermaid flowchart snippet` and `renders a Mermaid sequenceDiagram snippet`, after the existing asserts add `expect(result.content[0].text).toMatchSnapshot();`. (Leave the "structured error" test alone — it asserts an error, not SVG.)

- [ ] **Step 3: `chartFeatures.test.ts` — `visualize_data`.** In `auto-picks a chart and returns SVG + rationale + alternatives`, after the existing asserts add `expect(svg).toMatchSnapshot();`. (The "honors intent" test only checks the chosen type — leave it.)

- [ ] **Step 4: Generate + verify.** `cd mcp && npx vitest run src/dslTools.test.ts src/chartFeatures.test.ts -u`. Inspect both `.snap` files: `render_diagram` has 7 entries each a real `<svg>`; the two mermaid entries contain `Start` / `request` respectively; `visualize_data` entry is a real `<svg>` (a bar chart). Note `chartFeatures.test.ts.snap` may gain only the one `visualize_data` entry (other tests in that file don't snapshot).

- [ ] **Step 5: Confirm stable.** Re-run both without `-u` → pass.

- [ ] **Step 6: Commit.**
```bash
git add mcp/src/dslTools.test.ts mcp/src/chartFeatures.test.ts mcp/src/__snapshots__/dslTools.test.ts.snap mcp/src/__snapshots__/chartFeatures.test.ts.snap
git commit -m "Add golden snapshots for render_diagram, mermaid, and visualize_data"
```

---

## Task 4: Harden export_png structural test

Not a snapshot. The current `export_png` test only asserts `bytes > 0`; add a PNG magic-byte check so a corrupt-rasterizer regression is caught.

**Files:**
- Modify: `mcp/src/exportTools.test.ts`

- [ ] **Step 1: Read** the existing `export_png` → `rasterizes an SVG to a non-empty PNG (base64)` test in `mcp/src/exportTools.test.ts` to see how it obtains `base64`/`bytes`.

- [ ] **Step 2: Add a magic-byte assertion.** Decode the base64 and assert the 8-byte PNG signature. Insert after the existing `bytes > 0` assertion:
```ts
    const header = Buffer.from(base64, 'base64').subarray(0, 8);
    expect(header).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
```
  If the test skips when resvg is unavailable (the existing test references `'resvg'` in a guard), keep that guard intact — only add the assertion to the success path where `base64` is defined.

- [ ] **Step 3: Run + verify.** `cd mcp && npx vitest run src/exportTools.test.ts` → pass.

- [ ] **Step 4: Commit.**
```bash
git add mcp/src/exportTools.test.ts
git commit -m "Assert PNG magic-byte header in export_png test"
```

---

## Task 5: Full-suite verification + deliberate-drift proof

- [ ] **Step 1: Full mcp suite green.** `cd mcp && npm test` → all pass (the new snapshots included). Record the test count.

- [ ] **Step 2: Prove a snapshot catches drift.** Temporarily edit one covered primitive's sample input in `mcp/src/primitiveTools.test.ts` (e.g. change `render_rough_circle`'s `diameter: 80` → `diameter: 40`), run `cd mcp && npx vitest run src/primitiveTools.test.ts` (NO `-u`), and CONFIRM the snapshot test now FAILS with a diff. Then REVERT the edit and re-run to confirm green. Report what the failing run showed. (This proves the snapshots actually lock output.)

- [ ] **Step 3: No stray changes.** `git status` clean except intended; confirm no `dist/` or `node_modules/` staged, and `src/` (library) is untouched.

This task makes no commit (verification only) unless the revert left changes — ensure the tree matches the last task's committed state.

---

## Final checklist (before finishing the branch)

- [ ] Every tool in the spec's coverage table has a committed `.snap` entry: 5 primitives, `preview_vibe`, `compose_surface`, `build_flowchart_from_spec`, 7 `render_diagram` kinds, 2 mermaid, `visualize_data`.
- [ ] `cd mcp && npm test` green.
- [ ] `export_png` test asserts the PNG header.
- [ ] Deliberate-drift check confirmed snapshots fail on change, then reverted.
- [ ] No library `src/` changes; only `mcp/` test files + `.snap` files.

## Notes / pitfalls

- If a brand-new snapshot file isn't created, you likely forgot `-u` on the first run or ran from the repo root instead of `mcp/`.
- Do not snapshot `suggest_improvements` — its `content[0].text` is JSON, not SVG (see spec).
- Do not golden-snapshot `export_png` bytes (flaky across resvg versions / platforms) — the magic-byte check is the intended coverage.
- If any snapshot is unstable across runs, pin an explicit `seed` in that one sample input and note it; do not change global seeding.
