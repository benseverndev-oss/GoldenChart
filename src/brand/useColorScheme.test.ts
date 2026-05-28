import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Project convention is no-jsdom (see src/interactive/InteractiveChart.test.ts).
// We test the pure helper directly, then exercise `useResolvedBrand` via SSR
// rendering — which runs the hook's initial state (its SSR-safe path) without
// firing effects. The hydrated/`matchMedia`-driven update is browser-only and
// not unit-tested here.

type Listener = (ev: { matches: boolean }) => void;

function installFakeWindow(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mq = {
    get matches() {
      return initialMatches;
    },
    addEventListener: (_evt: string, cb: Listener) => {
      listeners.add(cb);
    },
    removeEventListener: (_evt: string, cb: Listener) => {
      listeners.delete(cb);
    },
  };
  (globalThis as { window?: unknown }).window = { matchMedia: () => mq };
}

let originalWindow: unknown;

beforeEach(() => {
  originalWindow = (globalThis as { window?: unknown }).window;
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

describe('readSystemScheme', () => {
  it('falls back to the default scheme when window is undefined (SSR)', async () => {
    (globalThis as { window?: unknown }).window = undefined;
    const { __readSystemSchemeForTest } = await import('./useColorScheme');
    expect(__readSystemSchemeForTest('light')).toBe('light');
    expect(__readSystemSchemeForTest('dark')).toBe('dark');
  });

  it('returns dark when matchMedia reports a dark preference', async () => {
    installFakeWindow(true);
    const { __readSystemSchemeForTest } = await import('./useColorScheme');
    expect(__readSystemSchemeForTest('light')).toBe('dark');
  });

  it('returns light when matchMedia reports no dark preference', async () => {
    installFakeWindow(false);
    const { __readSystemSchemeForTest } = await import('./useColorScheme');
    expect(__readSystemSchemeForTest('dark')).toBe('light');
  });
});

describe('useResolvedBrand (via SSR render)', () => {
  it('returns the light side by default during SSR for an auto-mode themed brand', async () => {
    installFakeWindow(true); // even with dark OS pref, SSR returns 'light'
    const { useResolvedBrand } = await import('./useColorScheme');

    let captured = '';
    function Probe() {
      const resolved = useResolvedBrand({
        light: { primary: '#f00' },
        dark: { primary: '#0ff' },
      });
      captured = resolved.vibeOverrides.fill ?? '';
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(captured).toBe('#f00');
  });

  it('honours mode=light even when the OS prefers dark', async () => {
    installFakeWindow(true);
    const { useResolvedBrand } = await import('./useColorScheme');

    let captured = '';
    function Probe() {
      const resolved = useResolvedBrand({
        mode: 'light',
        light: { primary: '#f00' },
        dark: { primary: '#0ff' },
      });
      captured = resolved.vibeOverrides.fill ?? '';
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(captured).toBe('#f00');
  });

  it('honours mode=dark even when the OS prefers light', async () => {
    installFakeWindow(false);
    const { useResolvedBrand } = await import('./useColorScheme');

    let captured = '';
    function Probe() {
      const resolved = useResolvedBrand({
        mode: 'dark',
        light: { primary: '#f00' },
        dark: { primary: '#0ff' },
      });
      captured = resolved.vibeOverrides.fill ?? '';
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(captured).toBe('#0ff');
  });

  it('passes through plain brands unchanged', async () => {
    installFakeWindow(true);
    const { useResolvedBrand } = await import('./useColorScheme');

    let captured = '';
    function Probe() {
      const resolved = useResolvedBrand({ primary: '#abc' });
      captured = resolved.vibeOverrides.fill ?? '';
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(captured).toBe('#abc');
  });
});
