export const ALGORITHM_VERSION = '392-greedy-two-pointers-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isSubsequence(String s, String t) {
        // TODO：判断 s 是否能按原顺序从 t 中选出。
        throw new UnsupportedOperationException("请完成方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0;
        int j = 0;
        while (i < s.length() && j < t.length()) {
            if (s.charAt(i) == t.charAt(j)) {
                i++;
            }
            j++;
        }
        return i == s.length();
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-i', startLine: 3, endLine: 3 },
  { stepId: 'init-j', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'compare', startLine: 6, endLine: 6 },
  { stepId: 'match', startLine: 7, endLine: 7 },
  { stepId: 'advance-j', startLine: 9, endLine: 9 },
  { stepId: 'return-result', startLine: 11, endLine: 11 },
];

export const WRONG_SUBSTRING_SOURCE = `class Solution {
    public boolean isSubsequence(String s, String t) {
        return t.contains(s);
    }
}
`;

export const WRONG_REUSE_SOURCE = `class Solution {
    public boolean isSubsequence(String s, String t) {
        for (int i = 0; i < s.length(); i++) {
            if (t.indexOf(s.charAt(i)) < 0) return false;
        }
        return true;
    }
}
`;
