export const ALGORITHM_VERSION = '704-closed-v1';

export const REFERENCE_SOURCE = `class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
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
  { stepId: 'check-less', startLine: 8, endLine: 8 },
  { stepId: 'move-left', startLine: 9, endLine: 9 },
  { stepId: 'move-right', startLine: 11, endLine: 11 },
  { stepId: 'found', startLine: 7, endLine: 7 },
  { stepId: 'not-found', startLine: 14, endLine: 14 },
];
