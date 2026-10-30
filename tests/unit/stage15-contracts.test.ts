import { describe, expect, it } from 'vitest';
import {
  PROBLEM_ORDER, RunRequestSchema, SqrtInputSchema, StockProfitIIInputSchema, TreeInputSchema,
  expectedOutput, judgeProblemOutput,
} from '@jab/contracts';

describe('69/122/144 frozen input and judging contracts', () => {
  it('preserves the previous 34 topics and accepts only matching run variants', () => {
    expect(PROBLEM_ORDER).toHaveLength(43);
    expect(PROBLEM_ORDER.slice(31, 34)).toEqual(['34', '202', '387']);
    expect(PROBLEM_ORDER.slice(34, 37)).toEqual(['69', '122', '144']);
    for (const [problemId, input] of [['69', { x: 8 }], ['122', { prices: [2, 5] }], ['144', { root: [1, null, 2] }]] as const) {
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'run', input }).success).toBe(true);
      expect(RunRequestSchema.safeParse({ problemId, lessonVersion: `${problemId}-v1`, source: 'class Solution {}', mode: 'submit', input }).success).toBe(false);
    }
  });

  it('rejects malformed and out-of-scope inputs', () => {
    for (const input of [{ x: -1 }, { x: 2147483648 }, { x: 2.5 }, { x: 4, extra: 1 }]) expect(SqrtInputSchema.safeParse(input).success).toBe(false);
    expect(SqrtInputSchema.parse({ x: 2147483647 })).toEqual({ x: 2147483647 });
    for (const input of [{ prices: [] }, { prices: [-1] }, { prices: [10001] }, { prices: [1], extra: 1 }]) expect(StockProfitIIInputSchema.safeParse(input).success).toBe(false);
    expect(StockProfitIIInputSchema.parse({ prices: [0, 10000] })).toEqual({ prices: [0, 10000] });
    for (const root of [[null], [1, null, null, 2], [1, 101], [1, 2, null, null, null, 3]]) expect(TreeInputSchema.safeParse({ root }).success).toBe(false);
    expect(TreeInputSchema.parse({ root: [1, null, 2, 3] })).toEqual({ root: [1, null, 2, 3] });
  });

  it('agrees with integer inequalities throughout the square-root boundary', () => {
    for (const x of [0, 1, 2, 3, 4, 8, 15, 16, 24, 25, 2147395599, 2147395600, 2147483647, ...Array.from({ length: 500 }, (_, i) => i * 97)]) {
      const actual = expectedOutput('69', { x });
      expect(actual.kind).toBe('int');
      const value = (actual as { value: number }).value;
      expect(value * value).toBeLessThanOrEqual(x);
      expect((value + 1) * (value + 1)).toBeGreaterThan(x);
      expect(judgeProblemOutput('69', { x }, { kind: 'int', value: value + 1 }).passed).toBe(false);
    }
  });

  it('matches exhaustive buy/sell choices for short stock histories', () => {
    const exhaustive = (prices: number[], day: number, owned: boolean): number => {
      if (day === prices.length) return owned ? -1_000_000 : 0;
      const skip = exhaustive(prices, day + 1, owned);
      const trade = (owned ? prices[day]! : -prices[day]!) + exhaustive(prices, day + 1, !owned);
      return Math.max(skip, trade);
    };
    for (let length = 1; length <= 5; length++) {
      const visit = (prices: number[]) => {
        if (prices.length === length) {
          const expected = exhaustive(prices, 0, false);
          expect(expectedOutput('122', { prices })).toEqual({ kind: 'int', value: expected });
          return;
        }
        for (let value = 0; value <= 3; value++) visit([...prices, value]);
      };
      visit([]);
    }
    expect(expectedOutput('122', { prices: Array.from({ length: 10000 }, (_, i) => i % 2 === 0 ? 0 : 10000) })).toEqual({ kind: 'int', value: 50_000_000 });
  });

  it('uses compact tree positions, stable preorder values and strict array comparison', () => {
    const inputs = [
      [{ root: [] }, []],
      [{ root: [1, null, 2, 3] }, [1, 2, 3]],
      [{ root: [5, 5, 5, 5, null, null, 5] }, [5, 5, 5, 5, 5]],
      [{ root: [1, 2, 3, 4, 5, null, 8, null, null, 6, 7, 9] }, [1, 2, 4, 5, 6, 7, 3, 8, 9]],
    ] as const;
    for (const [input, values] of inputs) {
      expect(expectedOutput('144', { root: [...input.root] })).toEqual({ kind: 'int-array', values });
      if (values.length > 1) expect(judgeProblemOutput('144', { root: [...input.root] }, { kind: 'int-array', values: values.slice(1) }).passed).toBe(false);
    }
    expect(judgeProblemOutput('144', { root: [1] }, { kind: 'int-array', values: [] }).passed).toBe(false);
  });
});
