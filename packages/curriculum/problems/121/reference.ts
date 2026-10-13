export const ALGORITHM_VERSION = '121-one-pass-min-price-v1';

export const STARTER_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        // 只能先买一次、再卖一次；没有正利润时返回 0。
        throw new UnsupportedOperationException("请完成 maxProfit 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = prices[0];
        int best = 0;
        for (int day = 1; day < prices.length; day++) {
            int today = prices[day];
            int profit = today - minPrice;
            best = Math.max(best, profit);
            minPrice = Math.min(minPrice, today);
        }
        return best;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-min', startLine: 3, endLine: 3 },
  { stepId: 'init-best', startLine: 4, endLine: 4 },
  { stepId: 'check-day', startLine: 5, endLine: 5 },
  { stepId: 'read-today', startLine: 6, endLine: 6 },
  { stepId: 'compute-profit', startLine: 7, endLine: 7 },
  { stepId: 'update-best', startLine: 8, endLine: 8 },
  { stepId: 'update-min', startLine: 9, endLine: 9 },
  { stepId: 'return-best', startLine: 11, endLine: 11 },
] as const;
