export const ALGORITHM_VERSION = '198-rolling-prefix-dp-v1';

export const STARTER_SOURCE = `class Solution {
    public int rob(int[] nums) {
        // 返回不选取相邻房屋时，可以取得的最大总金额。
        throw new UnsupportedOperationException("请完成 rob 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            int take = twoBack + nums[i];
            int skip = oneBack;
            int next = Math.max(skip, take);
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
  { stepId: 'check-index', startLine: 5, endLine: 5 },
  { stepId: 'compute-take', startLine: 6, endLine: 6 },
  { stepId: 'compute-skip', startLine: 7, endLine: 7 },
  { stepId: 'compute-next', startLine: 8, endLine: 8 },
  { stepId: 'shift-two-back', startLine: 9, endLine: 9 },
  { stepId: 'shift-one-back', startLine: 10, endLine: 10 },
  { stepId: 'return-best', startLine: 12, endLine: 12 },
] as const;
