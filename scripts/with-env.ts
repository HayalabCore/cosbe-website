/**
 * Runs a command with the env files of APP_ENV loaded, e.g. `yarn dev` →
 * `with-env next dev`. Loaded values are real process variables, so they beat
 * Next's own files: `APP_ENV=production yarn dev` uses env/production.env.
 */
import '../src/lib/env/register';
import { spawn } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: tsx scripts/with-env.ts <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
