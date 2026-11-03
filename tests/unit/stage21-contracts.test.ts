import { describe, expect, it } from 'vitest';
import {
  IsomorphicStringsInputSchema, PROBLEM_ORDER, RemoveElementInputSchema, RunRequestSchema,
  TreeInputSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('27/111/205 input and judging contracts', () => {
  it('appends three versions while preserving the first 52 courses', () => {
    expect(PROBLEM_ORDER).toHaveLength(55);
    expect(PROBLEM_ORDER.slice(52)).toEqual(['27', '111', '205']);
    for (const [id, input] of [
      ['27', { nums: [3, 2, 2, 3], val: 3 }],
      ['111', { root: [3, 9, 20, null, null, 15, 7] }],
      ['205', { s: 'egg', t: 'add' }],
    ] as const) {
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('accepts any valid ordering of the retained prefix for 27', () => {
    const input = RemoveElementInputSchema.parse({ nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 });
    expect(expectedOutput('27', input)).toEqual({ kind: 'int-array', values: [0, 1, 3, 0, 4] });
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [4, 0, 3, 1, 0] }).passed).toBe(true);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [0, 1, 3, 4] }).passed).toBe(false);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [0, 1, 3, 4, 2] }).passed).toBe(false);
    expect(judgeProblemOutput('27', input, { kind: 'int-array', values: [0, 1, 3, 4, 4] }).passed).toBe(false);
    expect(RemoveElementInputSchema.safeParse({ nums: [], val: 7 }).success).toBe(true);
    expect(RemoveElementInputSchema.safeParse({ nums: [101], val: 0 }).success).toBe(false);
  });

  it('finds the nearest leaf rather than treating a missing child as depth zero for 111', () => {
    for (const [root, depth] of [
      [[], 0], [[1], 1], [[1, 2], 2], [[1, null, 2, null, 3], 3],
      [[3, 9, 20, null, null, 15, 7], 2], [[1, 2, 3, 4, null, null, 5], 3],
    ] as const) {
      const input = TreeInputSchema.parse({ root });
      expect(expectedOutput('111', input)).toEqual({ kind: 'int', value: depth });
      expect(judgeProblemOutput('111', input, { kind: 'int', value: depth }).passed).toBe(true);
    }
  });

  it('requires a two-way one-to-one character mapping for 205', () => {
    for (const [input, value] of [
      [{ s: 'egg', t: 'add' }, true],
      [{ s: 'foo', t: 'bar' }, false],
      [{ s: 'badc', t: 'baba' }, false],
      [{ s: 'paper', t: 'title' }, true],
      [{ s: ' ! ', t: ' # ' }, true],
    ] as const) {
      const parsed = IsomorphicStringsInputSchema.parse(input);
      expect(expectedOutput('205', parsed)).toEqual({ kind: 'boolean', value });
      expect(judgeProblemOutput('205', parsed, { kind: 'boolean', value }).passed).toBe(true);
    }
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'ab', t: 'a' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: '', t: '' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'é', t: 'a' }).success).toBe(false);
  });
});
