export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function requireObject(value, field = 'payload') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${field} must be an object`, { field });
  return value;
}

export function requireString(value, field, options = {}) {
  const { maxLength = 160 } = options;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`, { field });
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) throw new ValidationError(`${field} must contain 1-${maxLength} characters`, { field });
  return text;
}

export function optionalString(value, field, options = {}) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, options);
}

export function requireEnum(value, field, allowed) {
  if (!allowed.includes(value)) throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`, { field, allowed });
  return value;
}

export function requireInteger(value, field, options = {}) {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options;
  if (!Number.isInteger(value) || value < min || value > max) throw new ValidationError(`${field} must be an integer between ${min} and ${max}`, { field });
  return value;
}

export function requireDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError(`${field} must use YYYY-MM-DD`, { field });
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ValidationError(`${field} is not a valid date`, { field });
  return value;
}

export class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}
