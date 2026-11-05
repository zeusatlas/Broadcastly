import { describe, expect, it } from 'vitest';

import {
  detectImportFileType,
  ImportFileError,
  parseCsv,
  readSpreadsheet,
} from '../src/modules/members/import_file';
import { checkRow, importTemplateCsv, readTable } from '../src/modules/members/import_rows';

describe('CSV parsing', () => {
  it('handles quotes, escaped quotes, commas, CRLF and multi-line fields', () => {
    const rows = parseCsv('a,"b, c","say ""hi"""\r\n"line\nbreak",,x\r\n');
    expect(rows).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['line\nbreak', '', 'x'],
    ]);
  });

  it('strips a UTF-8 byte order mark and reads Windows-1252 text', async () => {
    const utf8 = Buffer.from('\uFEFFFirst name,Last name\nAma,Mensah\n', 'utf8');
    expect(await readSpreadsheet(utf8, 'csv')).toEqual([
      ['First name', 'Last name'],
      ['Ama', 'Mensah'],
    ]);
    const ansi = Buffer.from([0x41, 0x6e, 0x64, 0x72, 0xe9, 0x2c, 0x42]);
    expect(await readSpreadsheet(ansi, 'csv')).toEqual([['André', 'B']]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => parseCsv('a,"b\n')).toThrow(ImportFileError);
  });
});

describe('file type detection', () => {
  it('accepts plain text named .csv and refuses binary content or other extensions', () => {
    expect(detectImportFileType(Buffer.from('a,b\n'), 'list.CSV')).toBe('csv');
    expect(() => detectImportFileType(Buffer.from('%PDF-1.7\u0000\u0001'), 'list.csv')).toThrow(
      ImportFileError,
    );
    expect(() => detectImportFileType(Buffer.from('a,b\n'), 'list.xlsx')).toThrow(
      'This file is not a valid Excel workbook (.xlsx).',
    );
    expect(() => detectImportFileType(Buffer.from('a,b\n'), 'list.txt')).toThrow(
      'Upload a .csv or .xlsx file.',
    );
  });
});

describe('rows', () => {
  it('maps template headers, skips blank lines and checks fields', () => {
    const [header] = parseCsv(importTemplateCsv().slice(1));
    const rows = readTable(
      [header!, [], ['Ama', '', 'Mensah', 'P-1', '024 123 4567', '20/04/1990', '']],
      10,
    );
    expect(rows).toEqual([
      {
        rowNumber: 3,
        values: {
          firstName: 'Ama',
          lastName: 'Mensah',
          partyId: 'P-1',
          phone: '024 123 4567',
          dateOfBirth: '20/04/1990',
        },
      },
    ]);
    const checked = checkRow(3, rows[0]!.values);
    expect(checked.errors).toEqual({});
    expect(checked.phone).toBe('+233241234567');
    expect(checked.dateOfBirth).toBe('1990-04-20');
  });

  it('reports missing names, bad phones and impossible dates', () => {
    const checked = checkRow(2, { phone: '12345', dateOfBirth: '1990-02-30' });
    expect(Object.keys(checked.errors).sort()).toEqual([
      'dateOfBirth',
      'firstName',
      'lastName',
      'phone',
    ]);
  });

  it('refuses files without the required columns or over the row limit', () => {
    expect(() => readTable([['Phone'], ['0241234567']], 10)).toThrow(/First name, Last name/);
    expect(() =>
      readTable(
        [
          ['First name', 'Last name'],
          ['A', 'B'],
          ['C', 'D'],
        ],
        1,
      ),
    ).toThrow(/more than 1 member rows/);
  });
});
