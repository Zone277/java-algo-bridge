export const ALGORITHM_VERSION = '33-sorted-half-search-v1';

export const STARTER_SOURCE = `class Solution {
    public int search(int[] nums, int target) {
        // 返回 target 在旋转数组中的下标；不存在返回 -1。
        throw new UnsupportedOperationException("请完成 search 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            }
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            } else {
                if (nums[mid] < target && target <= nums[right]) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
        }
        return -1;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'compute-mid', startLine: 6, endLine: 6 },
  { stepId: 'check-equal', startLine: 7, endLine: 7 },
  { stepId: 'found', startLine: 8, endLine: 8 },
  { stepId: 'check-left-sorted', startLine: 10, endLine: 10 },
  { stepId: 'check-left-range', startLine: 11, endLine: 11 },
  { stepId: 'keep-left', startLine: 12, endLine: 12 },
  { stepId: 'discard-left', startLine: 14, endLine: 14 },
  { stepId: 'check-right-range', startLine: 17, endLine: 17 },
  { stepId: 'keep-right', startLine: 18, endLine: 18 },
  { stepId: 'discard-right', startLine: 20, endLine: 20 },
  { stepId: 'not-found', startLine: 24, endLine: 24 },
] as const;
