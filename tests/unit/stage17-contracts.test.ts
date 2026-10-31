import { describe, expect, it } from 'vitest';
import {
  JAVA_INT_MAX, JAVA_INT_MIN, PROBLEM_ORDER, PowerOfTwoInputSchema, RansomNoteInputSchema,
  RunRequestSchema, TreeInputSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('145/231/383 input and judging contracts', () => {
  it('preserves the previous 40 topics and binds three new run variants', () => {
    expect(PROBLEM_ORDER).toHaveLength(46);
    expect(PROBLEM_ORDER.slice(37, 40)).toEqual(['94', '268', '338']);
    expect(PROBLEM_ORDER.slice(40, 43)).toEqual(['145', '231', '383']);
    for (const [problemId, input] of [['145', { root: [1, null, 2, 3] }], ['231', { n: JAVA_INT_MIN }], ['383', { ransomNote: 'aa', magazine: 'aab' }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('enforces signed Java int and lowercase string site limits', () => {
    for (const n of [JAVA_INT_MIN - 1, JAVA_INT_MAX + 1, 1.5, '8']) expect(PowerOfTwoInputSchema.safeParse({ n }).success).toBe(false);
    for (const input of [{ ransomNote: '', magazine: 'a' }, { ransomNote: 'A', magazine: 'a' }, { ransomNote: 'a', magazine: '' }, { ransomNote: 'a', magazine: 'a', extra: true }]) expect(RansomNoteInputSchema.safeParse(input).success).toBe(false);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'a'.repeat(10001), magazine: 'a' }).success).toBe(false);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'a'.repeat(10000), magazine: 'a'.repeat(10000) }).success).toBe(true);
  });

  it('visits compact tree left-right-root without merging equal-valued objects', () => {
    const samples = [
      [{ root: [] }, []],
      [{ root: [1, null, 2, 3] }, [3, 2, 1]],
      [{ root: [5, 5, 5, 5, null, null, 5] }, [5, 5, 5, 5, 5]],
      [{ root: [1, 2, 3, 4, 5, null, 8, null, null, 6, 7, 9] }, [4, 6, 7, 5, 2, 9, 8, 3, 1]],
    ] as const;
    for (const [input, values] of samples) {
      const parsed = TreeInputSchema.parse(input);
      expect(expectedOutput('145', parsed)).toEqual({ kind: 'int-array', values });
      if (values.length) expect(judgeProblemOutput('145', parsed, { kind: 'int-array', values: values.slice(1) }).passed).toBe(false);
    }
  });

  it('handles zero, negative int, powers and neighbors', () => {
    for (const n of [JAVA_INT_MIN, -1024, -1, 0, 3, 5, 6, JAVA_INT_MAX]) expect(expectedOutput('231', { n })).toEqual({ kind: 'boolean', value: false });
    for (let bit = 0; bit <= 30; bit++) {
      const n = 2 ** bit;
      expect(expectedOutput('231', { n })).toEqual({ kind: 'boolean', value: true });
      expect(judgeProblemOutput('231', { n }, { kind: 'boolean', value: false }).passed).toBe(false);
    }
  });

  it('consumes magazine letters with multiplicity, independent of order', () => {
    for (const [ransomNote, magazine, value] of [
      ['a', 'b', false], ['aa', 'aab', true], ['aa', 'ab', false], ['abc', 'cba', true],
      ['abc', 'abcc', true], ['zzz', 'zz', false], ['a'.repeat(10000), 'a'.repeat(10000), true],
    ] as const) {
      expect(expectedOutput('383', { ransomNote, magazine })).toEqual({ kind: 'boolean', value });
      expect(judgeProblemOutput('383', { ransomNote, magazine }, { kind: 'boolean', value: !value }).passed).toBe(false);
    }
  });
});
