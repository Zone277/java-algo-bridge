export const ALGORITHM_VERSION = '66-right-to-left-carry-v1';

export const STARTER_SOURCE = `class Solution {
    public int[] plusOne(int[] digits) {
        // 将十进制数加一，返回从高位到低位的数字数组。
        throw new UnsupportedOperationException("请完成 plusOne 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        int[] grown = new int[digits.length + 1];
        grown[0] = 1;
        return grown;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-digit', startLine: 3, endLine: 3 },
  { stepId: 'check-nine', startLine: 4, endLine: 4 },
  { stepId: 'increment-digit', startLine: 5, endLine: 5 },
  { stepId: 'return-digits', startLine: 6, endLine: 6 },
  { stepId: 'reset-nine', startLine: 8, endLine: 8 },
  { stepId: 'allocate-grown', startLine: 10, endLine: 10 },
  { stepId: 'set-leading', startLine: 11, endLine: 11 },
  { stepId: 'return-grown', startLine: 12, endLine: 12 },
] as const;

// Incorrect: misses the carry when the last digit is 9.
export const WRONG_LAST_DIGIT_SOURCE = `class Solution {
    public int[] plusOne(int[] digits) {
        digits[digits.length - 1] = (digits[digits.length - 1] + 1) % 10;
        return digits;
    }
}
`;

// Incorrect: wraps every all-9 input to all zeroes instead of growing the result.
export const WRONG_NO_GROWTH_SOURCE = `class Solution {
    public int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        return digits;
    }
}
`;
