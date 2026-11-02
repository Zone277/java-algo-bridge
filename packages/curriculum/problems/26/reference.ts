export const ALGORITHM_VERSION = '26-stable-unique-prefix-v1';

export const STARTER_SOURCE = `class Solution {
    public int removeDuplicates(int[] nums) {
        // 原地整理非降序数组，返回不重复前缀的长度。
        throw new UnsupportedOperationException("请完成 removeDuplicates 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int removeDuplicates(int[] nums) {
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[write - 1]) {
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
  { stepId: 'check-unique', startLine: 5, endLine: 5 },
  { stepId: 'copy-unique', startLine: 6, endLine: 6 },
  { stepId: 'advance-write', startLine: 7, endLine: 7 },
  { stepId: 'return-length', startLine: 10, endLine: 10 },
] as const;

// Incorrect: returns the original length and never compacts duplicates.
export const WRONG_RETURN_LENGTH_SOURCE = `class Solution {
    public int removeDuplicates(int[] nums) {
        return nums.length;
    }
}
`;

// Incorrect: counts distinct values but forgets to copy them into the required prefix.
export const WRONG_COUNT_ONLY_SOURCE = `class Solution {
    public int removeDuplicates(int[] nums) {
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[read - 1]) {
                write++;
            }
        }
        return write;
    }
}
`;
