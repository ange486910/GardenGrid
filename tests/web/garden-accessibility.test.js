import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bedSummary, setGardenConnection } from '../../src/web/public/garden-accessibility.js';

function fakeRoot() {
  const banner = { hidden: true, textContent: '' };
  const board = { attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, value); } };
  const card = { querySelectorAll: (selector) => selector.includes('active') ? [1] : [1, 2] };
  return {
    querySelector(selector) {
      if (selector === '[data-role="connection"]') return banner;
      if (selector === '[data-role="plot-cards"]') return board;
      return null;
    },
    banner,
    board,
    card
  };
}

test('garden connection state updates status and busy semantics', () => {
  const root = fakeRoot();
  setGardenConnection(root, false);
  assert.equal(root.banner.hidden, false);
  assert.match(root.banner.textContent, /offline/);
  assert.equal(root.board.attributes.get('aria-busy'), 'true');
  setGardenConnection(root, true);
  assert.equal(root.board.attributes.get('aria-busy'), 'false');
  assert.equal(bedSummary(root.card), '1 active and 2 planned plantings');
});

test('garden layout includes reduced motion and keyboard focus rules', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'web', 'public', 'garden.css'), 'utf8');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 820px\)/);
});
