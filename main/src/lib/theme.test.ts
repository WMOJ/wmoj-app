import assert from 'node:assert/strict';
import test from 'node:test';

import { nextThemeSetting, resolveTheme, THEME_INIT_SCRIPT } from '@/lib/theme';

test('an explicit light or dark choice ignores the OS preference', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('dark', true), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('light', false), 'light');
});

test('system, a missing value and a junk value all follow the OS preference', () => {
  for (const setting of ['system', null, undefined, '', 'purple']) {
    assert.equal(resolveTheme(setting, true), 'dark', `OS dark, stored ${JSON.stringify(setting)}`);
    assert.equal(resolveTheme(setting, false), 'light', `OS light, stored ${JSON.stringify(setting)}`);
  }
});

test('the toggle cycles light, dark, system and back to light', () => {
  assert.equal(nextThemeSetting('light'), 'dark');
  assert.equal(nextThemeSetting('dark'), 'system');
  assert.equal(nextThemeSetting('system'), 'light');
});

/**
 * Runs the inline <head> script against stubs and reports whether it put the
 * `dark` class on <html>. A regression here is a flash of the wrong theme on
 * every hard reload, so this pins the script to resolveTheme().
 */
function paintedDark(options: { stored: string | null | 'throw'; prefersDark: boolean }): boolean {
  const classes = new Set<string>();
  const documentStub = {
    documentElement: {
      classList: {
        toggle(name: string, force?: boolean) {
          if (force) classes.add(name);
          else classes.delete(name);
          return force;
        },
      },
    },
  };
  const storage = {
    getItem() {
      if (options.stored === 'throw') throw new Error('storage disabled');
      return options.stored;
    },
  };
  const windowStub = {
    matchMedia: () => ({ matches: options.prefersDark }),
  };
  new Function('document', 'localStorage', 'window', THEME_INIT_SCRIPT)(documentStub, storage, windowStub);
  return classes.has('dark');
}

test('the inline script agrees with resolveTheme for every stored value and OS preference', () => {
  for (const stored of ['light', 'dark', 'system', null, 'purple'] as const) {
    for (const prefersDark of [true, false]) {
      assert.equal(
        paintedDark({ stored, prefersDark }),
        resolveTheme(stored, prefersDark) === 'dark',
        `stored ${JSON.stringify(stored)}, OS dark ${prefersDark}`,
      );
    }
  }
});

test('the inline script still follows the OS when storage is unreadable', () => {
  assert.equal(paintedDark({ stored: 'throw', prefersDark: true }), true);
  assert.equal(paintedDark({ stored: 'throw', prefersDark: false }), false);
});
