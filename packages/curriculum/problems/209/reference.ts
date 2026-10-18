export const ALGORITHM_VERSION = '209-positive-window-v1';

export const STARTER_SOURCE = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        // 返回元素和至少为 target 的最短连续子数组长度；无解返回 0。
        throw new UnsupportedOperationException("请完成 minSubArrayLen 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = nums.length + 1;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == nums.length + 1 ? 0 : best;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-sum', startLine: 4, endLine: 4 },
  { stepId: 'init-best', startLine: 5, endLine: 5 },
  { stepId: 'check-right', startLine: 6, endLine: 6 },
  { stepId: 'include-right', startLine: 7, endLine: 7 },
  { stepId: 'check-target', startLine: 8, endLine: 8 },
  { stepId: 'update-best', startLine: 9, endLine: 9 },
  { stepId: 'remove-left', startLine: 10, endLine: 10 },
  { stepId: 'move-left', startLine: 11, endLine: 11 },
  { stepId: 'move-right', startLine: 6, endLine: 6 },
  { stepId: 'return-result', startLine: 14, endLine: 14 },
] as const;
