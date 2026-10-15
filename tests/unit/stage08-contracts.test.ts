import { describe, expect, it } from 'vitest';
import {
  MaximumSubarrayInputSchema, TwoSumSortedInputSchema, ValidAnagramInputSchema,
  expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('53, 167 and 242 trusted judging contracts', () => {
  it('requires a nonempty contiguous subarray even when every value is negative', () => {
    const input = MaximumSubarrayInputSchema.parse({ nums: [-7, -2, -9] });
    expect(expectedOutput('53', input)).toEqual({ kind: 'int', value: -2 });
    expect(judgeProblemOutput('53', input, { kind: 'int', value: 0 }).passed).toBe(false);
    expect(judgeProblemOutput('53', input, { kind: 'int', value: -2 }).passed).toBe(true);
    expect(MaximumSubarrayInputSchema.safeParse({ nums: [] }).success).toBe(false);
  });

  it('enforces sorted input, one pair, ordered one-based indices and distinct positions', () => {
    expect(TwoSumSortedInputSchema.safeParse({ numbers: [7, 2], target: 9 }).success).toBe(false);
    expect(TwoSumSortedInputSchema.safeParse({ numbers: [1, 2, 3, 4], target: 5 }).success).toBe(false);
    expect(TwoSumSortedInputSchema.safeParse({ numbers: [2, 2, 2], target: 4 }).success).toBe(false);
    const input = TwoSumSortedInputSchema.parse({ numbers: [-3, -1, 4, 8], target: 3 });
    expect(expectedOutput('167', input)).toEqual({ kind: 'int-array', values: [2, 3] });
    for (const values of [[1, 2], [3, 2], [2, 2], [0, 3], [2, 5]]) {
      expect(judgeProblemOutput('167', input, { kind: 'int-array', values }).passed, String(values)).toBe(false);
    }
    expect(judgeProblemOutput('167', input, { kind: 'int-array', values: [2, 3] }).passed).toBe(true);
  });

  it('checks multiplicity rather than character membership alone', () => {
    const input = ValidAnagramInputSchema.parse({ s: 'aab', t: 'abb' });
    expect(expectedOutput('242', input)).toEqual({ kind: 'boolean', value: false });
    expect(judgeProblemOutput('242', input, { kind: 'boolean', value: true }).passed).toBe(false);
    expect(expectedOutput('242', { s: 'listen', t: 'silent' })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('242', { s: 'abc', t: 'ab' })).toEqual({ kind: 'boolean', value: false });
    expect(ValidAnagramInputSchema.safeParse({ s: 'Ab', t: 'ba' }).success).toBe(false);
  });
});
