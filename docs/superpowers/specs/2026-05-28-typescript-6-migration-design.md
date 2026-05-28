# TypeScript 6 migration — design

**Status:** Approved (design) · **Date:** 2026-05-28 · **Owner:** Ben Severn
· **Tracks:** the (closed) dependabot PR #106 (`typescript@^5.9 → ^6.0`).

---

## 1. Context

Dependabot opened `typescript 5.9.3 → 6.0.3`. Both CI jobs failed with a
**single error**, in the build step (not typecheck):

```
error TS5101: Option 'baseUrl' is deprecated and will stop functioning in
TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to
silence this error.
```

We expected a wider blast radius (a major TS version usually surfaces several
stricter checks). It did not. There is nothing else to fix.

## 2. Root cause

None of our tsconfigs use `baseUrl`:

| tsconfig | `baseUrl` | `paths` |
| --- | --- | --- |
| `tsconfig.json` (root) | no | no |
| `mcp/tsconfig.json` | no | no |
| `playground/tsconfig.json` | no | yes (`goldenchart` alias) |

The deprecation is being emitted from **`tsup`'s internal compile** during
`npm run build` in both packages. `tsup@^8` is pinned in both `package.json`s
and it (or one of its transitive plugins) still sets `baseUrl` in the
synthesised tsconfig it hands to TypeScript.

`typecheck` (plain `tsc --noEmit`) is unaffected, because our own configs are
clean.

## 3. Options

### Option A — wait for tsup to fix it upstream

Cheapest path. Track tsup releases; when a version lands that no longer sets
`baseUrl` (or that ignores TS 6 deprecations for users), bump `tsup`
alongside `typescript`.

- **Pro:** zero work on our side, clean migration when it lands.
- **Con:** we stay on TS 5 until upstream moves. No upper bound on the wait,
  but TS 7 is the hard deadline (the deprecation becomes an error).

### Option B — silence the deprecation now and bump TS

Add `"ignoreDeprecations": "6.0"` to both root and mcp `tsconfig.json`, then
bump `typescript` to `^6`. Removes the build error without addressing the
upstream tsup behaviour.

- **Pro:** unblocks TS 6 immediately for users who want our types.
- **Con:** adds a workaround flag we'll have to remove later — and it must be
  removed before bumping to TS 7 (the flag itself stops working at v7).

### Option C — switch the build off tsup

`tsup` is a build wrapper around esbuild; for our shape (ESM + CJS + d.ts),
`tsdown` or a direct esbuild + `tsc --emitDeclarationOnly` pipeline would also
work. Largest blast radius, breaks the most working things.

- **Pro:** removes one layer of magic; we own the build directly.
- **Con:** significant rewrite of `tsup.config.ts` + verifying every export,
  the dual ESM/CJS surface, the four entry points (`.`, `/server`, `/fonts`,
  `/interactive`), and the bundle-budget guard.

## 4. Decision

**Option A** as the primary path. Watch the `tsup` 8.x / 9.x releases and
bump together once they ship a fix. Adopt **Option B** as a fallback only if
TS 6 becomes urgently needed (e.g. a downstream consumer can't typecheck
against our `.d.ts` under TS 6 — which would itself need verifying first,
since the deprecation only fires on tsup's *build*, not on consumers'
typecheck of the published `.d.ts`).

## 5. Verification

When the bump happens:

1. `npm install typescript@^6 tsup@<known-good>` in root.
2. `cd mcp && npm install typescript@^6` (mcp uses root's tsup transitively
   via its own pin — bump there too).
3. CI green on the existing gates: `typecheck`, `lint`, `format:check`,
   `test:coverage`, `build`, `check:bundle`, mcp `typecheck`/`test`/`build`.
4. Confirm the published `.d.ts` typechecks under both TS 5 (existing users)
   and TS 6 (new users) — spot-check by running `tsc --noEmit` against a
   tiny consumer fixture under each.

## 6. Rollback

Revert the version bumps in both `package.json`s and the corresponding lock
file entries. No code changes are anticipated, so rollback is just the
manifest revert.

## 7. Open questions

- Does TS 6 surface any stricter checks against our `.d.ts` from a consumer's
  perspective (i.e. does someone *using* our types under TS 6 see new errors
  beyond what we see)? **Action:** when a tsup-compatible TS 6 is available,
  build a published-d.ts fixture and run `tsc --noEmit` against it under TS 6
  before merging.
