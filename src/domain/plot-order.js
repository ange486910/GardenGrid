import { ValidationError } from './validation.js';

export function normalizePlotOrder(plotIds, plots) {
  if (!Array.isArray(plotIds)) throw new ValidationError('plotIds must be an array', { field: 'plotIds' });
  const expected = new Set(plots.map((plot) => plot.id));
  if (plotIds.length !== expected.size) throw new ValidationError('plotIds must contain every plot exactly once', { field: 'plotIds' });
  const seen = new Set();
  for (const id of plotIds) {
    if (typeof id !== 'string' || !expected.has(id) || seen.has(id)) {
      throw new ValidationError('plotIds must contain every plot exactly once', { field: 'plotIds', id });
    }
    seen.add(id);
  }
  return plotIds.map((id, index) => ({ id, displayOrder: index + 1 }));
}
