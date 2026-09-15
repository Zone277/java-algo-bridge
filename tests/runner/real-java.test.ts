import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JavaRunner } from '../../apps/api/src/runner.js';
import { LESSON_VERSION, RunResultSchema, type RunRequest } from '../../packages/contracts/src/index.js';
import { correct, linear, wrong, printPassWrong, syntaxError, exception, infinite, outputFlood, mutateInputWrong, exitEarly, outOfMemory } from '../fixtures/java.js';

const runner = new JavaRunner();
const request = (source: string, target = 9): RunRequest => ({ problemId: '704', lessonVersion: LESSON_VERSION, source, mode: 'run', input: { nums: [-17, -2, 9, 32], target } });
beforeAll(async () => {
  const availability = await runner.getAvailability();
  if (!availability.available) throw new Error(`BLOCKED: real Docker execution unavailable: ${availability.reason}`);
});
afterAll(async () => { await runner.close(); });
describe('real isolated Docker javac and java acceptance', () => {
  it('actual output follows changed input; alternative functional algorithm also passes', async () => {
    for (const [source, target, expected] of [[correct, 9, 2], [correct, -17, 0], [correct, 8, -1], [linear, 32, 3]] as const) {
      const result = await runner.execute(request(source, target));
      expect(RunResultSchema.safeParse(result).success).toBe(true);
      expect(result.status).toBe('PASSED_LOCAL_TESTS');
      expect(result.cases[0]?.actual).toEqual({ kind: 'int', value: expected });
      expect(result.sourceHash).toBe(createHash('sha256').update(source).digest('hex'));
      expect(result.origin).toBe('student-java');
      expect(result.cleanup.status).toBe('done');
    }
  });
  it('submit executes the server suite', async () => {
    const result = await runner.execute({ problemId: '704', lessonVersion: LESSON_VERSION, source: correct, mode: 'submit' });
    expect(result.status).toBe('PASSED_LOCAL_TESTS');
    expect(result.cases.length).toBeGreaterThanOrEqual(8);
    expect(result.cases.every(item => item.status === 'PASSED')).toBe(true);
    expect(result.testSuiteVersion).toBeTruthy();
    expect(result.cleanup.status).toBe('done');
  });
  it('later resource/time failure outranks an earlier wrong answer in submit', async () => {
    const source = 'class Solution { public int search(int[] nums, int target) { if (target == 6) { while (true) {} } return -1; } }';
    const result = await runner.execute({ problemId: '704', lessonVersion: LESSON_VERSION, source, mode: 'submit' });
    expect(result.status).toBe('TIME_LIMIT');
    expect(result.cases[0]?.status).toBe('WRONG_ANSWER');
    expect(result.cases[1]?.status).toBe('TIME_LIMIT');
    expect(result.cleanup.status).toBe('done');
  });
  it.each([[wrong, 'wrong result'], [printPassWrong, 'stdout PASS/JSON spoof'], [mutateInputWrong, 'mutated input']] as const)('rejects %s (%s)', async (source, _label) => {
    const result = await runner.execute(request(source));
    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.cases[0]?.expected).toEqual({ kind: 'int', value: 2 });
    expect(result.cleanup.status).toBe('done');
    if (source === printPassWrong) expect(result.stdout).toContain('PASS');
  });
  it('preserves original Solution.java line in javac diagnostics', async () => {
    const result = await runner.execute(request(syntaxError));
    expect(result.status).toBe('COMPILE_ERROR');
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ fileName: 'Solution.java', line: 3, belongsToStudentSource: true, severity: 'error' })]));
    expect(result.cleanup.status).toBe('done');
  });
  it.each([exception, exitEarly])('classifies exception or missing protocol as runtime error', async source => {
    const result = await runner.execute(request(source));
    expect(result.status).toBe('RUNTIME_ERROR');
    expect(result.cleanup.status).toBe('done');
  });
  it('terminates an infinite loop', async () => {
    const result = await runner.execute(request(infinite));
    expect(result.status).toBe('TIME_LIMIT');
    expect(result.phase).toBe('execute');
    expect(result.timings.totalMs).toBeLessThan(40000);
    expect(result.cleanup.status).toBe('done');
  });
  it('bounds real output and reports truncation', async () => {
    const result = await runner.execute(request(outputFlood));
    expect(result.status).toBe('OUTPUT_LIMIT');
    expect(result.output.truncated).toBe(true);
    expect(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(result.limits.outputBytes);
    expect(result.output.stdoutBytes + result.output.stderrBytes).toBeGreaterThan(result.limits.outputBytes);
    expect(result.cleanup.status).toBe('done');
  });
  it('classifies a real heap allocation failure using JVM evidence', async () => {
    const result = await runner.execute(request(outOfMemory));
    expect(result.status).toBe('RESOURCE_LIMIT');
    expect(result.stderr).toContain('OutOfMemoryError');
    expect(result.cleanup.status).toBe('done');
  });
  it('keeps simultaneous request inputs and hashes independent', async () => {
    const requests = [request(correct, -2), request(linear, 32)];
    const results = await Promise.all(requests.map(item => runner.execute(item)));
    expect(results.map(result => result.status)).toEqual(['PASSED_LOCAL_TESTS', 'PASSED_LOCAL_TESTS']);
    expect(results.map(result => result.cases[0]?.actual)).toEqual([{ kind: 'int', value: 1 }, { kind: 'int', value: 3 }]);
    expect(results[0]!.requestId).not.toBe(results[1]!.requestId);
    expect(results[0]!.cases[0]!.inputHash).not.toBe(results[1]!.cases[0]!.inputHash);
    expect(results.every(result => result.cleanup.status === 'done')).toBe(true);
  });
  it('cancels an executing task and still cleans it', async () => {
    const controller = new AbortController();
    const pending = runner.execute(request(infinite), { signal: controller.signal });
    const timer = setTimeout(() => controller.abort(), 1000);
    try {
      const result = await pending;
      expect(result.status).toBe('CANCELLED');
      expect(result.cleanup.status).toBe('done');
    } finally { clearTimeout(timer); }
  });
});
