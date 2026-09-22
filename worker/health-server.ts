import { createServer, type Server } from 'node:http';

export type HealthState = { ready: boolean; startedAt: Date };

/** Cloud Run services must listen on $PORT; this is all the worker serves. */
export function startHealthServer(port: number, state: HealthState): Server {
  const server = createServer((req, res) => {
    const path = req.url ? new URL(req.url, 'http://localhost').pathname : '';
    if (path === '/healthz') {
      res.writeHead(state.ready ? 200 : 503, {
        'content-type': 'application/json',
      });
      res.end(
        JSON.stringify({
          ready: state.ready,
          startedAt: state.startedAt.toISOString(),
        })
      );
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
