export const ALGORITHM_VERSION = '724-total-and-left-sum-v1';

export const STARTER_SOURCE = `class Solution {
    public int pivotIndex(int[] nums) {
        // 返回严格左右两侧元素和相同的最左下标；无解返回 -1。
        throw new UnsupportedOperationException("请完成 pivotIndex 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int pivotIndex(int[] nums) {
        int total = 0;
        for (int j = 0; j < nums.length; j++) {
            total += nums[j];
        }
        int left = 0;
        for (int i = 0; i < nums.length; i++) {
            int right = total - left - nums[i];
            if (left == right) {
                return i;
            }
            left += nums[i];
        }
        return -1;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-total', startLine: 3, endLine: 3 },
  { stepId: 'check-total-loop', startLine: 4, endLine: 4 },
  { stepId: 'add-total', startLine: 5, endLine: 5 },
  { stepId: 'init-left', startLine: 7, endLine: 7 },
  { stepId: 'check-pivot-loop', startLine: 8, endLine: 8 },
  { stepId: 'compute-right', startLine: 9, endLine: 9 },
  { stepId: 'check-balance', startLine: 10, endLine: 10 },
  { stepId: 'found', startLine: 11, endLine: 11 },
  { stepId: 'advance-left', startLine: 13, endLine: 13 },
  { stepId: 'not-found', startLine: 15, endLine: 15 },
] as const;
