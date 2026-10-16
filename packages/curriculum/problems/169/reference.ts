export const ALGORITHM_VERSION = '169-boyer-moore-v1';

export const STARTER_SOURCE = `class Solution {
    public int majorityElement(int[] nums) {
        // 返回严格超过数组一半位置的那个值。
        throw new UnsupportedOperationException("请完成 majorityElement 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int majorityElement(int[] nums) {
        int candidate = nums[0];
        int votes = 0;
        for (int i = 0; i < nums.length; i++) {
            if (votes == 0) {
                candidate = nums[i];
            }
            if (nums[i] == candidate) {
                votes++;
            } else {
                votes--;
            }
        }
        return candidate;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-candidate', startLine: 3, endLine: 3 },
  { stepId: 'init-votes', startLine: 4, endLine: 4 },
  { stepId: 'loop-index', startLine: 5, endLine: 5 },
  { stepId: 'check-empty', startLine: 6, endLine: 6 },
  { stepId: 'choose-candidate', startLine: 7, endLine: 7 },
  { stepId: 'compare-value', startLine: 9, endLine: 9 },
  { stepId: 'add-vote', startLine: 10, endLine: 10 },
  { stepId: 'remove-vote', startLine: 12, endLine: 12 },
  { stepId: 'return-candidate', startLine: 15, endLine: 15 },
];

// This compiles but assumes the first position is necessarily the majority.
export const WRONG_FIRST_VALUE_SOURCE = `class Solution {
    public int majorityElement(int[] nums) {
        return nums[0];
    }
}
`;

// The middle index only works for sorted arrays; this input has no sorting promise.
export const WRONG_MIDDLE_INDEX_SOURCE = `class Solution {
    public int majorityElement(int[] nums) {
        return nums[nums.length / 2];
    }
}
`;
