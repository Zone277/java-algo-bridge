export const ALGORITHM_VERSION = '125-ascii-two-pointers-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isPalindrome(String s) {
        // 从两端检查字母和数字，忽略大小写。
        throw new UnsupportedOperationException("请完成 isPalindrome 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0;
        int right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) {
                left++;
            }
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) {
                right--;
            }
            if (left >= right) {
                break;
            }
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'outer-loop', startLine: 5, endLine: 5 },
  { stepId: 'skip-left-check', startLine: 6, endLine: 6 },
  { stepId: 'skip-left', startLine: 7, endLine: 7 },
  { stepId: 'skip-right-check', startLine: 9, endLine: 9 },
  { stepId: 'skip-right', startLine: 10, endLine: 10 },
  { stepId: 'cross-check', startLine: 12, endLine: 12 },
  { stepId: 'break', startLine: 13, endLine: 13 },
  { stepId: 'compare', startLine: 15, endLine: 15 },
  { stepId: 'return-false', startLine: 16, endLine: 16 },
  { stepId: 'advance-left', startLine: 18, endLine: 18 },
  { stepId: 'advance-right', startLine: 19, endLine: 19 },
  { stepId: 'return-true', startLine: 21, endLine: 21 },
];

export const WRONG_RAW_COMPARE_SOURCE = `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) return false;
        }
        return true;
    }
}
`;

export const WRONG_LETTERS_ONLY_SOURCE = `class Solution {
    public boolean isPalindrome(String s) {
        StringBuilder letters = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isLetter(c)) letters.append(Character.toLowerCase(c));
        }
        String normalized = letters.toString();
        return normalized.equals(letters.reverse().toString());
    }
}
`;

export const WRONG_REMOVE_ONLY_SOURCE = `class Solution {
    public boolean isPalindrome(String s) {
        StringBuilder filtered = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isLetterOrDigit(c)) filtered.append(c);
        }
        String normalized = filtered.toString();
        return normalized.equals(filtered.reverse().toString());
    }
}
`;
