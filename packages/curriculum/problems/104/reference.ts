export const ALGORITHM_VERSION = '104-recursive-depth-v1';

export const STARTER_SOURCE = `class Solution {
    public int maxDepth(TreeNode root) {
        // 返回以 root 为根的树的最大节点层数。
        throw new UnsupportedOperationException("请完成 maxDepth 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);
        return 1 + Math.max(leftDepth, rightDepth);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'enter-frame', startLine: 2, endLine: 2 },
  { stepId: 'check-null', startLine: 3, endLine: 3 },
  { stepId: 'return-null', startLine: 3, endLine: 3 },
  { stepId: 'await-left', startLine: 4, endLine: 4 },
  { stepId: 'await-right', startLine: 5, endLine: 5 },
  { stepId: 'return-depth', startLine: 6, endLine: 6 },
];
