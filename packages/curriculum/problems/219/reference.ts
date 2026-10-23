export const ALGORITHM_VERSION = '219-latest-index-map-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        // TODO：判断是否存在值相同且下标距离不超过 k 的两个不同位置。
        throw new UnsupportedOperationException("请完成方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Map<Integer, Integer> last = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            if (last.containsKey(nums[i])) {
                int previous = last.get(nums[i]);
                if (i - previous <= k) {
                    return true;
                }
            }
            last.put(nums[i], i);
        }
        return false;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-map', startLine: 6, endLine: 6 },
  { stepId: 'loop-index', startLine: 7, endLine: 7 },
  { stepId: 'check-seen', startLine: 8, endLine: 8 },
  { stepId: 'read-previous', startLine: 9, endLine: 9 },
  { stepId: 'check-distance', startLine: 10, endLine: 10 },
  { stepId: 'return-true', startLine: 11, endLine: 11 },
  { stepId: 'store-current', startLine: 14, endLine: 14 },
  { stepId: 'return-false', startLine: 16, endLine: 16 },
];

export const WRONG_STORE_FIRST_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Map<Integer, Integer> last = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            last.put(nums[i], i);
            if (i - last.get(nums[i]) <= k) return true;
        }
        return false;
    }
}
`;

export const WRONG_KEEP_FIRST_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Map<Integer, Integer> first = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            if (first.containsKey(nums[i])) {
                if (i - first.get(nums[i]) <= k) return true;
            } else {
                first.put(nums[i], i);
            }
        }
        return false;
    }
}
`;
