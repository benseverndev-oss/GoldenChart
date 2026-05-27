# Interactivity Phase 4 (Ecosystem) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend interactivity to the agent + demo + docs surfaces: an MCP tool that emits a self-contained interactive HTML embed (the differentiator), interaction docs, and playground controls.

**Architecture:** A pure `interactiveEmbed(svg, opts)` in `goldenchart/interactive` wraps a static (already `data-gc-*` tagged) SVG into a self-contained HTML document with a tiny **vanilla** hover-tooltip hydrator — no React/runtime bundling. The MCP server exposes it as a new `export_interactive_html` tool (additive; existing snapshotted tools unchanged). Docs + playground consume the existing API.

**Tech Stack:** TypeScript, vitest (per-file), MCP (`@modelcontextprotocol/sdk` + zod), Vite playground.

**Spec:** [interactivity-phase-4-ecosystem](../specs/2026-05-27-interactivity-phase-4-ecosystem.md) · **Parent roadmap:** [interactivity-roadmap](../specs/2026-05-27-interactivity-roadmap.md)

**Conventions:** TDD per @superpowers:test-driven-development; verify per @superpowers:verification-before-completion. Branch: `feat/interactivity-phase-4` (off `main`). After library `src/` changes, refresh the mcp copy before mcp work (CLAUDE.md: rebuild root, `rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)`).

---

## File Structure

**Create:**
- `src/interactive/embed.ts` — pure `interactiveEmbed(svg, opts)` HTML generator + vanilla hydrator string.
- `src/interactive/embed.test.ts` — generator unit tests.
- `docs/INTERACTIVITY.md` — the interaction guide.

**Modify:**
- `src/interactive.ts` — export `interactiveEmbed`.
- `mcp/src/exportTools.ts` — add `export_interactive_html` tool.
- `README.md` — short "Interactivity (opt-in)" section.
- `docs/API.md` — interaction props per component (if present).
- `playground/src/App.tsx` — interaction controls + event log (optional, build-verified).

---

## Task 1: `interactiveEmbed` HTML generator (pure, library)

**Files:** Create `src/interactive/embed.ts`, `src/interactive/embed.test.ts`

- [ ] **Step 1: Write the failing test** — assert the output: is a full HTML doc (`<!doctype html>`), contains the passed `<svg>` verbatim, includes a `<script>` that references `data-gc-mark`/`data-gc-label`/`data-gc-value`, and a tooltip container. With `{ tooltip: false }` the script is omitted.
- [ ] **Step 2: Run fail.**
- [ ] **Step 3: Implement** `interactiveEmbed(svg: string, opts?: { tooltip?: boolean; title?: string }): string` — returns `<!doctype html>…` embedding the SVG, a `#gc-tip` div + minimal CSS, and (when `tooltip !== false`) an IIFE that on `pointermove` finds `closest('[data-gc-mark]')`, reads the `data-gc-*` attrs, and positions the tooltip; hides on `pointerleave`. No external deps.
- [ ] **Step 4: Run pass.**
- [ ] **Step 5: Export** from `src/interactive.ts`; **Step 6: Commit** — `feat(interactive): interactiveEmbed self-contained HTML generator`.

## Task 2: MCP `export_interactive_html` tool

**Files:** Modify `mcp/src/exportTools.ts` (refresh mcp copy first)

- [ ] **Step 1:** `npm run build` (root) then refresh the mcp copy (`rm -rf mcp/node_modules/goldenchart && (cd mcp && npm install --install-links)`).
- [ ] **Step 2: Add the tool** — `export_interactive_html`: `inputSchema { svg: z.string(), path: z.string().optional() }`; imports `interactiveEmbed` from `goldenchart/interactive`; returns the HTML as text, or writes to a `.html` path (mirror `export_svg`). Additive — existing tools/snapshots unchanged.
- [ ] **Step 3:** `cd mcp && npx vitest run src/exportTools.test.ts` (add a case asserting the tool returns HTML containing the svg). Update the server tool-list snapshot intentionally (a new tool is expected): `cd mcp && npx vitest run -u`; review the diff is just the added tool.
- [ ] **Step 4: Commit** — `feat(mcp): export_interactive_html interactive embed tool`.

## Task 3: Docs

**Files:** Create `docs/INTERACTIVITY.md`; Modify `README.md`, `docs/API.md`

- [ ] **Step 1:** Write `docs/INTERACTIVITY.md` — the progressive-enhancement model, the `data-gc-*` contract, `<InteractiveChart>` usage, and recipes (tooltip formatter, legend toggle, zoom/brush, `LinkedCharts`, MCP embed).
- [ ] **Step 2:** Add a short "Interactivity (opt-in)" section to `README.md` pointing at `goldenchart/interactive`, stressing the static core is untouched.
- [ ] **Step 3:** Add the interaction props to `docs/API.md` (per `InteractiveChartProps`).
- [ ] **Step 4: Commit** — `docs: interactivity guide + README/API interaction reference`.

## Task 4: Playground interaction controls (build-verified)

**Files:** Modify `playground/src/App.tsx`

- [ ] **Step 1:** Wrap the active chart in `<InteractiveChart>` (from `goldenchart/interactive`) behind toggles: tooltip / highlight / selectable / legendToggle / crosshair / zoom / pan / brush / transition. Add a small live event log for `onHover`/`onSelect`/`onBrush`.
- [ ] **Step 2:** `npm run playground:build` to verify it compiles. (Playground has no unit tests.)
- [ ] **Step 3: Commit** — `feat(playground): interaction controls + event log`.

## Task 5: Verify + PR

- [ ] **Step 1:** Library: `npx vitest run src/interactive/embed.test.ts`; `npm run build && npm run check:bundle` (interactive entry stays under budget — the embed is a string template).
- [ ] **Step 2:** Push + open PR (write account). CI runs `library` + `mcp` (the mcp gate verifies the new tool + snapshot).

## Acceptance

- [ ] `interactiveEmbed` returns a self-contained HTML doc that hover-reveals label/value offline; unit-tested.
- [ ] `export_interactive_html` MCP tool returns/writes that HTML; existing MCP snapshots unchanged except the additive tool entry.
- [ ] `docs/INTERACTIVITY.md` + README/API cover the interaction API.
- [ ] Playground exposes interaction controls (build passes); both bundle guards green; CI green.

## Risks / notes

- **mcp coupling** — the rebuild + `--install-links` refresh is required before the mcp tool sees `interactiveEmbed`; fragile on Windows/this volume. If it can't be done locally, write the tool and let CI's `mcp` gate verify.
- **Embed weight** — the vanilla hydrator keeps embeds light (no React); revisit if richer interactions are needed in embeds.
- **Snapshot churn** — only the MCP tool-list snapshot changes (additive tool); the render snapshots stay stable.
