export const ALGORITHM_VERSION = '27-stable-filter-prefix-v1';

export const STARTER_SOURCE = `class Solution {
    public int removeElement(int[] nums, int val) {
        // 原地整理 nums，并返回不等于 val 的元素数量。
        throw new UnsupportedOperationException("请完成 removeElement 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int removeElement(int[] nums, int val) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != val) {
                nums[write] = nums[read];
                write++;
            }
        }
        return write;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-write', startLine: 3, endLine: 3 },
  { stepId: 'check-read', startLine: 4, endLine: 4 },
  { stepId: 'check-keep', startLine: 5, endLine: 5 },
  { stepId: 'copy-keep', startLine: 6, endLine: 6 },
  { stepId: 'advance-write', startLine: 7, endLine: 7 },
  { stepId: 'return-length', startLine: 10, endLine: 10 },
] as const;

// Incorrect: reports how many values were removed instead of how many remain.
export const WRONG_REMOVED_COUNT_SOURCE = `class Solution {
    public int removeElement(int[] nums, int val) {
        int removed = 0;
        for (int value : nums) {
            if (value == val) removed++;
        }
        return removed;
    }
}
`;

// Incorrect: counts retained values but never writes them into the submitted prefix.
export const WRONG_COUNT_ONLY_SOURCE = `class Solution {
    public int removeElement(int[] nums, int val) {
        int kept = 0;
        for (int value : nums) {
            if (value != val) kept++;
        }
        return kept;
    }
}
`;
