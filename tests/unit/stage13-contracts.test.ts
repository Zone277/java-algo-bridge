import { describe, expect, it } from 'vitest';
import { PivotIndexInputSchema, NearbyDuplicateInputSchema, SubarraySumInputSchema, expectedOutput, judgeProblemOutput, RunRequestSchema } from '@jab/contracts';

function pivot(nums: number[]): number {
  return nums.findIndex((_, i) => nums.slice(0, i).reduce((a, b) => a + b, 0) === nums.slice(i + 1).reduce((a, b) => a + b, 0));
}
function nearby(nums: number[], k: number): boolean {
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] === nums[j] && j - i <= k) return true;
  return false;
}
function countSubarrays(nums: number[], k: number): number {
  let result = 0;
  for (let start = 0; start < nums.length; start++) {
    let sum = 0;
    for (let end = start; end < nums.length; end++) { sum += nums[end]!; if (sum === k) result++; }
  }
  return result;
}

describe('724/219/560 strict inputs and independent expected values', () => {
  it('enforces each published range and rejects extra keys and outdated versions', () => {
    for (const nums of [[], [1001], [-1001], Array<number>(10001).fill(0)]) expect(PivotIndexInputSchema.safeParse({ nums }).success).toBe(false);
    for (const input of [{ nums: [], k: 0 }, { nums: [1000000001], k: 0 }, { nums: [1], k: -1 }, { nums: [1], k: 100001 }, { nums: Array<number>(10001).fill(0), k: 0 }]) expect(NearbyDuplicateInputSchema.safeParse(input).success).toBe(false);
    for (const input of [{ nums: [], k: 0 }, { nums: [1001], k: 0 }, { nums: [0], k: -10000001 }, { nums: [0], k: 10000001 }, { nums: Array<number>(10001).fill(0), k: 0 }]) expect(SubarraySumInputSchema.safeParse(input).success).toBe(false);
    for (const [problemId, input] of [['724', { nums: [0] }], ['219', { nums: [0], k: 0 }], ['560', { nums: [0], k: 0 }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, mode: 'run', source: 'class Solution {}', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, mode: 'run', source: 'class Solution {}', input: { ...input, expected: 1 } }).success).toBe(false);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v0`, mode: 'submit', source: 'class Solution {}' }).success).toBe(false);
    }
  });

  it('requires the leftmost pivot and excludes the center from both sums', () => {
    expect(expectedOutput('724', { nums: [9] })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('724', { nums: [0, 0, 0] })).toEqual({ kind: 'int', value: 0 });
    expect(judgeProblemOutput('724', { nums: [0, 0, 0] }, { kind: 'int', value: 2 }).passed).toBe(false);
    expect(expectedOutput('724', { nums: [5, -2, 2] })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('724', { nums: [2, -2, 5] })).toEqual({ kind: 'int', value: 2 });
    expect(expectedOutput('724', { nums: [1, 2] })).toEqual({ kind: 'int', value: -1 });
  });

  it('uses distinct positions, inclusive distance and the nearest repeated position', () => {
    expect(expectedOutput('219', { nums: [1, 1], k: 0 })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('219', { nums: [4, 2, 4], k: 2 })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('219', { nums: [4, 2, 4], k: 1 })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('219', { nums: [4, 1, 2, 4, 4], k: 1 })).toEqual({ kind: 'boolean', value: true });
  });

  it('counts nonempty continuous segments with multiplicity and negative numbers', () => {
    expect(expectedOutput('560', { nums: [0, 0, 0], k: 0 })).toEqual({ kind: 'int', value: 6 });
    expect(expectedOutput('560', { nums: [1, -1, 1], k: 1 })).toEqual({ kind: 'int', value: 3 });
    expect(expectedOutput('560', { nums: [1, 2, 3], k: 4 })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('560', { nums: [1], k: 0 })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('560', { nums: [-2, -1, -2], k: -3 })).toEqual({ kind: 'int', value: 2 });
  });

  it('agrees with direct exhaustive definitions on 200 seeded small arrays', () => {
    let seed = 20261023;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 200; sample++) {
      const nums = Array.from({ length: 1 + random() % 12 }, () => random() % 11 - 5);
      const k = random() % 15 - 7;
      expect(expectedOutput('724', { nums })).toEqual({ kind: 'int', value: pivot(nums) });
      expect(expectedOutput('219', { nums, k: Math.abs(k) })).toEqual({ kind: 'boolean', value: nearby(nums, Math.abs(k)) });
      expect(expectedOutput('560', { nums, k })).toEqual({ kind: 'int', value: countSubarrays(nums, k) });
    }
  });

  it('handles maximum input sizes and result counts within Java int', () => {
    expect(expectedOutput('724', { nums: Array<number>(10000).fill(1000) })).toEqual({ kind: 'int', value: -1 });
    expect(expectedOutput('219', { nums: [-1000000000, 1000000000, -1000000000], k: 100000 })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('219', { nums: Array.from({ length: 10000 }, (_, i) => i), k: 100000 })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('560', { nums: Array<number>(10000).fill(0), k: 0 })).toEqual({ kind: 'int', value: 50005000 });
    expect(expectedOutput('560', { nums: Array<number>(10000).fill(1000), k: 10000000 })).toEqual({ kind: 'int', value: 1 });
  });
});
