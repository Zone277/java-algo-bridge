export const ALGORITHM_VERSION = '70-rolling-dp-v1';

export const STARTER_SOURCE = `class Solution {
    public int climbStairs(int n) {
        // 从基例和“最后一步来自前一级或前两级”完成方法。
        throw new UnsupportedOperationException("请完成 climbStairs 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int climbStairs(int n) {
        if (n == 1) return 1;
        int previous = 1;
        int current = 2;
        for (int step = 3; step <= n; step++) {
            int next = previous + current;
            previous = current;
            current = next;
        }
        return current;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-base', startLine: 3, endLine: 3 },
  { stepId: 'return-base', startLine: 3, endLine: 3 },
  { stepId: 'init-previous', startLine: 4, endLine: 4 },
  { stepId: 'init-current', startLine: 5, endLine: 5 },
  { stepId: 'check-loop', startLine: 6, endLine: 6 },
  { stepId: 'compute-next', startLine: 7, endLine: 7 },
  { stepId: 'move-previous', startLine: 8, endLine: 8 },
  { stepId: 'move-current', startLine: 9, endLine: 9 },
  { stepId: 'return-current', startLine: 11, endLine: 11 },
] as const;
