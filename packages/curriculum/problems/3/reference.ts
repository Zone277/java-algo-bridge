export const ALGORITHM_VERSION = '3-last-seen-window-v1';

export const STARTER_SOURCE = `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // 返回不含重复字符的最长连续子串长度。
        throw new UnsupportedOperationException("请完成 lengthOfLongestSubstring 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char current = s.charAt(right);
            if (lastSeen.containsKey(current)) {
                left = Math.max(left, lastSeen.get(current) + 1);
            }
            lastSeen.put(current, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'create-map', startLine: 6, endLine: 6 },
  { stepId: 'init-left', startLine: 7, endLine: 7 },
  { stepId: 'init-best', startLine: 8, endLine: 8 },
  { stepId: 'check-loop', startLine: 9, endLine: 9 },
  { stepId: 'read-char', startLine: 10, endLine: 10 },
  { stepId: 'check-seen', startLine: 11, endLine: 11 },
  { stepId: 'move-left', startLine: 12, endLine: 12 },
  { stepId: 'put-last', startLine: 14, endLine: 14 },
  { stepId: 'update-best', startLine: 15, endLine: 15 },
  { stepId: 'move-right', startLine: 9, endLine: 9 },
  { stepId: 'return-best', startLine: 17, endLine: 17 },
];

export const WRONG_DISTINCT_COUNT_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Set<Character> distinct = new HashSet<>();
        for (int i = 0; i < s.length(); i++) distinct.add(s.charAt(i));
        return distinct.size();
    }
}
`;

export const WRONG_LEFT_ROLLBACK_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char current = s.charAt(right);
            if (lastSeen.containsKey(current)) left = lastSeen.get(current) + 1;
            lastSeen.put(current, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`;

export const WRONG_CLEAR_WINDOW_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char current = s.charAt(right);
            if (lastSeen.containsKey(current)) {
                lastSeen.clear();
                left = right;
            }
            lastSeen.put(current, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`;
