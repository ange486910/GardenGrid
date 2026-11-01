import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenBedIndex, prepareBedCards } from '../../src/web/public/garden-navigation.js';

test('bed navigation wraps direction at the board edges', () => {
  assert.equal(gardenBedIndex(0, 3, 'ArrowRight'), 1);
  assert.equal(gardenBedIndex(2, 3, 'ArrowRight'), 2);
  assert.equal(gardenBedIndex(1, 3, 'ArrowLeft'), 0);
  assert.equal(gardenBedIndex(1, 3, 'Home'), 0);
  assert.equal(gardenBedIndex(1, 3, 'End'), 2);
  assert.equal(gardenBedIndex(0, 0, 'ArrowRight'), -1);
});

test('only the first bed enters the tab order', () => {
  const cards = [{ setAttribute() {} }, { setAttribute() {} }, { setAttribute() {} }];
  prepareBedCards(cards);
  assert.deepEqual(cards.map((card) => card.tabIndex), [0, -1, -1]);
});
