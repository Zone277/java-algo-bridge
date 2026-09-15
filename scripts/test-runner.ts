import { JavaRunner } from '../apps/api/src/runner.js';
import { command } from './process.js';
const runner = new JavaRunner();
const health = await runner.getAvailability();
await runner.close();
if (!health.available) {
  console.error(`BLOCKED real Java tests: ${health.reason}`);
  process.exitCode = 1;
} else {
  process.exitCode = await command(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.runner.config.ts']);
}
