/**
 * Import first in any entry point Next does not start (worker, scripts,
 * Prisma config, DB tests): loads env files before modules read variables.
 */
import { loadAppEnv } from './load-env';

export const { appEnv } = loadAppEnv();
