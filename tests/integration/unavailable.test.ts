import { expect, it } from 'vitest';
import { JavaRunner } from '../../apps/api/src/runner.js';
import { LESSON_VERSION, RunResultSchema } from '../../packages/contracts/src/index.js';
import { correct } from '../fixtures/java.js';

it('missing Docker CLI returns unavailable with zero student execution and no host fallback', async () => {
  const runner = new JavaRunner({ dockerExecutable: 'jab-nonexistent-docker-command-628239' });
  try {
    const result = await runner.execute({ problemId: '704', lessonVersion: LESSON_VERSION, mode: 'run', source: correct, input: { nums: [1, 4], target: 4 } });
    expect(RunResultSchema.safeParse(result).success).toBe(true);
    expect(result.status).toBe('RUNNER_UNAVAILABLE');
    expect(result.phase).toBe('infrastructure');
    expect(result.cases).toEqual([]);
    expect(result.timings.compileMs).toBe(0);
    expect(result.timings.executeMs).toBe(0);
    expect(result.stdout).toBe('');
  } finally { await runner.close(); }
});
