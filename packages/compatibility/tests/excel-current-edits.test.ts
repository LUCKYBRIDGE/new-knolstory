import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { importAuthoringExcel } from '../src/authoring-workbook/excel';

const evidenceFolder = 'docs/architecture/evidence/excel-current-2026-10-23';

it('preserves the entire archive after native Excel text and visibility-score edits', async () => {
  const expected = JSON.parse(readFileSync(`${evidenceFolder}/expected.json`, 'utf8'));
  const workbook = new Uint8Array(readFileSync(`${evidenceFolder}/edited.xlsx`));
  const actual = await importAuthoringExcel(workbook);

  expect(actual).toEqual(expected);
  if (actual.format !== 'knolstory') throw new Error('Expected a KnolStory archive');
  expect(actual.document.project.lines[0].text).toBe('Excel에서 고친 본문 001 🌳');
  expect(actual.document.project.lines[1].visibility?.scores?.terms[0].value).toBe(5);
});
