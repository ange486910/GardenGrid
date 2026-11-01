export function shortDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function quantityLabel(quantity, unit) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(quantity)} ${unit}`;
}

export function daysUntil(value, today) {
  const target = Date.parse(`${value}T00:00:00.000Z`);
  const start = Date.parse(`${today}T00:00:00.000Z`);
  return Math.ceil((target - start) / 86_400_000);
}
