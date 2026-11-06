import { ImportFileError } from './import_file';
import { IMPORT_COLUMNS, type ImportColumnKey, type ImportRowValues } from './member_import_types';
import { normaliseGhanaPhone } from './phone_number';

const MAX_LENGTH: Record<ImportColumnKey, number> = {
  firstName: 100,
  middleName: 100,
  lastName: 100,
  memberNumber: 50,
  phone: 40,
  dateOfBirth: 40,
  unit: 120,
};
const LABEL = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.header])) as Record<
  ImportColumnKey,
  string
>;
const HEADER_KEYS: Record<string, ImportColumnKey> = {
  ...Object.fromEntries(IMPORT_COLUMNS.map((c) => [simplify(c.header), c.key])),
  surname: 'lastName',
  partyid: 'memberNumber',
  memberno: 'memberNumber',
  membershipnumber: 'memberNumber',
  phonenumber: 'phone',
  dob: 'dateOfBirth',
};

export interface CheckedRow {
  rowNumber: number;
  rawValues: ImportRowValues;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  memberNumber: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  errors: Record<string, string[]>;
}

function simplify(header: string): string {
  return header
    .toLowerCase()
    .replace(/\(required\)|\*/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function importTemplateCsv(): string {
  const headers = IMPORT_COLUMNS.map((c) => (c.isRequired ? `${c.header} (required)` : c.header));
  return `\uFEFF${headers.join(',')}\r\n`;
}

// Calendar dates as YYYY-MM-DD; DD/MM/YYYY too, the order people in Ghana write them.
function toIsoDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]]
      : [];
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return date.toISOString().slice(0, 10);
}

// Splits the sheet into the header and its data rows, skipping blank lines.
export function readTable(table: string[][], maxRows: number) {
  const isBlank = (row: string[]) => row.every((cell) => cell.trim() === '');
  const headerIndex = table.findIndex((row) => !isBlank(row));
  if (headerIndex < 0) throw new ImportFileError('The file is empty.');

  const columns = table[headerIndex]!.map((header) => HEADER_KEYS[simplify(header)]);
  const missing = IMPORT_COLUMNS.filter((c) => c.isRequired && !columns.includes(c.key));
  if (missing.length > 0) {
    throw new ImportFileError(
      `The file needs these columns: ${missing.map((c) => c.header).join(', ')}. Download the template to see them.`,
    );
  }

  const rows: { rowNumber: number; values: ImportRowValues }[] = [];
  table.forEach((cells, index) => {
    if (index <= headerIndex || isBlank(cells)) return;
    const values: ImportRowValues = {};
    columns.forEach((key, column) => {
      const value = cells[column]?.trim();
      if (key && value && !values[key]) values[key] = value;
    });
    rows.push({ rowNumber: index + 1, values });
  });
  if (rows.length === 0)
    throw new ImportFileError('The file has no member rows under the headings.');
  if (rows.length > maxRows) {
    throw new ImportFileError(
      `The file has more than ${maxRows.toLocaleString('en-GB')} member rows. Split it into smaller files.`,
    );
  }
  return rows;
}

export function checkRow(rowNumber: number, values: ImportRowValues): CheckedRow {
  const errors: Record<string, string[]> = {};
  const add = (field: string, message: string) => (errors[field] ??= []).push(message);
  const rawValues: ImportRowValues = {};

  for (const key of Object.keys(values) as ImportColumnKey[]) {
    const value = values[key]!;
    rawValues[key] = value.slice(0, 255);
    if (value.length > MAX_LENGTH[key]) {
      add(key, `${LABEL[key]} is too long (${MAX_LENGTH[key]} characters at most).`);
    }
  }
  if (!values.firstName) add('firstName', 'First name is required.');
  if (!values.lastName) add('lastName', 'Last name is required.');

  const phone = values.phone ? normaliseGhanaPhone(values.phone) : null;
  if (values.phone && !phone) add('phone', 'Not a valid Ghanaian phone number.');

  let dateOfBirth = values.dateOfBirth ? toIsoDate(values.dateOfBirth) : null;
  if (values.dateOfBirth && !dateOfBirth) {
    add('dateOfBirth', 'Enter the date of birth as YYYY-MM-DD.');
  } else if (
    dateOfBirth &&
    (dateOfBirth < '1900-01-01' || dateOfBirth >= new Date().toISOString().slice(0, 10))
  ) {
    add('dateOfBirth', 'Enter a real date of birth.');
    dateOfBirth = null;
  }

  const text = (key: ImportColumnKey) => (values[key] && !errors[key] ? values[key]! : null);
  return {
    rowNumber,
    rawValues,
    firstName: text('firstName'),
    middleName: text('middleName'),
    lastName: text('lastName'),
    memberNumber: text('memberNumber'),
    phone,
    dateOfBirth,
    errors,
  };
}
