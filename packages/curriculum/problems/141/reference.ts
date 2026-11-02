export const ALGORITHM_VERSION = '141-floyd-cycle-v1';

export const STARTER_SOURCE = `class Solution {
    public boolean hasCycle(ListNode head) {
        // 使用节点身份与 next 引用判断是否存在环。
        throw new UnsupportedOperationException("请完成 hasCycle 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                return true;
            }
        }
        return false;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-slow', startLine: 3, endLine: 3 },
  { stepId: 'init-fast', startLine: 4, endLine: 4 },
  { stepId: 'check-fast', startLine: 5, endLine: 5 },
  { stepId: 'check-fast-next', startLine: 5, endLine: 5 },
  { stepId: 'move-slow', startLine: 6, endLine: 6 },
  { stepId: 'move-fast', startLine: 7, endLine: 7 },
  { stepId: 'compare-runners', startLine: 8, endLine: 8 },
  { stepId: 'return-true', startLine: 9, endLine: 9 },
  { stepId: 'return-false', startLine: 12, endLine: 12 },
];

export const WRONG_COMPARE_FIRST_SOURCE = `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            if (slow == fast) return true;
            slow = slow.next;
            fast = fast.next.next;
        }
        return false;
    }
}
`;

export const WRONG_UNSAFE_FAST_SOURCE = `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
`;
