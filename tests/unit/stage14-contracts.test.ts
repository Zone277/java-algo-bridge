import { describe, expect, it } from 'vitest';
import {
  FirstUniqueCharInputSchema, HappyNumberInputSchema, SearchRangeInputSchema,
  expectedOutput, judgeProblemOutput, PROBLEM_ORDER, RunRequestSchema,
} from '@jab/contracts';

const nextDigitSquare = (start: number) => {
  let value = start; let sum = 0;
  while (value > 0) { const digit = value % 10; sum += digit * digit; value = Math.floor(value / 10); }
  return sum;
};

describe('34/202/387 frozen contracts and independent judges', () => {
  it('keeps the old prefix and validates all new request variants', () => {
    expect(PROBLEM_ORDER.slice(31, 34)).toEqual(['34', '202', '387']);
    for (const [id, input] of [['34', { nums: [], target: 3 }], ['202', { n: 1 }], ['387', { s: 'a' }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId: id, lessonVersion: `${id}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('enforces taught input ranges without changing public algorithm semantics', () => {
    expect(SearchRangeInputSchema.safeParse({ nums: [1, 1, 2], target: 1 }).success).toBe(true);
    expect(SearchRangeInputSchema.safeParse({ nums: [2, 1], target: 1 }).success).toBe(false);
    expect(SearchRangeInputSchema.safeParse({ nums: [], target: 0 }).success).toBe(true);
    expect(HappyNumberInputSchema.safeParse({ n: 0 }).success).toBe(false);
    expect(HappyNumberInputSchema.safeParse({ n: 2147483647 }).success).toBe(true);
    expect(FirstUniqueCharInputSchema.safeParse({ s: 'aBc' }).success).toBe(false);
    expect(FirstUniqueCharInputSchema.safeParse({ s: '' }).success).toBe(false);
  });

  it('checks every small nondecreasing search-range array and rejects malformed outputs', () => {
    const values = [-2, -1, 0, 1, 2];
    const arrays: number[][] = [[]];
    for (let length = 1; length <= 5; length++) {
      const visit = (prefix: number[], minimum: number) => {
        if (prefix.length === length) { arrays.push(prefix); return; }
        for (let index = minimum; index < values.length; index++) visit([...prefix, values[index]!], index);
      };
      visit([], 0);
    }
    for (const nums of arrays) for (let target = -3; target <= 3; target++) {
      const input = SearchRangeInputSchema.parse({ nums, target });
      const matches = nums.flatMap((value, index) => value === target ? [index] : []);
      const expected = matches.length ? [matches[0]!, matches[matches.length - 1]!] : [-1, -1];
      expect(expectedOutput('34', input)).toEqual({ kind: 'int-array', values: expected });
      expect(judgeProblemOutput('34', input, { kind: 'int-array', values: [0] }).passed).toBe(false);
    }
  });

  it('agrees with direct cycle recording for positive integers including the Java int boundary', () => {
    for (const n of [1, 19, 2, 7, 10, 68, 100, 2147483647, ...Array.from({ length: 500 }, (_, index) => index + 1)]) {
      const seen = new Set<number>(); let current = n;
      while (current !== 1 && !seen.has(current)) { seen.add(current); current = nextDigitSquare(current); }
      expect(expectedOutput('202', { n })).toEqual({ kind: 'boolean', value: current === 1 });
    }
  });

  it('finds the leftmost globally unique lower-case character', () => {
    const strings: string[] = [];
    for (let length = 1; length <= 6; length++) {
      const visit = (prefix: string) => {
        if (prefix.length === length) { strings.push(prefix); return; }
        for (const char of 'abc') visit(prefix + char);
      };
      visit('');
    }
    for (const s of strings) {
      const answer = [...s].findIndex(char => s.indexOf(char) === s.lastIndexOf(char));
      expect(expectedOutput('387', { s })).toEqual({ kind: 'int', value: answer });
    }
  });
});
