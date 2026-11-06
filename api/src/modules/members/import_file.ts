import { readSheet } from 'read-excel-file/node';

import type { MemberImportFileType } from './member_import_types';

// Raised for problems with the file itself; the message is shown to the user as-is.
export class ImportFileError extends Error {}

const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_END_OF_DIRECTORY = 0x06054b50;
const ZIP_DIRECTORY_ENTRY = 0x02014b50;
const MAX_ZIP_ENTRIES = 2_000;
const MAX_UNPACKED_BYTES = 200 * 1024 * 1024;
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const UTF8_BOM = '\uFEFF';

interface ZipDirectory {
  names: string[];
  unpackedBytes: number;
}

// Reads the zip's own table of contents, so a renamed .docx or a zip bomb is refused before any
// inflating. Zip64 archives are refused: a real member list never needs one.
function readZipDirectory(file: Buffer): ZipDirectory | null {
  const searchFrom = Math.max(0, file.length - 22 - 0xffff);
  let end = -1;
  for (let at = file.length - 22; at >= searchFrom; at -= 1) {
    if (file.readUInt32LE(at) === ZIP_END_OF_DIRECTORY) {
      end = at;
      break;
    }
  }
  if (end < 0) return null;

  const count = file.readUInt16LE(end + 10);
  let offset = file.readUInt32LE(end + 16);
  if (count === 0xffff || offset === 0xffffffff || count > MAX_ZIP_ENTRIES) return null;

  const names: string[] = [];
  let unpackedBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > file.length || file.readUInt32LE(offset) !== ZIP_DIRECTORY_ENTRY) return null;
    const size = file.readUInt32LE(offset + 24);
    const nameLength = file.readUInt16LE(offset + 28);
    const extraLength = file.readUInt16LE(offset + 30);
    const commentLength = file.readUInt16LE(offset + 32);
    if (size === 0xffffffff) return null;
    unpackedBytes += size;
    names.push(file.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { names, unpackedBytes };
}

function isPlainText(file: Buffer): boolean {
  for (const byte of file) {
    if (byte === 0 || (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)) {
      return false;
    }
  }
  return true;
}

export function detectImportFileType(file: Buffer, fileName: string): MemberImportFileType {
  const extension = fileName.toLowerCase().split('.').pop();
  if (file.subarray(0, 8).equals(OLE_SIGNATURE)) {
    throw new ImportFileError('Old .xls files are not supported. Save the file as .xlsx or .csv.');
  }
  if (extension === 'xlsx') {
    const directory =
      file.length >= 22 && file.readUInt32LE(0) === ZIP_LOCAL_HEADER
        ? readZipDirectory(file)
        : null;
    if (!directory || !directory.names.includes('xl/workbook.xml')) {
      throw new ImportFileError('This file is not a valid Excel workbook (.xlsx).');
    }
    if (directory.unpackedBytes > MAX_UNPACKED_BYTES) {
      throw new ImportFileError(
        'This workbook is too large to import. Split it into smaller files.',
      );
    }
    return 'xlsx';
  }
  if (extension === 'csv') {
    if (!isPlainText(file)) throw new ImportFileError('This file is not a valid CSV file.');
    return 'csv';
  }
  throw new ImportFileError('Upload a .csv or .xlsx file.');
}

// Excel on Windows often saves CSV as Windows-1252 rather than UTF-8.
function decodeText(file: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(file);
  } catch {
    text = new TextDecoder('windows-1252').decode(file);
  }
  return text.startsWith(UTF8_BOM) ? text.slice(1) : text;
}

// RFC 4180: comma separated, fields optionally in double quotes ("" is a quote inside one),
// records end with CRLF, LF or CR, and quoted fields may span lines.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (index < text.length) {
    const char = text[index]!;
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 2;
        continue;
      }
      if (char === '"') inQuotes = false;
      else field += char;
      index += 1;
      continue;
    }
    if (char === '"' && field === '') inQuotes = true;
    else if (char === ',') endField();
    else if (char === '\r' || char === '\n') {
      endRow();
      if (char === '\r' && text[index + 1] === '\n') index += 1;
    } else field += char;
    index += 1;
  }
  if (inQuotes) throw new ImportFileError('The CSV file has a quote that is never closed.');
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

// Every cell as text; numbers stay exactly as typed so phones and member IDs keep their digits.
export async function readSpreadsheet(
  file: Buffer,
  fileType: MemberImportFileType,
): Promise<string[][]> {
  if (fileType === 'csv') return parseCsv(decodeText(file));
  try {
    const rows = await readSheet(file, { parseNumber: (value: string) => value });
    return rows.map((row) => row.map(cellText));
  } catch {
    throw new ImportFileError('This workbook could not be read. Save it again as .xlsx and retry.');
  }
}
