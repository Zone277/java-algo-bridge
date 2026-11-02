export const ALGORITHM_VERSION = '100-recursive-pairs-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        // 同时比较两个位置：引用是否都为空、结构是否一致、节点值是否一致。
        throw new UnsupportedOperationException("请完成 isSameTree 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null && q == null) return true;
        if (p == null || q == null) return false;
        if (p.val != q.val) return false;
        return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'enter-pair', startLine: 2, endLine: 2 },
  { stepId: 'check-both-null', startLine: 3, endLine: 3 },
  { stepId: 'return-both-null', startLine: 3, endLine: 3 },
  { stepId: 'check-one-null', startLine: 4, endLine: 4 },
  { stepId: 'return-one-null', startLine: 4, endLine: 4 },
  { stepId: 'compare-values', startLine: 5, endLine: 5 },
  { stepId: 'return-values-differ', startLine: 5, endLine: 5 },
  { stepId: 'call-left-pair', startLine: 6, endLine: 6 },
  { stepId: 'check-left-result', startLine: 6, endLine: 6 },
  { stepId: 'short-circuit-left', startLine: 6, endLine: 6 },
  { stepId: 'call-right-pair', startLine: 6, endLine: 6 },
  { stepId: 'return-pair', startLine: 6, endLine: 6 },
  { stepId: 'return-result', startLine: 6, endLine: 6 },
];
