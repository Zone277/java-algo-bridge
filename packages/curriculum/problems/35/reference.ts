export const ALGORITHM_VERSION = '35-half-open-lower-bound-v1';

export const STARTER_SOURCE = `class Solution {
    public int searchInsert(int[] nums, int target) {
        // 返回 target 已存在的位置，或保持升序时应插入的位置。
        throw new UnsupportedOperationException("请完成 searchInsert 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'compute-mid', startLine: 6, endLine: 6 },
  { stepId: 'check-less', startLine: 7, endLine: 7 },
  { stepId: 'move-left', startLine: 8, endLine: 8 },
  { stepId: 'move-right', startLine: 10, endLine: 10 },
  { stepId: 'return-left', startLine: 13, endLine: 13 },
] as const;
