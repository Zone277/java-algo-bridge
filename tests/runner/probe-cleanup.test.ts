import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { JavaRunner } from '../../apps/api/src/runner.js';

it('Docker removes a finished health probe before application cleanup can run', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jab-probe-check-'));
  const driver = join(root, 'docker-driver.cjs');
  const log = join(root, 'before-cleanup.json');
  // Forward every command to real Docker. Before the host rm, inspect whether
  // daemon-side --rm has already removed the probe. No Java result is fabricated.
  await writeFile(driver, `
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const [log, ...args] = process.argv.slice(2);
if (args[0] === 'rm' && args.at(-1).startsWith('jab-probe-')) {
  const inspected = spawnSync('docker', ['inspect', args.at(-1)], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  fs.writeFileSync(log, JSON.stringify({ status: inspected.status, stderr: inspected.stderr }));
}
const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exitCode = result.status ?? 1;
`);
  const runner = new JavaRunner({ dockerExecutable: process.execPath, dockerArgumentsPrefix: [driver, log], tempRoot: root });
  try {
    expect(await runner.getAvailability()).toEqual({ available: true, reason: null });
    const observed = JSON.parse(await readFile(log, 'utf8')) as { status: number | null; stderr: string };
    expect(observed.status).toBe(1);
    expect(observed.stderr).toMatch(/No such (object|container)/i);
  } finally {
    await runner.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
