import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { CONTAINER_LABEL } from '../apps/api/src/runner.js';

import { webUrl, webPort, apiPort } from './ports.js';
const exec = promisify(execFile);
const names = async () => (await exec('docker', ['ps', '-a', '--filter', `label=${CONTAINER_LABEL}`, '--format', '{{.Names}}'], { timeout: 5000 })).stdout.trim().split(/\s+/).filter(Boolean);
const before = new Set(await names());
const dev = spawn(process.execPath, ['--import', 'tsx', 'scripts/dev.ts'], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
dev.stdout?.on('data', chunk => process.stdout.write(chunk));
dev.stderr?.on('data', chunk => process.stderr.write(chunk));
const exited = new Promise<number | null>(resolve => dev.once('exit', resolve));
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(`${webUrl}/api/health`)).ok; } catch { /* server startup */ }
    if (ready) break;
    if (dev.exitCode !== null) throw new Error('Dev server exited before ready');
    await delay(100);
  }
  assert(ready, 'real dev server starts');
  const session = await (await fetch(`${webUrl}/api/session`)).json() as { token: string };
  const pending = fetch(`${webUrl}/api/runs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: webUrl, 'X-Java-Algo-Session': session.token },
    body: JSON.stringify({ problemId: '704', lessonVersion: '704-v1', mode: 'run', input: { nums: [1, 3], target: 3 }, source: 'class Solution { public int search(int[] nums, int target) { while (true) {} } }' }),
  }).then(async response => ({ response: await response.json() as { status: string } })).catch(() => ({ disconnected: true }));
  let task: string | undefined;
  for (let i = 0; i < 60; i++) {
    task = (await names()).find(name => name.startsWith('jab-run-') && !before.has(name));
    if (task) break;
    await delay(50);
  }
  assert(task, 'actual task container exists before shutdown');
  dev.send('shutdown');
  const timeout = setTimeout(() => dev.kill(), 12000);
  const code = await exited;
  clearTimeout(timeout);
  assert.equal(code, 0, 'IPC graceful shutdown exits cleanly');
  const outcome = await pending;
  if ('response' in outcome) assert.equal(outcome.response.status, 'CANCELLED');
  const remaining = (await names()).filter(name => !before.has(name));
  assert.deepEqual(remaining, [], `shutdown must remove task and probe containers: ${remaining.join(', ')}`);
  for (const port of [apiPort, webPort]) {
    await assert.rejects(fetch(`http://127.0.0.1:${port}/`), `port ${port} must be closed`);
  }
  console.log('PASS real dev startup, in-flight task shutdown, container cleanup and both ports closed');
} finally {
  if (dev.connected) dev.send('shutdown');
}
