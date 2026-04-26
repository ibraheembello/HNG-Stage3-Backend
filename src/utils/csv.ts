const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

export const rowsToCsv = <T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T & string)[]
): string => {
  const header = columns.join(',');
  const body = rows
    .map((r) => columns.map((c) => escapeCell(r[c])).join(','))
    .join('\n');
  return rows.length === 0 ? header + '\n' : header + '\n' + body + '\n';
};
