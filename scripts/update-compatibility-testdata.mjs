/**
 * Refreshes local matching test cases from Cucumber Expressions' default branch.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bdd-expressions-testdata-'));
const repository = join(temporaryDirectory, 'cucumber-expressions');
const destination = fileURLToPath(new URL('../test/compatibility/testdata/', import.meta.url));

try {
  execFileSync(
    'git',
    ['clone', '--depth=1', 'https://github.com/cucumber/cucumber-expressions.git', repository],
    { stdio: 'inherit' },
  );
  const source = join(repository, 'testdata/cucumber-expression/matching');
  const files = readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name);
  if (files.length === 0) throw new Error('No upstream matching YAML files found.');

  mkdirSync(destination, { recursive: true });
  copyFileSync(join(repository, 'LICENSE'), join(destination, 'LICENSE'));
  for (const file of files) copyFileSync(join(source, file), join(destination, file));
  for (const file of readdirSync(destination)) {
    if (file.endsWith('.yaml') && !files.includes(file)) rmSync(join(destination, file));
  }
  console.log(`Copied ${files.length} matching YAML files and LICENSE to ${destination}`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
