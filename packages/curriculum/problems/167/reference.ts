export const ALGORITHM_VERSION = '167-opposing-pointers-v1';

export const STARTER_SOURCE = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        // 返回升序排列的两个 1 起始下标，不重复使用同一个位置。
        throw new UnsupportedOperationException("请完成 twoSum 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0;
        int right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) {
                return new int[]{left + 1, right + 1};
            }
            if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-left', startLine: 3, endLine: 3 },
  { stepId: 'init-right', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'compute-sum', startLine: 6, endLine: 6 },
  { stepId: 'check-equal', startLine: 7, endLine: 7 },
  { stepId: 'return-pair', startLine: 8, endLine: 8 },
  { stepId: 'check-less', startLine: 10, endLine: 10 },
  { stepId: 'move-left', startLine: 11, endLine: 11 },
  { stepId: 'move-right', startLine: 13, endLine: 13 },
  { stepId: 'no-pair', startLine: 16, endLine: 16 },
] as const;
