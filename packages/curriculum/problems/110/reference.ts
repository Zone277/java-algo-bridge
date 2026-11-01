export const ALGORITHM_VERSION = '110-bottom-up-height-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isBalanced(TreeNode root) {
        // 判断每个节点的左右子树高度差是否都不超过 1。
        throw new UnsupportedOperationException("请完成 isBalanced 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isBalanced(TreeNode root) {
        return heightOrFail(root) != -1;
    }
    private int heightOrFail(TreeNode node) {
        if (node == null) return 0;
        int leftHeight = heightOrFail(node.left);
        if (leftHeight == -1) return -1;
        int rightHeight = heightOrFail(node.right);
        if (rightHeight == -1) return -1;
        if (Math.abs(leftHeight - rightHeight) > 1) return -1;
        return 1 + Math.max(leftHeight, rightHeight);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'start-method', startLine: 2, endLine: 3 },
  { stepId: 'enter-frame', startLine: 4, endLine: 4 },
  { stepId: 'check-null', startLine: 5, endLine: 5 },
  { stepId: 'return-null', startLine: 5, endLine: 5 },
  { stepId: 'call-left', startLine: 6, endLine: 6 },
  { stepId: 'check-left-failure', startLine: 7, endLine: 7 },
  { stepId: 'propagate-left-failure', startLine: 7, endLine: 7 },
  { stepId: 'call-right', startLine: 8, endLine: 8 },
  { stepId: 'check-right-failure', startLine: 9, endLine: 9 },
  { stepId: 'propagate-right-failure', startLine: 9, endLine: 9 },
  { stepId: 'compare-heights', startLine: 10, endLine: 10 },
  { stepId: 'return-unbalanced', startLine: 10, endLine: 10 },
  { stepId: 'return-height', startLine: 11, endLine: 11 },
  { stepId: 'finish-method', startLine: 3, endLine: 3 },
];
