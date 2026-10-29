export const ALGORITHM_VERSION = '268-index-value-xor-v1';

export const STARTER_SOURCE = `class Solution {
    public int missingNumber(int[] nums) {
        // nums 含 0..n 中的 n 个互异整数；返回缺少的值。
        throw new UnsupportedOperationException("请完成 missingNumber 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int missingNumber(int[] nums) {
        int missing = nums.length;
        int i = 0;
        while (i < nums.length) {
            missing ^= i;
            missing ^= nums[i];
            i++;
        }
        return missing;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-missing', startLine: 3, endLine: 3 },
  { stepId: 'init-index', startLine: 4, endLine: 4 },
  { stepId: 'check-index', startLine: 5, endLine: 5 },
  { stepId: 'xor-index', startLine: 6, endLine: 6 },
  { stepId: 'xor-value', startLine: 7, endLine: 7 },
  { stepId: 'advance-index', startLine: 8, endLine: 8 },
  { stepId: 'return-missing', startLine: 10, endLine: 10 },
];

/** Omits the extra candidate n; it can never cancel the right multiset. */
export const WRONG_OMIT_N_SOURCE = `class Solution {
    public int missingNumber(int[] nums) {
        int missing = 0;
        for (int i = 0; i < nums.length; i++) {
            missing ^= i;
            missing ^= nums[i];
        }
        return missing;
    }
}
`;

/** Folds the observed values but forgets to fold their candidate indices. */
export const WRONG_VALUES_ONLY_SOURCE = `class Solution {
    public int missingNumber(int[] nums) {
        int missing = nums.length;
        for (int value : nums) {
            missing ^= value;
        }
        return missing;
    }
}
`;
