export const ALGORITHM_VERSION = '383-consume-counts-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        // 每张杂志字母卡最多只能使用一次。
        throw new UnsupportedOperationException("请完成 canConstruct 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        int[] available = new int[26];
        for (int i = 0; i < magazine.length(); i++) {
            available[magazine.charAt(i) - 'a']++;
        }
        for (int i = 0; i < ransomNote.length(); i++) {
            int slot = ransomNote.charAt(i) - 'a';
            if (available[slot] == 0) {
                return false;
            }
            available[slot]--;
        }
        return true;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-available', startLine: 3, endLine: 3 },
  { stepId: 'check-magazine-loop', startLine: 4, endLine: 4 },
  { stepId: 'add-magazine-char', startLine: 5, endLine: 5 },
  { stepId: 'check-note-loop', startLine: 7, endLine: 7 },
  { stepId: 'check-available', startLine: 8, endLine: 9 },
  { stepId: 'return-false', startLine: 10, endLine: 10 },
  { stepId: 'consume-char', startLine: 12, endLine: 12 },
  { stepId: 'return-true', startLine: 14, endLine: 14 },
] as const;

// A contiguous substring is not required: magazine letters may be rearranged.
export const WRONG_SUBSTRING_SOURCE = `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        return magazine.contains(ransomNote);
    }
}
`;

// A set discards multiplicities, but every printed character can be used once.
export const WRONG_DISTINCT_ONLY_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        Set<Character> chars = new HashSet<>();
        for (int i = 0; i < magazine.length(); i++) chars.add(magazine.charAt(i));
        for (int i = 0; i < ransomNote.length(); i++) {
            if (!chars.contains(ransomNote.charAt(i))) return false;
        }
        return true;
    }
}
`;
