export const ALGORITHM_VERSION = '13-left-to-right-lookahead-v1';

export const STARTER_SOURCE = `class Solution {
    public int romanToInt(String s) {
        // 把规范罗马数字转换成 1—3999 的整数。
        throw new UnsupportedOperationException("请完成 romanToInt 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int romanToInt(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int current = valueOf(s.charAt(i));
            if (i + 1 < s.length() && current < valueOf(s.charAt(i + 1))) {
                total -= current;
            } else {
                total += current;
            }
        }
        return total;
    }

    private int valueOf(char symbol) {
        return switch (symbol) {
            case 'I' -> 1;
            case 'V' -> 5;
            case 'X' -> 10;
            case 'L' -> 50;
            case 'C' -> 100;
            case 'D' -> 500;
            case 'M' -> 1000;
            default -> throw new IllegalArgumentException("invalid Roman symbol");
        };
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-total', startLine: 3, endLine: 3 },
  { stepId: 'check-loop', startLine: 4, endLine: 4 },
  { stepId: 'read-current', startLine: 5, endLine: 5 },
  { stepId: 'check-subtract', startLine: 6, endLine: 6 },
  { stepId: 'subtract-current', startLine: 7, endLine: 7 },
  { stepId: 'add-current', startLine: 9, endLine: 9 },
  { stepId: 'return-total', startLine: 12, endLine: 12 },
] as const;

/** 把所有符号都相加；IV、IX 等减法组合会被算大。 */
export const WRONG_ALWAYS_ADD_SOURCE = `class Solution {
    public int romanToInt(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) total += valueOf(s.charAt(i));
        return total;
    }
    private int valueOf(char c) {
        return switch (c) {
            case 'I' -> 1; case 'V' -> 5; case 'X' -> 10; case 'L' -> 50;
            case 'C' -> 100; case 'D' -> 500; case 'M' -> 1000;
            default -> 0;
        };
    }
}
`;

/** 只识别 IV、IX，遗漏 XL、XC、CD、CM 等同样合法的减法关系。 */
export const WRONG_ONLY_I_SUBTRACTS_SOURCE = `class Solution {
    public int romanToInt(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int current = valueOf(s.charAt(i));
            if (s.charAt(i) == 'I' && i + 1 < s.length() && current < valueOf(s.charAt(i + 1))) total -= current;
            else total += current;
        }
        return total;
    }
    private int valueOf(char c) {
        return switch (c) {
            case 'I' -> 1; case 'V' -> 5; case 'X' -> 10; case 'L' -> 50;
            case 'C' -> 100; case 'D' -> 500; case 'M' -> 1000;
            default -> 0;
        };
    }
}
`;
