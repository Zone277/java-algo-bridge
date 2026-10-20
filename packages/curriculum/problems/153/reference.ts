export const ALGORITHM_VERSION = '153-right-anchor-binary-search-v1';

export const STARTER_SOURCE = `class Solution {
    public int findMin(int[] nums) {
        // 返回最小元素的值，不是它的下标。输入非空且没有重复值。
        throw new UnsupportedOperationException("请完成 findMin 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int findMin(int[] nums) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return nums[left];
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'compute-mid', startLine: 6, endLine: 6 },
  { stepId: 'compare-right', startLine: 7, endLine: 7 },
  { stepId: 'move-left', startLine: 8, endLine: 8 },
  { stepId: 'keep-mid', startLine: 10, endLine: 10 },
  { stepId: 'return-min', startLine: 13, endLine: 13 },
] as const;
