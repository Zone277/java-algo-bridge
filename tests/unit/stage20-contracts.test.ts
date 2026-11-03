import { describe, expect, it } from 'vitest';
import {
  LinkedListCycleInputSchema, PROBLEM_ORDER, RemoveDuplicatesInputSchema, RunRequestSchema,
  SameTreeInputSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('26/100/141 input and judging contracts', () => {
  it('appends three versions without changing the first 49 courses', () => {
    expect(PROBLEM_ORDER.length).toBeGreaterThanOrEqual(52);
    expect(PROBLEM_ORDER.slice(0, 49)).toHaveLength(49);
    expect(PROBLEM_ORDER.slice(49, 52)).toEqual(['26', '100', '141']);
    for (const [id, input] of [
      ['26', { nums: [1, 1, 2] }],
      ['100', { p: [1], q: [1] }],
      ['141', { head: [1, 2], pos: 0 }],
    ] as const) {
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('validates sorted input and judges only the returned in-place prefix for 26', () => {
    const input = RemoveDuplicatesInputSchema.parse({ nums: [-2, -2, 0, 0, 3] });
    expect(expectedOutput('26', input)).toEqual({ kind: 'int-array', values: [-2, 0, 3] });
    expect(judgeProblemOutput('26', input, { kind: 'int-array', values: [-2, 0, 3] }).passed).toBe(true);
    expect(judgeProblemOutput('26', input, { kind: 'int-array', values: [-2, 0, 3, 0, 3] }).passed).toBe(false);
    expect(judgeProblemOutput('26', input, { kind: 'int-array', values: [-2, 3, 0] }).passed).toBe(false);
    for (const nums of [[], [2, 1], [-101], [101]]) expect(RemoveDuplicatesInputSchema.safeParse({ nums }).success).toBe(false);
  });

  it('compares both tree structure and values for 100', () => {
    for (const [input, same] of [
      [{ p: [], q: [] }, true],
      [{ p: [1, 2], q: [1, 2] }, true],
      [{ p: [1, 2], q: [1, null, 2] }, false],
      [{ p: [1, 7, 7, 7], q: [1, 7, 7, null, null, 7] }, false],
      [{ p: [-10000], q: [10000] }, false],
    ] as const) {
      const parsed = SameTreeInputSchema.parse(input);
      expect(expectedOutput('100', parsed)).toEqual({ kind: 'boolean', value: same });
      expect(judgeProblemOutput('100', parsed, { kind: 'boolean', value: !same }).passed).toBe(false);
    }
    expect(SameTreeInputSchema.safeParse({ p: [null], q: [] }).success).toBe(false);
    expect(SameTreeInputSchema.safeParse({ p: [1, null, null, 2], q: [1] }).success).toBe(false);
  });

  it('uses pos only to build a trusted graph and detects object cycles for 141', () => {
    for (const [input, cyclic] of [
      [{ head: [], pos: -1 }, false],
      [{ head: [7], pos: -1 }, false],
      [{ head: [7], pos: 0 }, true],
      [{ head: [5, 5, 5], pos: -1 }, false],
      [{ head: [3, 2, 0, -4], pos: 1 }, true],
    ] as const) {
      const parsed = LinkedListCycleInputSchema.parse(input);
      expect(expectedOutput('141', parsed)).toEqual({ kind: 'boolean', value: cyclic });
      expect(judgeProblemOutput('141', parsed, { kind: 'boolean', value: !cyclic }).passed).toBe(false);
    }
    for (const input of [
      { head: [], pos: 0 }, { head: [1], pos: 1 }, { head: [1], pos: -2 },
    ]) expect(LinkedListCycleInputSchema.safeParse(input).success).toBe(false);
  });
});
