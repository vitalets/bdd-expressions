import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'bdd-expressions-consumer-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, npm_config_cache: join(temp, 'cache') };

try {
  const packed = JSON.parse(
    execFileSync(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], {
      cwd: root,
      env,
      encoding: 'utf8',
    }),
  );
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    npm,
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(temp, packed[0].filename),
    ],
    { cwd: temp, env, stdio: 'pipe' },
  );
  const installed = join(temp, 'node_modules/bdd-expressions');
  const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  for (const file of ['dist/index.js', 'dist/index.d.ts', 'src/index.ts', 'CHANGELOG.md']) {
    assert.ok(existsSync(join(installed, file)), `Missing packaged file: ${file}`);
  }
  for (const file of ['dist/index.js.map', 'dist/index.d.ts.map']) {
    const path = join(installed, file);
    const map = JSON.parse(readFileSync(path, 'utf8'));
    for (const source of map.sources) {
      assert.ok(existsSync(resolve(dirname(path), source)), `Missing map source: ${source}`);
    }
  }
  writeFileSync(
    join(temp, 'consumer.mjs'),
    `import assert from 'node:assert/strict';
import { createExpression } from 'bdd-expressions';
const expression = createExpression('I open :page( with :count{int})');
const values = await expression.matchValues('I open "Settings"');
assert.deepEqual([...values], ['Settings', undefined]);
assert.equal(values.params.page, 'Settings');
assert.equal(expression.match('I open "Settings"')[0].group.value, '"Settings"');
assert.equal(expression.regexp.hasIndices, true);
`,
  );
  execFileSync(process.execPath, ['consumer.mjs'], { cwd: temp, stdio: 'inherit' });
  writeFileSync(
    join(temp, 'consumer.ts'),
    `import { createExpression, type Expression, type Values } from 'bdd-expressions';
const expression: Expression = createExpression(':page');
const values: Values | null = await expression.matchValues('"Settings"');
export const page: unknown = values?.params.page;
`,
  );
  writeFileSync(
    join(temp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        strict: true,
        noEmit: true,
        types: [],
      },
      files: ['consumer.ts'],
    }),
  );
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', temp], {
    cwd: temp,
    stdio: 'inherit',
  });
  console.log('Packed ESM import, declarations, source maps, and zero-dependency checks passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
