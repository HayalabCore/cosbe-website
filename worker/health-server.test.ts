import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { startHealthServer } from './health-server';

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function listening(state: { ready: boolean; startedAt: Date }) {
  server = startHealthServer(0, state);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

describe('health server', () => {
  it('answers 503 until ready, then 200', async () => {
    const state = { ready: false, startedAt: new Date() };
    const base = await listening(state);
    expect((await fetch(`${base}/healthz`)).status).toBe(503);
    state.ready = true;
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ready: true });
  });

  it('answers /healthz when the probe adds a query string', async () => {
    const base = await listening({ ready: true, startedAt: new Date() });
    expect((await fetch(`${base}/healthz?ready=1`)).status).toBe(200);
  });

  it('answers 404 for other paths', async () => {
    const base = await listening({ ready: true, startedAt: new Date() });
    expect((await fetch(`${base}/`)).status).toBe(404);
  });
});
