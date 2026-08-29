import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/domain/contentQuality.test.ts', '--reporter=verbose'], {
  cwd: process.cwd(),
  env: { ...process.env, CONTENT_REPORT: '1' },
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
