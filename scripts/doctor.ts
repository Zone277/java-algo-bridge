import { createServer } from 'node:net';
import { JavaRunner } from '../apps/api/src/runner.js';
import { webPort, apiPort } from './ports.js';
let failed = false;
const nodeOk = process.versions.node === '24.20.0';
console.log(`${nodeOk ? 'PASS' : 'FAIL'} Node ${process.versions.node}; pinned 24.20.0`);
failed ||= !nodeOk;
for (const port of [webPort, apiPort]) {
  const free = await new Promise<boolean>(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
  console.log(`${free ? 'PASS' : 'FAIL'} 127.0.0.1:${port} bind`);
  failed ||= !free;
}
const runner = new JavaRunner();
try {
  const health = await runner.getAvailability();
  console.log(`${health.available ? 'PASS' : 'BLOCKED'} Docker/JDK runner ${JSON.stringify(health)}`);
  failed ||= !health.available;
} finally { await runner.close(); }
process.exitCode = failed ? 1 : 0;
