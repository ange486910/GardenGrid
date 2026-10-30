import { ValidationError, requireEnum, requireString } from './validation.js';

export const COMPANION_TYPES = Object.freeze(['companion', 'antagonist']);

export const COMPANION_RULES = Object.freeze([
  { id: 'tomato-basil', pair: ['tomato', 'basil'], type: 'companion', note: 'Basil is a traditional tomato companion.' },
  { id: 'tomato-potato', pair: ['tomato', 'potato'], type: 'antagonist', note: 'Both are Solanaceae and share late-blight pressure.' },
  { id: 'carrot-onion', pair: ['carrot', 'onion'], type: 'companion', note: 'Onion scent can deter carrot fly.' },
  { id: 'beans-onion', pair: ['beans', 'onion'], type: 'antagonist', note: 'Allium compounds inhibit legume growth.' },
  { id: 'cabbage-strawberry', pair: ['cabbage', 'strawberry'], type: 'companion', note: 'Ground cover and pest diversity benefit both.' },
  { id: 'lettuce-carrot', pair: ['lettuce', 'carrot'], type: 'companion', note: 'Different root depths use space efficiently.' },
  { id: 'corn-tomato', pair: ['corn', 'tomato'], type: 'antagonist', note: 'Corn can host tomato fruitworm.' },
  { id: 'dill-fennel', pair: ['dill', 'fennel'], type: 'antagonist', note: 'Fennel inhibits many nearby plants.' },
  { id: 'cucumber-radish', pair: ['cucumber', 'radish'], type: 'companion', note: 'Radish marks rows and loosens soil.' },
  { id: 'peas-garlic', pair: ['peas', 'garlic'], type: 'antagonist', note: 'Garlic inhibits legume growth.' }
]);

export function normalizeCropName(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateCompanionRule(rule) {
  const payload = rule && typeof rule === 'object' ? rule : {};
  const pair = Array.isArray(payload.pair) ? payload.pair : [];
  if (pair.length !== 2) throw new ValidationError('companion rule must have exactly two crops', { field: 'pair' });
  const normalized = pair.map((name) => normalizeCropName(requireString(name, 'pair item', { maxLength: 80 })));
  if (normalized[0] === normalized[1]) throw new ValidationError('companion rule cannot pair a crop with itself', { field: 'pair' });
  return {
    id: requireString(payload.id, 'id', { maxLength: 80 }),
    pair: normalized.sort(),
    type: requireEnum(payload.type, 'type', COMPANION_TYPES),
    note: requireString(payload.note, 'note', { maxLength: 300 })
  };
}
