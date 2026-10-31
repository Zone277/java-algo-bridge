export const ALGORITHM_VERSION = '112-recursive-remaining-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        // 只考虑从根到叶的完整路径。
        throw new UnsupportedOperationException("请完成 hasPathSum 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        int remaining = targetSum - root.val;
        if (root.left == null && root.right == null) return remaining == 0;
        return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'enter-frame', startLine: 2, endLine: 2 },
  { stepId: 'check-null', startLine: 3, endLine: 3 },
  { stepId: 'return-null', startLine: 3, endLine: 3 },
  { stepId: 'subtract-value', startLine: 4, endLine: 4 },
  { stepId: 'check-leaf', startLine: 5, endLine: 5 },
  { stepId: 'return-leaf', startLine: 5, endLine: 5 },
  { stepId: 'call-left', startLine: 6, endLine: 6 },
  { stepId: 'call-right', startLine: 6, endLine: 6 },
  { stepId: 'return-branches', startLine: 6, endLine: 6 },
];
