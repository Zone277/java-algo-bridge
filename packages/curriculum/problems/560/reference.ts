export const ALGORITHM_VERSION = '560-prefix-frequency-v1';

export const STARTER_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int subarraySum(int[] nums, int k) {
        // 返回和为 k 的非空连续子数组数量。
        throw new UnsupportedOperationException("请完成 subarraySum 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        freq.put(0, 1);
        int prefix = 0;
        int count = 0;
        for (int i = 0; i < nums.length; i++) {
            prefix += nums[i];
            int needed = prefix - k;
            int matches = freq.getOrDefault(needed, 0);
            count += matches;
            freq.put(prefix, freq.getOrDefault(prefix, 0) + 1);
        }
        return count;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'create-map', startLine: 6, endLine: 6 },
  { stepId: 'seed-empty-prefix', startLine: 7, endLine: 7 },
  { stepId: 'init-prefix', startLine: 8, endLine: 8 },
  { stepId: 'init-count', startLine: 9, endLine: 9 },
  { stepId: 'check-loop', startLine: 10, endLine: 10 },
  { stepId: 'add-prefix', startLine: 11, endLine: 11 },
  { stepId: 'compute-needed', startLine: 12, endLine: 12 },
  { stepId: 'lookup-frequency', startLine: 13, endLine: 13 },
  { stepId: 'add-count', startLine: 14, endLine: 14 },
  { stepId: 'store-prefix', startLine: 15, endLine: 15 },
  { stepId: 'return-count', startLine: 17, endLine: 17 },
];
