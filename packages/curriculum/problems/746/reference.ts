export const ALGORITHM_VERSION = '746-rolling-arrival-cost-v1';

export const STARTER_SOURCE = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        // 返回从下标 0 或 1 出发到顶楼的最小费用。
        throw new UnsupportedOperationException("请完成 minCostClimbingStairs 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 2; i <= cost.length; i++) {
            int fromOne = oneBack + cost[i - 1];
            int fromTwo = twoBack + cost[i - 2];
            int next = Math.min(fromOne, fromTwo);
            twoBack = oneBack;
            oneBack = next;
        }
        return oneBack;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-two-back', startLine: 3, endLine: 3 },
  { stepId: 'init-one-back', startLine: 4, endLine: 4 },
  { stepId: 'check-destination', startLine: 5, endLine: 5 },
  { stepId: 'compute-from-one', startLine: 6, endLine: 6 },
  { stepId: 'compute-from-two', startLine: 7, endLine: 7 },
  { stepId: 'compute-next', startLine: 8, endLine: 8 },
  { stepId: 'shift-two-back', startLine: 9, endLine: 9 },
  { stepId: 'shift-one-back', startLine: 10, endLine: 10 },
  { stepId: 'return-cost', startLine: 12, endLine: 12 },
] as const;
