export const ALGORITHM_VERSION = '242-frequency-count-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isAnagram(String s, String t) {
        // 判断两串中每个小写英文字母的出现次数是否相同。
        throw new UnsupportedOperationException("请完成 isAnagram 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) {
            return false;
        }
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
            count[t.charAt(i) - 'a']--;
        }
        for (int letter = 0; letter < count.length; letter++) {
            if (count[letter] != 0) {
                return false;
            }
        }
        return true;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-length', startLine: 3, endLine: 3 },
  { stepId: 'return-length-false', startLine: 4, endLine: 4 },
  { stepId: 'init-count', startLine: 6, endLine: 6 },
  { stepId: 'loop-index', startLine: 7, endLine: 7 },
  { stepId: 'increase-s', startLine: 8, endLine: 8 },
  { stepId: 'decrease-t', startLine: 9, endLine: 9 },
  { stepId: 'loop-letter', startLine: 11, endLine: 11 },
  { stepId: 'check-count', startLine: 12, endLine: 12 },
  { stepId: 'return-mismatch', startLine: 13, endLine: 13 },
  { stepId: 'return-true', startLine: 16, endLine: 16 },
];

export const WRONG_LENGTH_ONLY_SOURCE = `class Solution {
    public boolean isAnagram(String s, String t) {
        return s.length() == t.length();
    }
}
`;

export const WRONG_DISTINCT_LETTERS_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        Set<Character> a = new HashSet<>();
        Set<Character> b = new HashSet<>();
        for (int i = 0; i < s.length(); i++) {
            a.add(s.charAt(i));
            b.add(t.charAt(i));
        }
        return a.equals(b);
    }
}
`;

export const WRONG_SAME_POSITION_SOURCE = `class Solution {
    public boolean isAnagram(String s, String t) {
        return s.equals(t);
    }
}
`;
