export const ALGORITHM_VERSION = '34-two-half-open-bounds-v1';

export const STARTER_SOURCE = `class Solution {
    public int[] searchRange(int[] nums, int target) {
        // 返回目标出现的第一个和最后一个下标；找不到返回 {-1, -1}。
        throw new UnsupportedOperationException("请完成 searchRange 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int[] searchRange(int[] nums, int target) {
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
        int first = left;
        if (first == nums.length || nums[first] != target) {
            return new int[] {-1, -1};
        }
        left = first;
        right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] <= target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return new int[] {first, left - 1};
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'lower-init-left', startLine: 3, endLine: 3 },
  { stepId: 'lower-init-right', startLine: 4, endLine: 4 },
  { stepId: 'lower-check-loop', startLine: 5, endLine: 5 },
  { stepId: 'lower-compute-mid', startLine: 6, endLine: 6 },
  { stepId: 'lower-check-less', startLine: 7, endLine: 7 },
  { stepId: 'lower-move-left', startLine: 8, endLine: 8 },
  { stepId: 'lower-move-right', startLine: 10, endLine: 10 },
  { stepId: 'save-first', startLine: 13, endLine: 13 },
  { stepId: 'check-absent', startLine: 14, endLine: 14 },
  { stepId: 'return-absent', startLine: 15, endLine: 15 },
  { stepId: 'upper-init-left', startLine: 17, endLine: 17 },
  { stepId: 'upper-init-right', startLine: 18, endLine: 18 },
  { stepId: 'upper-check-loop', startLine: 19, endLine: 19 },
  { stepId: 'upper-compute-mid', startLine: 20, endLine: 20 },
  { stepId: 'upper-check-less-equal', startLine: 21, endLine: 21 },
  { stepId: 'upper-move-left', startLine: 22, endLine: 22 },
  { stepId: 'upper-move-right', startLine: 24, endLine: 24 },
  { stepId: 'return-range', startLine: 27, endLine: 27 },
] as const;
