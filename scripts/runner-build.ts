import { command } from './process.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected = '2cbd119bf1961c28788310963dc80ba65f58cdeec1dd139c8bdb1240faa2c36f';
try {
  const jar = await readFile('runner/java/lib/gson-2.14.0.jar');
  if (createHash('sha256').update(jar).digest('hex') !== expected) throw new Error('Gson SHA-256 mismatch');
  process.exitCode = await command('docker', ['build', '--pull=false', '--tag', 'java-algo-bridge-runner:21.0.12', 'runner/java']);
  if (process.exitCode === 0) await command('docker', ['image', 'inspect', 'java-algo-bridge-runner:21.0.12', '--format', 'Image {{.Id}} / {{.Architecture}}']);
} catch (error) {
  console.error(`BLOCKED runner build: ${String(error)}`);
  process.exitCode = 1;
}
