import { describe, expect, it } from 'vitest';
import {
  JAVA_INT_MAX, JAVA_INT_MIN, PROBLEM_ORDER, PalindromeNumberInputSchema, PathSumInputSchema,
  RunRequestSchema, TreeInputSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('9/101/112 frozen input and judging contracts', () => {
  it('appends three new versions without changing the prior order', () => {
    expect(PROBLEM_ORDER).toHaveLength(46);
    expect(PROBLEM_ORDER.slice(40, 43)).toEqual(['145', '231', '383']);
    expect(PROBLEM_ORDER.slice(43)).toEqual(['9', '101', '112']);
    for (const [problemId, input] of [
      ['9', { x: 121 }], ['101', { root: [1, 2, 2] }],
      ['112', { root: [1, 2], targetSum: 3 }],
    ] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('judges signed 32-bit palindrome numbers, including zero and overflow edges', () => {
    for (const [x, value] of [[JAVA_INT_MIN, false], [-121, false], [0, true], [1, true], [10, false], [121, true], [2147447412, true], [JAVA_INT_MAX, false]] as const) {
      expect(expectedOutput('9', { x })).toEqual({ kind: 'boolean', value });
      expect(judgeProblemOutput('9', { x }, { kind: 'boolean', value: !value }).passed).toBe(false);
    }
    expect(PalindromeNumberInputSchema.safeParse({ x: JAVA_INT_MAX + 1 }).success).toBe(false);
    expect(PalindromeNumberInputSchema.safeParse({ x: 1.2 }).success).toBe(false);
  });

  it('compares mirror positions and null structure, not just values', () => {
    for (const [root, value] of [
      [[], true], [[1], true], [[1, 2, 2, 3, 4, 4, 3], true],
      [[1, 2, 2, null, 3, null, 3], false], [[1, 2, 2, 3, null, 3], false],
      [[1, 1, 1, 2, 3, 3, 2], true],
    ] as const) {
      const input = TreeInputSchema.parse({ root });
      expect(expectedOutput('101', input)).toEqual({ kind: 'boolean', value });
      expect(judgeProblemOutput('101', input, { kind: 'boolean', value: !value }).passed).toBe(false);
    }
  });

  it('requires a complete root-to-leaf sum and validates target bounds', () => {
    for (const [root, targetSum, value] of [
      [[], 0, false], [[1], 1, true], [[1, 2], 1, false],
      [[1, 2, 3], 4, true], [[1, -2, -3], -1, true],
      [[1, 2, 3, null, 4], 7, true], [[1, 2, 3, null, 4], 3, false],
    ] as const) {
      const input = PathSumInputSchema.parse({ root, targetSum });
      expect(expectedOutput('112', input)).toEqual({ kind: 'boolean', value });
      expect(judgeProblemOutput('112', input, { kind: 'boolean', value: !value }).passed).toBe(false);
    }
    expect(PathSumInputSchema.safeParse({ root: [1], targetSum: 1001 }).success).toBe(false);
    expect(PathSumInputSchema.safeParse({ root: [1, null, null, 2], targetSum: 1 }).success).toBe(false);
  });
});
