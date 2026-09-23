/**
 * Asks before a remote Prisma command runs: `yarn db:deploy:prod` runs this,
 * then `prisma migrate deploy`. Does nothing for local work.
 */
import { appEnv } from '../src/lib/env/register';
import { confirmRemote } from '../src/lib/env/confirm-remote';

confirmRemote(appEnv).catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
