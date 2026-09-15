import { npmRun } from './process.js';
for (const name of ['doctor', 'check', 'build', 'test:runner', 'test:e2e', 'test:shutdown']) {
  const code = await npmRun(name);
  if (code !== 0) { process.exitCode = code; break; }
}
