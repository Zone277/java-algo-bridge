export const ALGORITHM_VERSION = '69-division-binary-search-v1';

export const STARTER_SOURCE = `class Solution {
    public int mySqrt(int x) {
        // TODO：返回不超过平方根的最大非负整数；注意 int 乘法溢出。
        throw new UnsupportedOperationException("请完成 mySqrt 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int mySqrt(int x) {
        if (x < 2) {
            return x;
        }
        int left = 1;
        int right = x / 2;
        int answer = 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (mid <= x / mid) {
                answer = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return answer;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-small', startLine: 3, endLine: 3 },
  { stepId: 'return-small', startLine: 4, endLine: 4 },
  { stepId: 'init-left', startLine: 6, endLine: 6 },
  { stepId: 'init-right', startLine: 7, endLine: 7 },
  { stepId: 'init-answer', startLine: 8, endLine: 8 },
  { stepId: 'check-loop', startLine: 9, endLine: 9 },
  { stepId: 'compute-mid', startLine: 10, endLine: 10 },
  { stepId: 'compare-square', startLine: 11, endLine: 11 },
  { stepId: 'record-answer', startLine: 12, endLine: 12 },
  { stepId: 'move-left', startLine: 13, endLine: 13 },
  { stepId: 'move-right', startLine: 15, endLine: 15 },
  { stepId: 'return-answer', startLine: 18, endLine: 18 },
];

// Rounding to the nearest integer is different from taking the floor.
export const WRONG_ROUND_NEAREST_SOURCE = `class Solution {
    public int mySqrt(int x) {
        return (int) Math.round(Math.sqrt(x));
    }
}
`;

// A strict comparison discards exact square roots instead of keeping them.
export const WRONG_STRICT_SQUARE_SOURCE = `class Solution {
    public int mySqrt(int x) {
        if (x < 2) return x;
        int left = 1;
        int right = x / 2;
        int answer = 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if ((long) mid * mid < x) {
                answer = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return answer;
    }
}
`;
