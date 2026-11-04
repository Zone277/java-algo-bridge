import { describe, expect, it } from 'vitest';
import {
  ArrayIntersectionInputSchema, PROBLEM_ORDER, RemoveLinkedListElementsInputSchema,
  RomanToIntegerInputSchema, RunRequestSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('13/203/349 input and judging contracts', () => {
  it('appends three versions while preserving the first 55 courses', () => {
    expect(PROBLEM_ORDER).toHaveLength(58);
    expect(PROBLEM_ORDER.slice(55)).toEqual(['13', '203', '349']);
    for (const [id, input] of [
      ['13', { s: 'MCMXCIV' }],
      ['203', { head: [1, 2, 6, 3], val: 6 }],
      ['349', { nums1: [1, 2, 2, 1], nums2: [2, 2] }],
    ] as const) {
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'submit' }).success).toBe(true);
    }
  });

  it('accepts only canonical Roman numerals and converts subtractive pairs', () => {
    for (const [s, value] of [['I', 1], ['III', 3], ['IV', 4], ['IX', 9], ['LVIII', 58], ['MCMXCIV', 1994], ['MMMCMXCIX', 3999]] as const) {
      const input = RomanToIntegerInputSchema.parse({ s });
      expect(expectedOutput('13', input)).toEqual({ kind: 'int', value });
      expect(judgeProblemOutput('13', input, { kind: 'int', value }).passed).toBe(true);
    }
    for (const s of ['', 'IIII', 'VX', 'IC', 'xiv', 'MMMM']) expect(RomanToIntegerInputSchema.safeParse({ s }).success).toBe(false);
  });

  it('filters every matching linked-list value without imposing object identity on the verdict', () => {
    for (const [input, values] of [
      [{ head: [], val: 1 }, []],
      [{ head: [7, 7, 7], val: 7 }, []],
      [{ head: [1, 2, 6, 3, 4, 5, 6], val: 6 }, [1, 2, 3, 4, 5]],
      [{ head: [1, 2, 3], val: 0 }, [1, 2, 3]],
    ] as const) {
      const parsed = RemoveLinkedListElementsInputSchema.parse(input);
      expect(expectedOutput('203', parsed)).toEqual({ kind: 'int-array', values });
      expect(judgeProblemOutput('203', parsed, { kind: 'int-array', values: [...values] }).passed).toBe(true);
    }
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [0], val: 0 }).success).toBe(false);
    expect(RemoveLinkedListElementsInputSchema.safeParse({ head: [1], val: 51 }).success).toBe(false);
  });

  it('accepts either ordering for 349 but rejects duplicates, omissions and foreign values', () => {
    const input = ArrayIntersectionInputSchema.parse({ nums1: [4, 9, 5, 4], nums2: [9, 4, 9, 8, 4] });
    expect(expectedOutput('349', input)).toEqual({ kind: 'int-array', values: [4, 9] });
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [9, 4] }).passed).toBe(true);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4, 9, 9] }).passed).toBe(false);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4] }).passed).toBe(false);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4, 8] }).passed).toBe(false);
  });
});
