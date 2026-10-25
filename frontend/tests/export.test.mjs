import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { exportToSpreadsheet, fetchAllForExport } from '../src/lib/exportToExcel.js';

// SheetJS's ESM distribution needs an explicit filesystem adapter in Node.
// Browser downloads use the package's normal browser adapter.
XLSX.set_fs(fs);

test('patched spreadsheet package preserves XLSX/CSV export values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-export-'));
  try {
    const data = [{ Name: 'Synthetic', Amount: 123.5, Note: 'comma, quote " and newline\n' }];
    for (const format of ['xlsx', 'csv']) {
      exportToSpreadsheet(data, path.join(dir, `sample.${format}`), format);
      const book = XLSX.readFile(path.join(dir, `sample.${format}`));
      assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets.Data || book.Sheets[book.SheetNames[0]]), data);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('export pagination includes records beyond forty pages', async () => {
  const api = { async get(_, { params }) { return { data: { success: true, data: [{ id: params.page * 2 }, { id: params.page * 2 + 1 }], meta: { totalPages: 41 } } }; } };
  assert.equal((await fetchAllForExport(api, '/synthetic', {}, 2)).length, 82);
});

test('failed export responses reject instead of returning partial records', async () => {
  const api = { async get(_, { params }) { return { data: params.page === 1 ? { success: true, data: [{ id: 1 }], meta: { totalPages: 2 } } : { success: false } }; } };
  await assert.rejects(fetchAllForExport(api, '/synthetic', {}, 1), /incomplete data/);
});

test('form resolver supports the patched Zod v4 dependency', async () => {
  const { zodResolver } = await import('@hookform/resolvers/zod');
  const { z } = await import('zod');
  const resolver = zodResolver(z.object({ name: z.string().min(1) }));
  const opts = { criteriaMode: 'firstError', shouldUseNativeValidation: false };
  assert.ok((await resolver({ name: '' }, {}, opts)).errors.name);
  assert.deepEqual((await resolver({ name: 'Synthetic' }, {}, opts)).values, { name: 'Synthetic' });
});
