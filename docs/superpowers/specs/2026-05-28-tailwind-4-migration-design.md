# Tailwind 4 migration — design

**Status:** Approved (design) · **Date:** 2026-05-28 · **Owner:** Ben Severn
· **Tracks:** the (closed) dependabot PR #110 (`tailwindcss@^3 → ^4`).

---

## 1. Context

Dependabot opened `tailwindcss 3.4.19 → 4.3.0`. CI was green, but that's a
**false signal**: CI doesn't build the playground, and the playground is the
only thing that uses Tailwind. The library itself ships zero Tailwind classes
to consumers — `dist/` contains no CSS, and `tailwind.config.ts` at the
repo root is *not* in the published `files` (`["dist"]`), so consumers can't
import it.

Tailwind 4 is a major architectural rewrite: CSS-first config, a new PostCSS
package, a new core entry, and a renamed/dropped subset of utility classes.
A working v3 setup will **break silently** under v4 until the migration is
done.

## 2. Surface to migrate

Six files, all in dev tooling. None are shipped to npm.

| File | Today (v3) | After (v4) |
| --- | --- | --- |
| `tailwind.config.ts` (root) | TS config exported for theoretical consumers | Becomes obsolete in v4's CSS-first model. Delete or keep as a stub with a deprecation comment. |
| `playground/tailwind.config.js` | JS config consumed by PostCSS plugin | Replaced by `@theme {}` inside CSS, or kept minimal alongside `@config` directive. |
| `playground/postcss.config.js` | imports `tailwindcss` + `autoprefixer` | Switch to `@tailwindcss/postcss`; `autoprefixer` is now bundled. |
| `playground/src/index.css` | `@tailwind base/components/utilities` | `@import "tailwindcss";` (single line). |
| `package.json` (root, devDeps) | `tailwindcss ^3.4`, `autoprefixer ^10.4`, `postcss ^8.4` | `tailwindcss ^4`, `@tailwindcss/postcss ^4`. Drop the standalone `autoprefixer` dep (now bundled). |
| `playground/index.html` | (no change expected) | Verify — Tailwind 4 sometimes wants explicit `<style>` ordering hints. |

## 3. Class-name compatibility

Tailwind 4 dropped or renamed a handful of v3 utilities. The grep pass we
need to run before merging:

- `bg-opacity-*`, `text-opacity-*`, `border-opacity-*`, `divide-opacity-*`,
  `placeholder-opacity-*`, `ring-opacity-*` → use the modern `bg-black/50`
  slash-opacity syntax (already supported in v3).
- `decoration-slice` / `decoration-clone` → `box-decoration-slice` /
  `box-decoration-clone`.
- `flex-grow-*` / `flex-shrink-*` → `grow-*` / `shrink-*`.
- `shadow-sm` / `shadow` / `shadow-md` defaults shifted; verify visual.
- Default ring is now `1px` not `3px`; if any element relies on default
  `ring`, set `ring-3` explicitly.

The playground uses Tailwind in `App.tsx`, `Gallery.tsx`, and
`InteractivityShowcase.tsx`. The codemod surface is bounded.

## 4. Plan

### Phase 1 — replace config plumbing (no behaviour change yet)

1. `cd playground` (or root) — `npm install tailwindcss@^4 @tailwindcss/postcss@^4 --save-dev`; remove `autoprefixer` from `package.json`.
2. Rewrite `playground/postcss.config.js`:
   ```js
   import tailwindcss from '@tailwindcss/postcss';
   export default { plugins: [tailwindcss] };
   ```
3. Rewrite `playground/src/index.css`:
   ```css
   @import "tailwindcss";
   ```
   (Replaces the three `@tailwind` directives.)
4. Replace `playground/tailwind.config.js`: either delete it (Tailwind 4
   auto-detects content via the framework integration) or keep a minimal one
   that uses the new `content` shape — confirm during the run.
5. Decide on `tailwind.config.ts` (root): since it's not shipped and the v3
   "extend our config from yours" story is dead, **delete it**. Note this
   in the changelog as a non-breaking dev-tooling change.

### Phase 2 — codemod deprecated utility class names

6. Run the upstream codemod when available (`npx @tailwindcss/upgrade@latest`)
   or hand-fix using the grep list in §3. Scope: `playground/src/*.tsx`.
7. Visual diff: run the playground locally, sweep both views (Playground
   tab + `#gallery`), and compare against the live deploy. Spot-check the
   chart panel borders, brand-kit colors, and the responsive grids in
   `Gallery.tsx`.

### Phase 3 — verify and ship

8. `npm run playground:build` clean.
9. Push, watch CI (lib/mcp gates unaffected — both should stay green), merge.
10. Pages auto-deploys; reload `#gallery` and confirm parity.

## 5. Risks

- **Silent visual regressions.** CI doesn't render the playground, so the
  only safeguard is visually diffing before/after. The `gallery` view is
  the easiest reference (every chart in every vibe, every brand kit, every
  texture tier on one page).
- **Dev-server vs build mismatch.** Tailwind 4's plugin runs subtly
  differently in `vite dev` vs `vite build`; run both before merging.
- **Auto-detected content.** Tailwind 4 scans content automatically based on
  Vite's entrypoints. The playground imports from the library's `../src` via
  the Vite alias — verify those classes are scanned (they aren't class-based
  in the lib, but worth confirming).
- **The deleted root `tailwind.config.ts`.** No published consumer can import
  it (it's not in `files`), but the file's *existence* in the repo could be
  reassuring boilerplate. Note removal in CHANGELOG.

## 6. Verification

- `npm run playground:build` passes locally.
- `npm run playground` runs and visually matches the v3 build at
  `/#gallery` and `/`.
- CI lib + mcp jobs stay green (unaffected — they don't touch tailwind).
- Pages deploy renders correctly post-merge.
- Bundle size of the playground CSS is comparable (Tailwind 4 typically
  ships ~30–40% smaller CSS thanks to the new engine; track the delta).

## 7. Rollback

Revert the PR. The playground's CSS is the only consumer-facing surface
involved, and a revert puts the v3 setup back as-is. No library consumers
are affected by either direction.

## 8. Open questions

- Should we keep `tailwind.config.ts` at the root as a deprecated shim with a
  pointer to "use your own Tailwind setup", or delete it outright? Lean
  delete (it was aspirational, never wired into the published package).
- Tailwind 4's new `@theme` directive could be useful for matching the
  GoldenChart brand kits more tightly — out of scope for the migration but
  worth a follow-up.
