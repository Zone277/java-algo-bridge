export const ALGORITHM_VERSION = '136-prefix-xor-v1';

export const STARTER_SOURCE = `class Solution {
    public int singleNumber(int[] nums) {
        // 返回只出现一次的值；其余每个值恰好出现两次。
        throw new UnsupportedOperationException("请完成 singleNumber 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int singleNumber(int[] nums) {
        int result = 0;
        int i = 0;
        while (i < nums.length) {
            result ^= nums[i];
            i++;
        }
        return result;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-result', startLine: 3, endLine: 3 },
  { stepId: 'init-index', startLine: 4, endLine: 4 },
  { stepId: 'check-index', startLine: 5, endLine: 5 },
  { stepId: 'xor-value', startLine: 6, endLine: 6 },
  { stepId: 'advance-index', startLine: 7, endLine: 7 },
  { stepId: 'return-result', startLine: 9, endLine: 9 },
];

export const WRONG_FIRST_SOURCE = `class Solution {
    public int singleNumber(int[] nums) {
        return nums[0];
    }
}
`;

export const WRONG_OR_SOURCE = `class Solution {
    public int singleNumber(int[] nums) {
        int result = 0;
        for (int value : nums) {
            result |= value;
        }
        return result;
    }
}
`;
