export const ALGORITHM_VERSION = '88-backward-merge-v1';

export const STARTER_SOURCE = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        // 原地修改 nums1；方法不返回数组。
        throw new UnsupportedOperationException("请完成 merge 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1;
        int j = n - 1;
        int write = m + n - 1;
        while (j >= 0) {
            if (i >= 0 && nums1[i] > nums2[j]) {
                nums1[write] = nums1[i];
                i--;
            } else {
                nums1[write] = nums2[j];
                j--;
            }
            write--;
        }
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-i', startLine: 3, endLine: 3 },
  { stepId: 'init-j', startLine: 4, endLine: 4 },
  { stepId: 'init-write', startLine: 5, endLine: 5 },
  { stepId: 'check-loop', startLine: 6, endLine: 6 },
  { stepId: 'choose-branch', startLine: 7, endLine: 7 },
  { stepId: 'write-first', startLine: 8, endLine: 8 },
  { stepId: 'move-i', startLine: 9, endLine: 9 },
  { stepId: 'write-second', startLine: 11, endLine: 11 },
  { stepId: 'move-j', startLine: 12, endLine: 12 },
  { stepId: 'move-write', startLine: 14, endLine: 14 },
] as const;
