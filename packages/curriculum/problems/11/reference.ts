export const ALGORITHM_VERSION = '11-shorter-side-pointers-v1';

export const STARTER_SOURCE = `class Solution {
    public int maxArea(int[] height) {
        // 选择两个不同下标，返回能够围出的最大面积。
        throw new UnsupportedOperationException("请完成 maxArea 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int maxArea(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int best = 0;
        while (left < right) {
            int width = right - left;
            int shorter = Math.min(height[left], height[right]);
            int area = width * shorter;
            best = Math.max(best, area);
            if (height[left] <= height[right]) {
                left++;
            } else {
                right--;
            }
        }
        return best;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'init-best', startLine: 5, endLine: 5 },
  { stepId: 'check-loop', startLine: 6, endLine: 6 },
  { stepId: 'compute-width', startLine: 7, endLine: 7 },
  { stepId: 'compute-shorter', startLine: 8, endLine: 8 },
  { stepId: 'compute-area', startLine: 9, endLine: 9 },
  { stepId: 'update-best', startLine: 10, endLine: 10 },
  { stepId: 'choose-side', startLine: 11, endLine: 11 },
  { stepId: 'move-left', startLine: 12, endLine: 12 },
  { stepId: 'move-right', startLine: 14, endLine: 14 },
  { stepId: 'return-best', startLine: 17, endLine: 17 },
] as const;
