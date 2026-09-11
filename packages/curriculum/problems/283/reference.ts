export const ALGORITHM_VERSION = '283-stable-compaction-v1';

export const STARTER_SOURCE = `class Solution {
    public void moveZeroes(int[] nums) {
        // 原地移动零：保留非零元素的相对次序，不要只重新绑定 nums。
        throw new UnsupportedOperationException("请完成 moveZeroes 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public void moveZeroes(int[] nums) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) {
                nums[write] = nums[read];
                write++;
            }
        }
        while (write < nums.length) {
            nums[write] = 0;
            write++;
        }
        return;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-write', startLine: 3, endLine: 3 },
  { stepId: 'check-read', startLine: 4, endLine: 4 },
  { stepId: 'check-nonzero', startLine: 5, endLine: 5 },
  { stepId: 'copy-nonzero', startLine: 6, endLine: 6 },
  { stepId: 'advance-write', startLine: 7, endLine: 7 },
  { stepId: 'check-fill', startLine: 10, endLine: 10 },
  { stepId: 'fill-zero', startLine: 11, endLine: 11 },
  { stepId: 'advance-fill', startLine: 12, endLine: 12 },
  { stepId: 'finish', startLine: 14, endLine: 14 },
] as const;
