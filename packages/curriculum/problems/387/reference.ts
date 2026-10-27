export const ALGORITHM_VERSION = '387-two-pass-frequency-v1';

export const STARTER_SOURCE = `class Solution {
    public int firstUniqChar(String s) {
        // 返回整个字符串中只出现一次的字符里最靠左的下标；无解返回 -1。
        throw new UnsupportedOperationException("请完成 firstUniqChar 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int firstUniqChar(String s) {
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
        }
        for (int i = 0; i < s.length(); i++) {
            if (count[s.charAt(i) - 'a'] == 1) {
                return i;
            }
        }
        return -1;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-count', startLine: 3, endLine: 3 },
  { stepId: 'check-count-loop', startLine: 4, endLine: 4 },
  { stepId: 'increment-count', startLine: 5, endLine: 5 },
  { stepId: 'check-scan-loop', startLine: 7, endLine: 7 },
  { stepId: 'check-unique', startLine: 8, endLine: 8 },
  { stepId: 'return-index', startLine: 9, endLine: 9 },
  { stepId: 'return-missing', startLine: 12, endLine: 12 },
] as const;

// A character's first appearance is not enough: a later copy can invalidate it.
export const WRONG_FIRST_APPEARANCE_SOURCE = `class Solution {
    public int firstUniqChar(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (s.indexOf(s.charAt(i)) == i) return i;
        }
        return -1;
    }
}
`;

// A unique character at the right edge does not beat an earlier unique one.
export const WRONG_RIGHTMOST_SOURCE = `class Solution {
    public int firstUniqChar(String s) {
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) count[s.charAt(i) - 'a']++;
        for (int i = s.length() - 1; i >= 0; i--) {
            if (count[s.charAt(i) - 'a'] == 1) return i;
        }
        return -1;
    }
}
`;
