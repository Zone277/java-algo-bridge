import { buildApp } from './app.js';
import { apiPort, webPort } from '../../../scripts/ports.js';

const app = await buildApp({ allowedHosts: [apiPort, webPort].flatMap(port => [`127.0.0.1:${port}`, `localhost:${port}`]), allowedOrigins: [apiPort, webPort].flatMap(port => [`http://127.0.0.1:${port}`, `http://localhost:${port}`]) });
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  if (process.connected) process.disconnect();
}
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
process.on('message', message => { if (message === 'shutdown') void stop(); });
await app.listen({ host: '127.0.0.1', port: apiPort });
if (process.connected) process.send?.('ready');
