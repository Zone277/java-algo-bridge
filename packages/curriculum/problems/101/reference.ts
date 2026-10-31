export const ALGORITHM_VERSION = '101-recursive-mirror-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isSymmetric(TreeNode root) {
        // 从树的中心向两侧比较：左的左边要对应右的右边。
        throw new UnsupportedOperationException("请完成 isSymmetric 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isSymmetric(TreeNode root) {
        if (root == null) return true;
        return mirror(root.left, root.right);
    }
    private boolean mirror(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        if (a.val != b.val) return false;
        return mirror(a.left, b.right) && mirror(a.right, b.left);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'check-root', startLine: 3, endLine: 3 },
  { stepId: 'return-empty-root', startLine: 3, endLine: 3 },
  { stepId: 'call-root-pair', startLine: 4, endLine: 4 },
  { stepId: 'enter-pair', startLine: 6, endLine: 6 },
  { stepId: 'check-both-null', startLine: 7, endLine: 7 },
  { stepId: 'return-both-null', startLine: 7, endLine: 7 },
  { stepId: 'check-one-null', startLine: 8, endLine: 8 },
  { stepId: 'return-one-null', startLine: 8, endLine: 8 },
  { stepId: 'compare-values', startLine: 9, endLine: 9 },
  { stepId: 'return-values-differ', startLine: 9, endLine: 9 },
  { stepId: 'call-outer-pair', startLine: 10, endLine: 10 },
  { stepId: 'call-inner-pair', startLine: 10, endLine: 10 },
  { stepId: 'return-pair', startLine: 10, endLine: 10 },
  { stepId: 'return-result', startLine: 4, endLine: 4 },
];
