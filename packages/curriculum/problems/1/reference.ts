export const ALGORITHM_VERSION = '1-complement-map-v1';

export const STARTER_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // 返回两个不同的合法下标；下标顺序不限。
        throw new UnsupportedOperationException("请完成 twoSum 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), i};
            }
            seen.put(nums[i], i);
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-map', startLine: 6, endLine: 6 },
  { stepId: 'loop-index', startLine: 7, endLine: 7 },
  { stepId: 'compute-complement', startLine: 8, endLine: 8 },
  { stepId: 'check-complement', startLine: 9, endLine: 9 },
  { stepId: 'return-pair', startLine: 10, endLine: 10 },
  { stepId: 'store-current', startLine: 12, endLine: 12 },
  { stepId: 'no-pair', startLine: 14, endLine: 14 },
];
