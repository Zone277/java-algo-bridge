export const ALGORITHM_VERSION = '349-two-hash-sets-v1';

export const STARTER_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        // 返回两个数组共有的不同值；返回顺序不限。
        throw new UnsupportedOperationException("请完成 intersection 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> members = new HashSet<>();
        for (int value : nums2) {
            members.add(value);
        }
        Set<Integer> common = new HashSet<>();
        for (int value : nums1) {
            if (members.contains(value)) {
                common.add(value);
            }
        }
        int[] result = new int[common.size()];
        int index = 0;
        for (int value = 0; value <= 1000; value++) {
            if (common.contains(value)) {
                result[index] = value;
                index++;
            }
        }
        return result;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-members', startLine: 6, endLine: 6 },
  { stepId: 'scan-second', startLine: 7, endLine: 7 },
  { stepId: 'add-second', startLine: 8, endLine: 8 },
  { stepId: 'init-common', startLine: 10, endLine: 10 },
  { stepId: 'scan-first', startLine: 11, endLine: 11 },
  { stepId: 'check-member', startLine: 12, endLine: 12 },
  { stepId: 'add-common', startLine: 13, endLine: 13 },
  { stepId: 'allocate-result', startLine: 16, endLine: 16 },
  { stepId: 'init-index', startLine: 17, endLine: 17 },
  { stepId: 'write-result', startLine: 20, endLine: 20 },
  { stepId: 'advance-index', startLine: 21, endLine: 21 },
  { stepId: 'return-result', startLine: 24, endLine: 24 },
] as const;

export const WRONG_KEEP_DUPLICATES_SOURCE = `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> members = new HashSet<>();
        for (int value : nums2) members.add(value);
        List<Integer> result = new ArrayList<>();
        for (int value : nums1) {
            if (members.contains(value)) result.add(value);
        }
        int[] values = new int[result.size()];
        for (int i = 0; i < result.size(); i++) values[i] = result.get(i);
        return values;
    }
}
`;

export const WRONG_SAME_INDEX_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> common = new HashSet<>();
        int length = Math.min(nums1.length, nums2.length);
        for (int i = 0; i < length; i++) {
            if (nums1[i] == nums2[i]) common.add(nums1[i]);
        }
        int[] result = new int[common.size()];
        int index = 0;
        for (int value : common) result[index++] = value;
        return result;
    }
}
`;
