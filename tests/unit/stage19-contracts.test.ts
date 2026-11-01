import { describe, expect, it } from 'vitest';
import {
  LastWordInputSchema, PlusOneInputSchema, PROBLEM_ORDER, RunRequestSchema,
  TreeInputSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('58/66/110 input and judging contracts', () => {
  it('appends versions without changing the first 46 courses', () => {
    expect(PROBLEM_ORDER).toHaveLength(49);
    expect(PROBLEM_ORDER.slice(46)).toEqual(['58', '66', '110']);
    for (const [id, input] of [
      ['58', { s: ' a  ' }], ['66', { digits: [9] }], ['110', { root: [] }],
    ] as const) {
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('requires a real last word and counts only its letters', () => {
    for (const [s, length] of [['Hello World', 5], [' a  ', 1], ['ABC', 3], ['one  two three ', 5], ['   Z', 1]] as const) {
      expect(expectedOutput('58', { s })).toEqual({ kind: 'int', value: length });
      expect(judgeProblemOutput('58', { s }, { kind: 'int', value: length + 1 }).passed).toBe(false);
    }
    for (const s of ['', '   ', 'hi\tthere', '你好']) expect(LastWordInputSchema.safeParse({ s }).success).toBe(false);
  });

  it('handles digit carry, array length, and leading zero validation', () => {
    for (const [digits, values] of [
      [[0], [1]], [[1, 2, 3], [1, 2, 4]], [[1, 2, 9], [1, 3, 0]],
      [[9], [1, 0]], [[9, 9, 9], [1, 0, 0, 0]],
    ] as const) {
      expect(expectedOutput('66', { digits: [...digits] })).toEqual({ kind: 'int-array', values });
      expect(judgeProblemOutput('66', { digits: [...digits] }, { kind: 'int-array', values: [...digits] }).passed).toBe(false);
    }
    expect(PlusOneInputSchema.safeParse({ digits: [0, 1] }).success).toBe(false);
    expect(PlusOneInputSchema.safeParse({ digits: [1, 10] }).success).toBe(false);
    expect(PlusOneInputSchema.safeParse({ digits: [] }).success).toBe(false);
  });

  it('checks balance at every subtree, including a balanced root with an unbalanced child', () => {
    for (const [root, balanced] of [
      [[], true], [[1], true], [[1, 2, 3], true], [[1, 2, null, 3], false],
      [[1, 2, 3, 4, null, null, 5, 6], false],
      [[1, 2, 3, 4, 5, 6, 7], true],
    ] as const) {
      const input = TreeInputSchema.parse({ root });
      expect(expectedOutput('110', input)).toEqual({ kind: 'boolean', value: balanced });
      expect(judgeProblemOutput('110', input, { kind: 'boolean', value: !balanced }).passed).toBe(false);
    }
  });
});
