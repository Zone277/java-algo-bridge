import { describe, expect, it } from 'vitest';
import { BinarySearchInputSchema, LESSON_VERSION, RunRequestSchema } from '../../packages/contracts/src/index.js';
import { correct } from '../fixtures/java.js';

const valid = { problemId: '704', lessonVersion: LESSON_VERSION, mode: 'run', source: correct, input: { nums: [-17, -2, 9, 32], target: 9 } };
describe('strict 704 boundary contracts', () => {
  it('accepts run and server-owned submit', () => {
    expect(RunRequestSchema.safeParse(valid).success).toBe(true);
    expect(RunRequestSchema.safeParse({ problemId: valid.problemId, lessonVersion: valid.lessonVersion, source: valid.source, mode: 'submit' }).success).toBe(true);
  });
  it.each([
    { nums: [], target: 0 }, { nums: [1, 1], target: 1 }, { nums: [2, 1], target: 1 },
    { nums: [1.5], target: 1 }, { nums: [NaN], target: 1 }, { nums: [1], target: Infinity },
    { nums: [10000], target: 1 }, { nums: [1], target: -10000 }, { nums: [1], target: 1, expected: 0 },
  ])('rejects out-of-contract input %j', input => {
    expect(BinarySearchInputSchema.safeParse(input).success).toBe(false);
  });
  it.each([
    { ...valid, sourceHash: 'a'.repeat(64) }, { ...valid, expected: 2 }, { ...valid, mode: 'submit' },
    { ...valid, lessonVersion: 'stale' }, { ...valid, problemId: '206' },
    { ...valid, source: '汉'.repeat(21846) }, { ...valid, source: '' },
  ])('rejects spoofed/stale/oversize request', request => {
    expect(RunRequestSchema.safeParse(request).success).toBe(false);
  });
});
