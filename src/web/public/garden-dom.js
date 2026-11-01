export function clearAndFill(select, rows, selectedId, label) {
  if (!select) return;
  select.replaceChildren(...rows.map((row) => {
    const option = select.ownerDocument.createElement('option');
    option.value = row.id;
    option.textContent = label(row);
    option.selected = row.id === selectedId;
    return option;
  }));
}

export function message(root, text) {
  const node = root.querySelector('[data-role="status"]');
  if (node) node.textContent = text;
}
