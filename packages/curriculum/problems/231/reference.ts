export const ALGORITHM_VERSION = '231-positive-single-bit-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isPowerOfTwo(int n) {
        // TODO：判断 n 是否是正的 2 的整数次幂。
        throw new UnsupportedOperationException("请完成 isPowerOfTwo 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isPowerOfTwo(int n) {
        if (n <= 0) {
            return false;
        }
        int lowerBits = n & (n - 1);
        return lowerBits == 0;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-positive', startLine: 3, endLine: 3 },
  { stepId: 'return-nonpositive', startLine: 4, endLine: 4 },
  { stepId: 'clear-lowest-one', startLine: 6, endLine: 6 },
  { stepId: 'return-result', startLine: 7, endLine: 7 },
] as const;

// Zero and Integer.MIN_VALUE both satisfy the bit expression but are not powers of two.
export const WRONG_NO_POSITIVE_GUARD_SOURCE = `class Solution {
    public boolean isPowerOfTwo(int n) {
        return (n & (n - 1)) == 0;
    }
}
`;

// Evenness alone cannot distinguish 2^k from other even positive integers.
export const WRONG_EVENNESS_SOURCE = `class Solution {
    public boolean isPowerOfTwo(int n) {
        return n > 0 && n % 2 == 0;
    }
}
`;
