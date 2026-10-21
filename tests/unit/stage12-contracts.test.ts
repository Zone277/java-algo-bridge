import { describe, expect, it } from 'vitest';
import { RotatedSearchInputSchema, IsSubsequenceInputSchema, CoinChangeInputSchema, expectedOutput, RunRequestSchema } from '@jab/contracts';

function bruteSubsequence(s: string, t: string): boolean {
  for (let mask = 0; mask < 2 ** t.length; mask++) {
    let selected = '';
    for (let i = 0; i < t.length; i++) if (mask & (1 << i)) selected += t[i];
    if (selected === s) return true;
  }
  return false;
}
function bruteCoins(coins: number[], amount: number, index = 0): number {
  if (amount === 0) return 0;
  if (index === coins.length) return Infinity;
  let best = Infinity;
  for (let count = 0; count * coins[index]! <= amount; count++) best = Math.min(best, count + bruteCoins(coins, amount - count * coins[index]!, index + 1));
  return best;
}

describe('33/392/322 input contracts and independent trusted judges', () => {
  it('rejects invalid rotation order, duplicates and limits without rejecting unrotated input', () => {
    for (const nums of [[], [1, 1], [2, 1, 3], [3, 2, 1], [-10001], Array.from({ length: 5001 }, (_, i) => i)]) {
      expect(RotatedSearchInputSchema.safeParse({ nums, target: 0 }).success).toBe(false);
    }
    expect(RotatedSearchInputSchema.safeParse({ nums: [1], target: 10001 }).success).toBe(false);
    for (const nums of [[1], [1, 2, 3], [2, 3, 1], [3, 1, 2]]) expect(RotatedSearchInputSchema.safeParse({ nums, target: 2 }).success).toBe(true);
  });

  it('accepts empty lowercase subsequences and bounded positive coin denominations', () => {
    expect(IsSubsequenceInputSchema.safeParse({ s: '', t: '' }).success).toBe(true);
    for (const input of [{ s: 'A', t: 'a' }, { s: 'a ', t: 'abc' }, { s: 'a'.repeat(101), t: 'a' }, { s: '', t: 'a'.repeat(10001) }]) expect(IsSubsequenceInputSchema.safeParse(input).success).toBe(false);
    for (const input of [{ coins: [], amount: 0 }, { coins: [0], amount: 1 }, { coins: [-1], amount: 1 }, { coins: [2147483648], amount: 1 }, { coins: Array<number>(13).fill(1), amount: 1 }, { coins: [1], amount: -1 }, { coins: [1], amount: 10001 }]) expect(CoinChangeInputSchema.safeParse(input).success).toBe(false);
    expect(CoinChangeInputSchema.safeParse({ coins: [2, 2, 2147483647], amount: 0 }).success).toBe(true);
    for (const [problemId, input] of [['33', { nums: [1], target: 1 }], ['392', { s: '', t: '' }], ['322', { coins: [1], amount: 0 }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, mode: 'run', source: 'class Solution {}', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, mode: 'run', source: 'class Solution {}', input: { ...input, expected: 1 } }).success).toBe(false);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v0`, mode: 'submit', source: 'class Solution {}' }).success).toBe(false);
    }
  });

  it('preserves order rather than contiguity or set membership, and unlimited coin use rather than greedy selection', () => {
    expect(expectedOutput('392', { s: 'ac', t: 'abc' })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('392', { s: 'ca', t: 'abc' })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('392', { s: 'aa', t: 'a' })).toEqual({ kind: 'boolean', value: false });
    expect(expectedOutput('322', { coins: [1, 3, 4], amount: 6 })).toEqual({ kind: 'int', value: 2 });
    expect(expectedOutput('322', { coins: [2], amount: 3 })).toEqual({ kind: 'int', value: -1 });
    expect(expectedOutput('322', { coins: [2], amount: 6 })).toEqual({ kind: 'int', value: 3 });
    expect(expectedOutput('322', { coins: [2147483647], amount: 0 })).toEqual({ kind: 'int', value: 0 });
  });

  it('checks seeded inputs against exhaustive subsequences and coin multiplicities', () => {
    let seed = 20261021;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let sample = 0; sample < 160; sample++) {
      const sorted = Array.from({ length: 1 + random() % 12 }, (_, i) => i * 3 - 20);
      const pivot = random() % sorted.length;
      const nums = [...sorted.slice(pivot), ...sorted.slice(0, pivot)];
      const target = sample % 2 ? 99 : nums[random() % nums.length]!;
      expect(expectedOutput('33', { nums, target })).toEqual({ kind: 'int', value: nums.findIndex(value => value === target) });
      const t = Array.from({ length: random() % 9 }, () => 'abc'[random() % 3]).join('');
      const s = Array.from({ length: random() % 5 }, () => 'abc'[random() % 3]).join('');
      expect(expectedOutput('392', { s, t })).toEqual({ kind: 'boolean', value: bruteSubsequence(s, t) });
      const coins = Array.from({ length: 1 + random() % 4 }, () => 1 + random() % 8);
      const amount = random() % 25;
      const minimum = bruteCoins(coins, amount);
      expect(expectedOutput('322', { coins, amount })).toEqual({ kind: 'int', value: Number.isFinite(minimum) ? minimum : -1 });
    }
  });

  it('handles full-size inputs and an int-maximum denomination without overflow', () => {
    expect(expectedOutput('33', { nums: Array.from({ length: 5000 }, (_, i) => i - 5000), target: -1 })).toEqual({ kind: 'int', value: 4999 });
    expect(expectedOutput('392', { s: 'a'.repeat(100), t: 'a'.repeat(10000) })).toEqual({ kind: 'boolean', value: true });
    expect(expectedOutput('322', { coins: [2147483647, 1], amount: 10000 })).toEqual({ kind: 'int', value: 10000 });
    expect(expectedOutput('322', { coins: [2147483647, 2], amount: 9999 })).toEqual({ kind: 'int', value: -1 });
  });
});
