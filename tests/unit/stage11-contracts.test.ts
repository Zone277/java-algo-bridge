import { describe, expect, it } from 'vitest';
import {
  RotatedMinimumInputSchema, SingleNumberInputSchema, MinCostStairsInputSchema,
  RunRequestSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

function bruteStairs(cost: number[]) {
  const walk = (i: number): number => i >= cost.length ? 0 : cost[i]! + Math.min(walk(i + 1), walk(i + 2));
  return Math.min(walk(0), walk(1));
}

describe('153, 136 and 746 trusted contracts', () => {
  it('rejects malformed rotations including a single linear descent with invalid wrap order', () => {
    for (const nums of [[], [1, 1], [2, 1, 3], [3, 2, 1], [5001], [-5001], Array.from({ length: 5001 }, (_, i) => i)]) {
      expect(RotatedMinimumInputSchema.safeParse({ nums }).success, JSON.stringify(nums.slice(0, 5))).toBe(false);
    }
    for (const nums of [[1], [1, 2, 3], [3, 1, 2], [2, 3, 1]]) expect(RotatedMinimumInputSchema.safeParse({ nums }).success).toBe(true);
  });

  it('requires exactly one singleton and only pairs elsewhere, with strict bounded arrays', () => {
    for (const nums of [[], [1, 2], [1, 1], [1, 1, 1], [1, 2, 2, 2, 2], [30001], [-30001], Array<number>(10001).fill(1)]) {
      expect(SingleNumberInputSchema.safeParse({ nums }).success).toBe(false);
    }
    for (const nums of [[0], [-2, 0, -2], [1, 2, 1]]) expect(SingleNumberInputSchema.safeParse({ nums }).success).toBe(true);
    for (const cost of [[], [1], [-1, 2], [1, 1000], [1.5, 2], Array<number>(1001).fill(1)]) {
      expect(MinCostStairsInputSchema.safeParse({ cost }).success).toBe(false);
    }
    expect(MinCostStairsInputSchema.safeParse({ cost: [1, 2], expected: 1 }).success).toBe(false);
    expect(RunRequestSchema.safeParse({ problemId: '153', lessonVersion: '153-v1', mode: 'run', source: 'class Solution {}', input: { nums: [2, 1, 3] } }).success).toBe(false);
  });

  it('judges returned values rather than minimum indices, bit counts or a fixed starting stair', () => {
    expect(expectedOutput('153', { nums: [4, -7, -2] })).toEqual({ kind: 'int', value: -7 });
    expect(expectedOutput('136', { nums: [-9, 2, 2] })).toEqual({ kind: 'int', value: -9 });
    expect(expectedOutput('746', { cost: [8, 2] })).toEqual({ kind: 'int', value: 2 });
    expect(expectedOutput('746', { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] })).toEqual({ kind: 'int', value: 6 });
    expect(judgeProblemOutput('153', { nums: [4, -7, -2] }, { kind: 'int', value: 1 }).passed).toBe(false);
    expect(judgeProblemOutput('136', { nums: [-9, 2, 2] }, { kind: 'int', value: 2 }).passed).toBe(false);
    expect(judgeProblemOutput('746', { cost: [8, 2] }, { kind: 'int', value: 8 }).passed).toBe(false);
  });

  it('cross-checks rotations, singleton permutations and exhaustive stair paths', () => {
    let seed = 20261020;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 160; sample++) {
      const sorted = Array.from({ length: 1 + random() % 12 }, (_, i) => i * 7 - 50);
      const pivot = random() % sorted.length;
      expect(expectedOutput('153', { nums: [...sorted.slice(pivot), ...sorted.slice(0, pivot)] })).toEqual({ kind: 'int', value: -50 });
      const single = 100 + sample;
      const pairs = Array.from({ length: random() % 10 }, (_, i) => i - 20);
      const nums = [...pairs, single, ...pairs];
      for (let i = nums.length - 1; i > 0; i--) { const j = random() % (i + 1); [nums[i], nums[j]] = [nums[j]!, nums[i]!]; }
      expect(expectedOutput('136', { nums })).toEqual({ kind: 'int', value: single });
      const cost = Array.from({ length: 2 + random() % 9 }, () => random() % 30);
      expect(expectedOutput('746', { cost })).toEqual({ kind: 'int', value: bruteStairs(cost) });
    }
  });

  it('preserves safe int arithmetic at site limits', () => {
    expect(expectedOutput('153', { nums: Array.from({ length: 5000 }, (_, i) => i - 5000) })).toEqual({ kind: 'int', value: -5000 });
    const pairs = Array.from({ length: 4999 }, (_, i) => i - 4999);
    expect(expectedOutput('136', { nums: [...pairs, 30000, ...pairs] })).toEqual({ kind: 'int', value: 30000 });
    expect(expectedOutput('746', { cost: Array<number>(1000).fill(999) })).toEqual({ kind: 'int', value: 499500 });
  });
});
