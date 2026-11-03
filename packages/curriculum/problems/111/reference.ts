export const ALGORITHM_VERSION = '111-recursive-min-depth-v1';

export const STARTER_SOURCE = `class Solution {
    public int minDepth(TreeNode root) {
        // 返回 root 到最近叶节点路径上的节点数。
        throw new UnsupportedOperationException("请完成 minDepth 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int minDepth(TreeNode root) {
        if (root == null) return 0;
        int leftDepth = minDepth(root.left);
        int rightDepth = minDepth(root.right);
        if (leftDepth == 0 || rightDepth == 0) {
            return 1 + Math.max(leftDepth, rightDepth);
        }
        return 1 + Math.min(leftDepth, rightDepth);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'enter-frame', startLine: 2, endLine: 2 },
  { stepId: 'check-null', startLine: 3, endLine: 3 },
  { stepId: 'return-null', startLine: 3, endLine: 3 },
  { stepId: 'await-left', startLine: 4, endLine: 4 },
  { stepId: 'await-right', startLine: 5, endLine: 5 },
  { stepId: 'check-missing-child', startLine: 6, endLine: 8 },
  { stepId: 'return-only-child', startLine: 7, endLine: 7 },
  { stepId: 'return-nearer-child', startLine: 9, endLine: 9 },
];
