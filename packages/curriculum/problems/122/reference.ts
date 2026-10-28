export const ALGORITHM_VERSION = '122-positive-deltas-v1';

export const STARTER_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        // 可以完成多笔交易，但同一时刻最多持有一股。
        throw new UnsupportedOperationException("请完成 maxProfit 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int profit = 0;
        for (int day = 1; day < prices.length; day++) {
            int gain = prices[day] - prices[day - 1];
            if (gain > 0) {
                profit += gain;
            }
        }
        return profit;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-profit', startLine: 3, endLine: 3 },
  { stepId: 'check-day', startLine: 4, endLine: 4 },
  { stepId: 'compute-gain', startLine: 5, endLine: 5 },
  { stepId: 'check-positive', startLine: 6, endLine: 6 },
  { stepId: 'add-gain', startLine: 7, endLine: 7 },
  { stepId: 'return-profit', startLine: 10, endLine: 10 },
] as const;

// Wrong: LeetCode 121 permits one transaction; 122 permits many non-overlapping ones.
export const WRONG_SINGLE_TRADE_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int minimum = prices[0], best = 0;
        for (int day = 1; day < prices.length; day++) {
            best = Math.max(best, prices[day] - minimum);
            minimum = Math.min(minimum, prices[day]);
        }
        return best;
    }
}
`;

// Wrong: this can buy after its chosen sell day and ignores interim falls.
export const WRONG_EXTREMA_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int minimum = prices[0], maximum = prices[0];
        for (int price : prices) {
            minimum = Math.min(minimum, price);
            maximum = Math.max(maximum, price);
        }
        return maximum - minimum;
    }
}
`;

// Wrong: a fall is a lost opportunity, not a negative-profit trade we must take.
export const WRONG_TELESCOPING_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int profit = 0;
        for (int day = 1; day < prices.length; day++) {
            profit += prices[day] - prices[day - 1];
        }
        return profit;
    }
}
`;
