export const ALGORITHM_VERSION = '205-last-seen-pattern-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        // 判断两个等长字符串是否具有相同的字符重复模式。
        throw new UnsupportedOperationException("请完成 isIsomorphic 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        int[] seenS = new int[128];
        int[] seenT = new int[128];
        for (int i = 0; i < s.length(); i++) {
            char a = s.charAt(i);
            char b = t.charAt(i);
            if (seenS[a] != seenT[b]) {
                return false;
            }
            seenS[a] = i + 1;
            seenT[b] = i + 1;
        }
        return true;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-seen-s', startLine: 3, endLine: 3 },
  { stepId: 'init-seen-t', startLine: 4, endLine: 4 },
  { stepId: 'loop-index', startLine: 5, endLine: 5 },
  { stepId: 'read-s-char', startLine: 6, endLine: 6 },
  { stepId: 'read-t-char', startLine: 7, endLine: 7 },
  { stepId: 'check-pattern', startLine: 8, endLine: 8 },
  { stepId: 'return-false', startLine: 9, endLine: 9 },
  { stepId: 'record-s', startLine: 11, endLine: 11 },
  { stepId: 'record-t', startLine: 12, endLine: 12 },
  { stepId: 'return-true', startLine: 14, endLine: 14 },
];

/** 只记录 s -> t，遗漏反向唯一性；ab / aa 会被误判为 true。 */
export const WRONG_ONE_WAY_SOURCE = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        int[] mapped = new int[128];
        java.util.Arrays.fill(mapped, -1);
        for (int i = 0; i < s.length(); i++) {
            char a = s.charAt(i);
            char b = t.charAt(i);
            if (mapped[a] != -1 && mapped[a] != b) return false;
            mapped[a] = b;
        }
        return true;
    }
}
`;

/** 只比较两串各自不同字符数量；相同数量不代表对应关系一致。 */
export const WRONG_DISTINCT_COUNT_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isIsomorphic(String s, String t) {
        Set<Character> left = new HashSet<>();
        Set<Character> right = new HashSet<>();
        for (int i = 0; i < s.length(); i++) {
            left.add(s.charAt(i));
            right.add(t.charAt(i));
        }
        return left.size() == right.size();
    }
}
`;

/** 把字符相等误当成同构；无法接受合法的字符改名。 */
export const WRONG_EQUALS_SOURCE = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        return s.equals(t);
    }
}
`;
