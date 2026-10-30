import { describe, expect, it } from 'vitest';
import {
  CountingBitsInputSchema, MissingNumberInputSchema, PROBLEM_ORDER, RunRequestSchema, TreeInputSchema,
  expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('94/268/338 frozen input and judging contracts', () => {
  it('preserves 37 prior topics and binds the three new run variants', () => {
    expect(PROBLEM_ORDER).toHaveLength(43);
    expect(PROBLEM_ORDER.slice(34, 37)).toEqual(['69', '122', '144']);
    expect(PROBLEM_ORDER.slice(37, 40)).toEqual(['94', '268', '338']);
    for (const [problemId, input] of [['94', { root: [1, null, 2] }], ['268', { nums: [3, 0, 1] }], ['338', { n: 5 }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('rejects malformed missing-number and counting-bits inputs', () => {
    for (const nums of [[], [0, 0], [1, 1], [0, 3], [-1], [10001]]) expect(MissingNumberInputSchema.safeParse({ nums }).success).toBe(false);
    expect(MissingNumberInputSchema.safeParse({ nums: [3, 0, 1], extra: 1 }).success).toBe(false);
    for (const n of [-1, 10000, 2.5]) expect(CountingBitsInputSchema.safeParse({ n }).success).toBe(false);
    expect(CountingBitsInputSchema.safeParse({ n: 2, extra: true }).success).toBe(false);
    expect(MissingNumberInputSchema.parse({ nums: [0] })).toEqual({ nums: [0] });
    expect(CountingBitsInputSchema.parse({ n: 9999 })).toEqual({ n: 9999 });
  });

  it('uses compact tree positions and visits left, root, right without merging equal-valued nodes', () => {
    const inputs = [
      [{ root: [] }, []],
      [{ root: [1, null, 2, 3] }, [1, 3, 2]],
      [{ root: [5, 5, 5, 5, null, null, 5] }, [5, 5, 5, 5, 5]],
      [{ root: [1, 2, 3, 4, 5, null, 8, null, null, 6, 7, 9] }, [4, 2, 6, 5, 7, 1, 3, 9, 8]],
    ] as const;
    for (const [input, values] of inputs) {
      const parsed = TreeInputSchema.parse(input);
      expect(expectedOutput('94', parsed)).toEqual({ kind: 'int-array', values });
      if (values.length > 1) expect(judgeProblemOutput('94', parsed, { kind: 'int-array', values: values.slice(1) }).passed).toBe(false);
    }
  });

  it('finds every missing position in short permutations, independent of element order', () => {
    for (let n = 1; n <= 15; n++) for (let missing = 0; missing <= n; missing++) {
      const nums = Array.from({ length: n + 1 }, (_, value) => value).filter(value => value !== missing).reverse();
      expect(expectedOutput('268', { nums })).toEqual({ kind: 'int', value: missing });
      expect(judgeProblemOutput('268', { nums }, { kind: 'int', value: (missing + 1) % (n + 1) }).passed).toBe(false);
    }
  });

  it('counts binary ones including zero and exact n+1 output length', () => {
    for (let n = 0; n <= 100; n++) {
      const output = expectedOutput('338', { n });
      expect(output.kind).toBe('int-array');
      if (output.kind !== 'int-array') throw new Error('338 must return int-array');
      expect(output.values).toHaveLength(n + 1);
      for (let value = 0; value <= n; value++) expect(output.values[value]).toBe(value.toString(2).replaceAll('0', '').length);
      expect(judgeProblemOutput('338', { n }, { kind: 'int-array', values: output.values.slice(1) }).passed).toBe(false);
    }
    expect(expectedOutput('338', { n: 9999 }).kind).toBe('int-array');
  });
});
