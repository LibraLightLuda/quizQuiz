import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/NumberCal/' }
});

if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
