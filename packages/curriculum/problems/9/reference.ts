export const ALGORITHM_VERSION = '9-reverse-half-digits-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        // TODO：判断 x 的十进制各位从左到右与从右到左是否相同。
        throw new UnsupportedOperationException("请完成 isPalindrome 方法");
    }
}
`;

export const GUARDED_SCAFFOLD_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        // TODO：负数立即返回 false；非零且末位为 0 也立即返回 false。
        int reversed = 0;
        while (x > reversed) {
            int digit = x % 10;
            reversed = reversed * 10 + digit;
            x /= 10;
        }
        return x == reversed || x == reversed / 10;
    }
}
`;

export const HALF_SCAFFOLD_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x != 0 && x % 10 == 0)) return false;
        // TODO：反转后半段，分别比较偶数位与奇数位。
        throw new UnsupportedOperationException("请完成半段反转");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0) {
            return false;
        }
        if (x != 0 && x % 10 == 0) {
            return false;
        }
        int reversed = 0;
        while (x > reversed) {
            int digit = x % 10;
            reversed = reversed * 10 + digit;
            x /= 10;
        }
        return x == reversed || x == reversed / 10;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-negative', startLine: 3, endLine: 3 },
  { stepId: 'return-negative', startLine: 4, endLine: 4 },
  { stepId: 'check-trailing-zero', startLine: 6, endLine: 6 },
  { stepId: 'return-trailing-zero', startLine: 7, endLine: 7 },
  { stepId: 'init-reversed', startLine: 9, endLine: 9 },
  { stepId: 'check-half', startLine: 10, endLine: 10 },
  { stepId: 'read-digit', startLine: 11, endLine: 11 },
  { stepId: 'append-digit', startLine: 12, endLine: 12 },
  { stepId: 'drop-digit', startLine: 13, endLine: 13 },
  { stepId: 'return-result', startLine: 15, endLine: 15 },
] as const;

// Negatives are never decimal palindromes, even if their digits are symmetric.
export const WRONG_IGNORE_SIGN_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        String digits = Integer.toString(x).replace("-", "");
        return new StringBuilder(digits).reverse().toString().equals(digits);
    }
}
`;

// An odd-length palindrome needs the middle digit removed before comparison.
export const WRONG_EVEN_ONLY_SOURCE = `class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x != 0 && x % 10 == 0)) return false;
        int reversed = 0;
        while (x > reversed) {
            reversed = reversed * 10 + x % 10;
            x /= 10;
        }
        return x == reversed;
    }
}
`;
