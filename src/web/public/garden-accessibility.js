export function setGardenConnection(root, online) {
  const banner = root.querySelector('[data-role="connection"]');
  if (banner) {
    banner.hidden = online;
    banner.textContent = online ? '' : 'The garden service is offline. New plantings cannot be saved.';
  }
  const board = root.querySelector('[data-role="plot-cards"]');
  if (board) board.setAttribute('aria-busy', online ? 'false' : 'true');
}

export function bedSummary(card) {
  const active = card.querySelectorAll('[data-status="active"]').length;
  const planned = card.querySelectorAll('[data-status="planned"]').length;
  return `${active} active and ${planned} planned plantings`;
}
