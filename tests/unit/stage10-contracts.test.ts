import { describe, expect, it } from 'vitest';
import {
  ContainerWaterInputSchema, MinimumSubarrayInputSchema, HouseRobberInputSchema,
  RunRequestSchema, expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

function bruteArea(height: number[]) {
  let best = 0;
  for (let i = 0; i < height.length; i++) for (let j = i + 1; j < height.length; j++) best = Math.max(best, Math.min(height[i]!, height[j]!) * (j - i));
  return best;
}
function bruteLength(nums: number[], target: number) {
  let best = nums.length + 1;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) { sum += nums[j]!; if (sum >= target) best = Math.min(best, j - i + 1); }
  }
  return best > nums.length ? 0 : best;
}
function bruteRob(nums: number[]) {
  let best = 0;
  for (let mask = 0; mask < 2 ** nums.length; mask++) {
    if ((mask & (mask << 1)) !== 0) continue;
    let total = 0;
    for (let i = 0; i < nums.length; i++) if ((mask & (1 << i)) !== 0) total += nums[i]!;
    best = Math.max(best, total);
  }
  return best;
}

describe('11, 209 and 198 trusted input and output contracts', () => {
  it('requires valid sizes, bounds, positive windows and strict fields', () => {
    for (const height of [[], [1], [-1, 2], [1, 10001], Array<number>(10001).fill(1)]) expect(ContainerWaterInputSchema.safeParse({ height }).success).toBe(false);
    for (const input of [{ target: 0, nums: [1] }, { target: 1, nums: [0] }, { target: 2, nums: [-1, 3] }, { target: 1, nums: [] }, { target: 1, nums: [10001] }]) expect(MinimumSubarrayInputSchema.safeParse(input).success).toBe(false);
    for (const nums of [[], [-1], [401], Array<number>(101).fill(1)]) expect(HouseRobberInputSchema.safeParse({ nums }).success).toBe(false);
    expect(HouseRobberInputSchema.safeParse({ nums: [1], expected: 1 }).success).toBe(false);
    expect(RunRequestSchema.safeParse({ problemId: '209', lessonVersion: '209-v1', mode: 'run', source: 'class Solution {}', input: { target: 1, nums: [0] } }).success).toBe(false);
  });

  it('uses shorter wall times distance, contiguous threshold windows and nonadjacent selections', () => {
    expect(expectedOutput('11', { height: [3, 1, 1, 3] })).toEqual({ kind: 'int', value: 9 });
    expect(expectedOutput('11', { height: [0, 0] })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('209', { target: 7, nums: [2, 3, 1, 2, 4, 3] })).toEqual({ kind: 'int', value: 2 });
    expect(expectedOutput('209', { target: 7, nums: [1, 8, 1] })).toEqual({ kind: 'int', value: 1 });
    expect(expectedOutput('209', { target: 9, nums: [2, 2, 2] })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('198', { nums: [2, 1, 1, 2] })).toEqual({ kind: 'int', value: 4 });
    expect(expectedOutput('198', { nums: [0] })).toEqual({ kind: 'int', value: 0 });
    expect(judgeProblemOutput('11', { height: [3, 1, 1, 3] }, { kind: 'int', value: 6 }).passed).toBe(false);
    expect(judgeProblemOutput('209', { target: 7, nums: [1, 8, 1] }, { kind: 'int', value: 0 }).passed).toBe(false);
    expect(judgeProblemOutput('198', { nums: [2, 1, 1, 2] }, { kind: 'int', value: 3 }).passed).toBe(false);
  });

  it('cross-checks all three trusted algorithms against exhaustive small-input oracles', () => {
    let seed = 20261018;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 160; sample++) {
      const height = Array.from({ length: 2 + random() % 9 }, () => random() % 15);
      const nums = Array.from({ length: 1 + random() % 10 }, () => 1 + random() % 9);
      const target = 1 + random() % 70;
      const rewards = Array.from({ length: 1 + random() % 10 }, () => random() % 15);
      expect(expectedOutput('11', { height })).toEqual({ kind: 'int', value: bruteArea(height) });
      expect(expectedOutput('209', { nums, target })).toEqual({ kind: 'int', value: bruteLength(nums, target) });
      expect(expectedOutput('198', { nums: rewards })).toEqual({ kind: 'int', value: bruteRob(rewards) });
    }
  });

  it('preserves Java int arithmetic at the published site limits', () => {
    expect(expectedOutput('11', { height: Array<number>(10000).fill(10000) })).toEqual({ kind: 'int', value: 99990000 });
    expect(expectedOutput('209', { target: 1000000000, nums: Array<number>(10000).fill(10000) })).toEqual({ kind: 'int', value: 0 });
    expect(expectedOutput('209', { target: 100000000, nums: Array<number>(10000).fill(10000) })).toEqual({ kind: 'int', value: 10000 });
    expect(expectedOutput('198', { nums: Array<number>(100).fill(400) })).toEqual({ kind: 'int', value: 20000 });
  });
});
