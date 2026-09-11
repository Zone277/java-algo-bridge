export const ALGORITHM_VERSION = '977-two-pointers-v1';

export const STARTER_SOURCE = `class Solution {
    public int[] sortedSquares(int[] nums) {
        // 创建结果数组，用双指针按非降序填入平方值。
        throw new UnsupportedOperationException("请完成 sortedSquares 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int[] sortedSquares(int[] nums) {
        int[] result = new int[nums.length];
        int left = 0;
        int right = nums.length - 1;
        int write = nums.length - 1;
        while (left <= right) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            if (leftSquare > rightSquare) {
                result[write] = leftSquare;
                left++;
            } else {
                result[write] = rightSquare;
                right--;
            }
            write--;
        }
        return result;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'create-result', startLine: 3, endLine: 3 },
  { stepId: 'init-left', startLine: 4, endLine: 4 },
  { stepId: 'init-right', startLine: 5, endLine: 5 },
  { stepId: 'init-write', startLine: 6, endLine: 6 },
  { stepId: 'check-loop', startLine: 7, endLine: 7 },
  { stepId: 'square-left', startLine: 8, endLine: 8 },
  { stepId: 'square-right', startLine: 9, endLine: 9 },
  { stepId: 'choose-side', startLine: 10, endLine: 10 },
  { stepId: 'write-left', startLine: 11, endLine: 11 },
  { stepId: 'move-left', startLine: 12, endLine: 12 },
  { stepId: 'write-right', startLine: 14, endLine: 14 },
  { stepId: 'move-right', startLine: 15, endLine: 15 },
  { stepId: 'move-write', startLine: 17, endLine: 17 },
  { stepId: 'return-result', startLine: 19, endLine: 19 },
];

export const WRONG_ORIGINAL_ORDER_SOURCE = `class Solution {
    public int[] sortedSquares(int[] nums) {
        int[] result = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            result[i] = nums[i] * nums[i];
        }
        return result;
    }
}
`;

export const WRONG_DESCENDING_SOURCE = `class Solution {
    public int[] sortedSquares(int[] nums) {
        int[] result = new int[nums.length];
        int left = 0;
        int right = nums.length - 1;
        int write = 0;
        while (left <= right) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            if (leftSquare > rightSquare) {
                result[write++] = leftSquare;
                left++;
            } else {
                result[write++] = rightSquare;
                right--;
            }
        }
        return result;
    }
}
`;
