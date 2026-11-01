export const ALGORITHM_VERSION = '58-backward-scan-v1';

export const STARTER_SOURCE = `class Solution {
    public int lengthOfLastWord(String s) {
        // 跳过尾部空格，返回最后一个单词的字符数。
        throw new UnsupportedOperationException("请完成 lengthOfLastWord 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int lengthOfLastWord(String s) {
        int i = s.length() - 1;
        while (i >= 0 && s.charAt(i) == ' ') {
            i--;
        }
        int length = 0;
        while (i >= 0 && s.charAt(i) != ' ') {
            length++;
            i--;
        }
        return length;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-index', startLine: 3, endLine: 3 },
  { stepId: 'check-trailing-space', startLine: 4, endLine: 4 },
  { stepId: 'skip-trailing-space', startLine: 5, endLine: 5 },
  { stepId: 'init-length', startLine: 7, endLine: 7 },
  { stepId: 'check-word-char', startLine: 8, endLine: 8 },
  { stepId: 'count-word-char', startLine: 9, endLine: 9 },
  { stepId: 'move-left', startLine: 10, endLine: 10 },
  { stepId: 'return-length', startLine: 12, endLine: 12 },
] as const;

// Incorrect: trailing spaces are mistaken for an empty final word.
export const WRONG_NO_TRAILING_SKIP_SOURCE = `class Solution {
    public int lengthOfLastWord(String s) {
        int i = s.length() - 1;
        int length = 0;
        while (i >= 0 && s.charAt(i) != ' ') {
            length++;
            i--;
        }
        return length;
    }
}
`;

// Incorrect: it returns the first word's length instead of the final one's.
export const WRONG_FIRST_WORD_SOURCE = `class Solution {
    public int lengthOfLastWord(String s) {
        s = s.trim();
        int i = 0;
        while (i < s.length() && s.charAt(i) != ' ') i++;
        return i;
    }
}
`;
