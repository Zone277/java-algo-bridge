export const ALGORITHM_VERSION = '53-kadane-v1';

export const STARTER_SOURCE = `class Solution {
    public int maxSubArray(int[] nums) {
        // 返回一个非空连续子数组的最大元素和。
        throw new UnsupportedOperationException("请完成 maxSubArray 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int maxSubArray(int[] nums) {
        int current = nums[0];
        int best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int value = nums[i];
            current = Math.max(value, current + value);
            best = Math.max(best, current);
        }
        return best;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-current', startLine: 3, endLine: 3 },
  { stepId: 'init-best', startLine: 4, endLine: 4 },
  { stepId: 'check-index', startLine: 5, endLine: 5 },
  { stepId: 'read-value', startLine: 6, endLine: 6 },
  { stepId: 'update-current', startLine: 7, endLine: 7 },
  { stepId: 'update-best', startLine: 8, endLine: 8 },
  { stepId: 'return-best', startLine: 10, endLine: 10 },
] as const;
