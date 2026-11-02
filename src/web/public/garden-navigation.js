export function gardenBedIndex(current, count, key) {
  if (count === 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(count - 1, current + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, current - 1);
  return current;
}

export function prepareBedCards(cards) {
  cards.forEach((card, index) => {
    card.tabIndex = index === 0 ? 0 : -1;
    card.setAttribute('role', 'group');
  });
}

export function installBedNavigation(container, announce) {
  if (!container) return;
  container.addEventListener('keydown', (event) => {
    if (event.altKey) return;
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const cards = [...container.querySelectorAll('article')];
    const current = cards.indexOf(event.target.closest('article'));
    if (current < 0) return;
    event.preventDefault();
    const next = gardenBedIndex(current, cards.length, event.key);
    cards.forEach((card, index) => { card.tabIndex = index === next ? 0 : -1; });
    cards[next]?.focus();
    announce?.(`Bed ${next + 1} of ${cards.length}`);
  });
}
export function moveBedOrder(ids, current, key) {
  if (!Number.isInteger(current) || current < 0 || current >= ids.length) return [...ids];
  const offset = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : key === 'ArrowRight' || key === 'ArrowDown' ? 1 : 0;
  const next = Math.max(0, Math.min(ids.length - 1, current + offset));
  if (next === current) return [...ids];
  const reordered = [...ids];
  [reordered[current], reordered[next]] = [reordered[next], reordered[current]];
  return reordered;
}