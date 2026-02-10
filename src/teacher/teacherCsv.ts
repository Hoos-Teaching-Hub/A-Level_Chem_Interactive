type CsvValue = string | number | null | undefined;

const escapeCsvValue = (value: CsvValue) => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows: CsvValue[][]) =>
  rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');

export const downloadCsv = (filename: string, rows: CsvValue[][]) => {
  if (typeof document === 'undefined') {
    return;
  }

  // Quote values with commas/newlines so spreadsheet apps parse consistently.
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};
