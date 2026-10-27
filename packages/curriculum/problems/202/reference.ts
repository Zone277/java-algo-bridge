export const ALGORITHM_VERSION = '202-seen-digit-squares-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isHappy(int n) {
        // TODO：反复计算各位数字的平方和，判断最终到 1 还是进入循环。
        throw new UnsupportedOperationException("请完成 isHappy 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isHappy(int n) {
        Set<Integer> seen = new HashSet<>();
        while (n != 1 && !seen.contains(n)) {
            seen.add(n);
            int sum = 0;
            while (n > 0) {
                int digit = n % 10;
                sum += digit * digit;
                n /= 10;
            }
            n = sum;
        }
        return n == 1;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-set', startLine: 6, endLine: 6 },
  { stepId: 'check-outer', startLine: 7, endLine: 7 },
  { stepId: 'record-current', startLine: 8, endLine: 8 },
  { stepId: 'init-sum', startLine: 9, endLine: 9 },
  { stepId: 'check-digit-loop', startLine: 10, endLine: 10 },
  { stepId: 'read-digit', startLine: 11, endLine: 11 },
  { stepId: 'add-square', startLine: 12, endLine: 12 },
  { stepId: 'drop-digit', startLine: 13, endLine: 13 },
  { stepId: 'set-next', startLine: 15, endLine: 15 },
  { stepId: 'return-result', startLine: 17, endLine: 17 },
];

// The transformation is correct, but stopping after only one round misses 19 -> 82 -> 68 -> 100 -> 1.
export const WRONG_ONE_ROUND_SOURCE = `class Solution {
    public boolean isHappy(int n) {
        if (n == 1) return true;
        int sum = 0;
        while (n > 0) {
            int digit = n % 10;
            sum += digit * digit;
            n /= 10;
        }
        return sum == 1;
    }
}
`;

// Seeing an old state proves a non-1 loop, not success.
export const WRONG_CYCLE_AS_SUCCESS_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isHappy(int n) {
        Set<Integer> seen = new HashSet<>();
        while (n != 1) {
            if (seen.contains(n)) return true;
            seen.add(n);
            int sum = 0;
            while (n > 0) {
                int digit = n % 10;
                sum += digit * digit;
                n /= 10;
            }
            n = sum;
        }
        return true;
    }
}
`;
