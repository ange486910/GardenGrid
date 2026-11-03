function escapeText(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
}

function foldLine(line) {
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 75 && current) {
      parts.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function utcStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildCalendarIcs({ calendarName, events, generatedAt }) {
  const stamp = utcStamp(generatedAt);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GardenGrid//Calendar//EN', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.type}-${event.plantingId}-${event.date}@gardengrid`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.date.replaceAll('-', '')}`,
      `SUMMARY:${escapeText(`${event.crop} ${event.type}`)}`,
      `DESCRIPTION:${escapeText(`${event.plot}: ${event.crop}`)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.flatMap((line) => foldLine(line).split('\r\n')).join('\r\n')}\r\n`;
}
