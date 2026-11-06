import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createTypePreview } from '../site/src/type-preview.ts';

const require = createRequire(import.meta.url);
const libraries = new Map(
  ['lib.es5.d.ts', 'lib.decorators.d.ts', 'lib.decorators.legacy.d.ts'].map((name) => [
    `/${name}`,
    readFileSync(require.resolve(`typescript/lib/${name}`), 'utf8'),
  ]),
);
libraries.set(
  '/parameter-types/data-table.ts',
  readFileSync(new URL('../src/parameter-types/data-table.ts', import.meta.url), 'utf8'),
);
const inferenceSource = readFileSync(new URL('../src/infer-params.ts', import.meta.url), 'utf8');

test('compiler preview resolves types and updates the same language service', () => {
  const preview = createTypePreview(inferenceSource, libraries);
  assert.equal(preview('I have :count{int} cucumber(s)'), '{\n  count: number;\n}');
  assert.equal(
    preview('I create :item( as :owner)'),
    '{\n  item: string;\n  owner: string | undefined;\n}',
  );
  assert.equal(preview(':status{pending/approved}'), '{\n  status: "pending" | "approved";\n}');
  assert.equal(preview(':value{biginteger}'), '{\n  value: bigint;\n}');
  assert.equal(preview(':table{DataTable}'), '{\n  table: IDataTable;\n}');
  assert.equal(preview('No named parameters'), '{}');
  assert.equal(preview('x'.repeat(257)), 'Record<string, unknown>');
  assert.equal(preview('x'.repeat(245) + ':count{int}'), '{\n  count: number;\n}');
  assert.equal(preview('x'.repeat(246) + ':count{int}'), 'Record<string, unknown>');
  assert.equal(preview('"\\\\ :count{int}\n'), '{\n  count: number;\n}');
});

test('preview follows changes to inference source rather than a duplicated builtin map', () => {
  const preview = createTypePreview(
    inferenceSource.replace('int: number;', 'int: boolean;'),
    libraries,
  );
  assert.equal(preview(':count{int}'), '{\n  count: boolean;\n}');
});
