export const ALGORITHM_VERSION = '144-recursive-preorder-v1';

export const STARTER_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        // 按根、左、右的顺序收集节点值；TreeNode 由平台提供。
        throw new UnsupportedOperationException("请完成 preorderTraversal 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        result.add(node.val);
        visit(node.left, result);
        visit(node.right, result);
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-result', startLine: 4, endLine: 4 },
  { stepId: 'call-root', startLine: 5, endLine: 5 },
  { stepId: 'enter-frame', startLine: 8, endLine: 8 },
  { stepId: 'check-null', startLine: 9, endLine: 9 },
  { stepId: 'return-null', startLine: 9, endLine: 9 },
  { stepId: 'visit-node', startLine: 10, endLine: 10 },
  { stepId: 'call-left', startLine: 11, endLine: 11 },
  { stepId: 'call-right', startLine: 12, endLine: 12 },
  { stepId: 'return-visit', startLine: 13, endLine: 13 },
  { stepId: 'return-result', startLine: 6, endLine: 6 },
];
