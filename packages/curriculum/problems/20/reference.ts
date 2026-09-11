export const ALGORITHM_VERSION = '20-unmatched-open-stack-v1';

export const STARTER_SOURCE = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        // 使用栈检查括号的类型、顺序和嵌套，并处理空栈与最终剩余元素。
        throw new UnsupportedOperationException("请完成 isValid 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            if (current == '(' || current == '[' || current == '{') {
                stack.push(current);
                continue;
            }
            if (stack.isEmpty()) {
                return false;
            }
            char open = stack.pop();
            boolean matches = (current == ')' && open == '(')
                    || (current == ']' && open == '[')
                    || (current == '}' && open == '{');
            if (!matches) return false;
        }
        return stack.isEmpty();
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-stack', startLine: 5, endLine: 5 },
  { stepId: 'check-char', startLine: 6, endLine: 6 },
  { stepId: 'read-char', startLine: 7, endLine: 7 },
  { stepId: 'check-opening', startLine: 8, endLine: 8 },
  { stepId: 'push-open', startLine: 9, endLine: 9 },
  { stepId: 'check-empty', startLine: 12, endLine: 12 },
  { stepId: 'return-empty-error', startLine: 13, endLine: 13 },
  { stepId: 'pop-open', startLine: 15, endLine: 15 },
  { stepId: 'compare-pair', startLine: 16, endLine: 18 },
  { stepId: 'return-mismatch', startLine: 19, endLine: 19 },
  { stepId: 'return-final', startLine: 21, endLine: 21 },
] as const;
