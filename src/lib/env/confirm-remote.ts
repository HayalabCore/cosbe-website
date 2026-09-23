import { createInterface } from 'node:readline/promises';
import { isRemoteAppEnv, type AppEnv, type EnvMap } from './load-env';

async function askTerminal(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

function host(url: string | undefined): string {
  try {
    return url ? new URL(url).host : 'unknown host';
  } catch {
    return 'unknown host';
  }
}

/**
 * Before a command writes to a staging or production database from a laptop,
 * show where it points and make the user type the environment's name.
 * `--yes` skips the question for non-interactive runs.
 */
export async function confirmRemote(
  appEnv: AppEnv,
  {
    ask = askTerminal,
    env = process.env,
    argv = process.argv,
  }: {
    ask?: (question: string) => Promise<string>;
    env?: EnvMap;
    argv?: string[];
  } = {}
): Promise<void> {
  if (!isRemoteAppEnv(appEnv) || argv.includes('--yes')) return;
  const answer = await ask(
    `This writes to the ${appEnv.toUpperCase()} database at ${host(env.DATABASE_URL)}.\nType "${appEnv}" to continue: `
  );
  if (answer.trim() !== appEnv) throw new Error('Cancelled.');
}
