export const ALGORITHM_VERSION = '217-hash-set-v1';

export const STARTER_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // 找到任意重复值就返回 true；否则返回 false。
        throw new UnsupportedOperationException("请完成 containsDuplicate 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int i = 0; i < nums.length; i++) {
            if (seen.contains(nums[i])) {
                return true;
            }
            seen.add(nums[i]);
        }
        return false;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-set', startLine: 6, endLine: 6 },
  { stepId: 'loop-index', startLine: 7, endLine: 7 },
  { stepId: 'check-seen', startLine: 8, endLine: 8 },
  { stepId: 'return-true', startLine: 9, endLine: 9 },
  { stepId: 'add-current', startLine: 11, endLine: 11 },
  { stepId: 'return-false', startLine: 13, endLine: 13 },
];

export const WRONG_ADJACENT_ONLY_SOURCE = `class Solution {
    public boolean containsDuplicate(int[] nums) {
        for (int i = 1; i < nums.length; i++) {
            if (nums[i] == nums[i - 1]) return true;
        }
        return false;
    }
}
`;

export const WRONG_ADD_BEFORE_CHECK_SOURCE = `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int value : nums) {
            seen.add(value);
            if (seen.contains(value)) return true;
        }
        return false;
    }
}
`;

