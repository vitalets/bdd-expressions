import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Do not configure a parent repository or fail when installing a published tarball.
if (!process.env.CI && existsSync(new URL('../.git', import.meta.url))) {
  const result = spawnSync('git', ['config', '--local', 'core.hooksPath', 'scripts/git-hooks'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
