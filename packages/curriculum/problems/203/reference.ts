export const ALGORITHM_VERSION = '203-dummy-filter-v1';

export const STARTER_SOURCE = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        // 返回删除所有值为 val 的节点后得到的链表头引用。
        throw new UnsupportedOperationException("请完成 removeElements 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode curr = dummy;
        while (curr.next != null) {
            if (curr.next.val == val) {
                curr.next = curr.next.next;
            } else {
                curr = curr.next;
            }
        }
        return dummy.next;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'create-dummy', startLine: 3, endLine: 3 },
  { stepId: 'link-head', startLine: 4, endLine: 4 },
  { stepId: 'init-curr', startLine: 5, endLine: 5 },
  { stepId: 'check-loop', startLine: 6, endLine: 6 },
  { stepId: 'check-value', startLine: 7, endLine: 7 },
  { stepId: 'skip-node', startLine: 8, endLine: 8 },
  { stepId: 'move-curr', startLine: 10, endLine: 10 },
  { stepId: 'return-head', startLine: 13, endLine: 13 },
] as const;

export const WRONG_ONLY_FIRST_SOURCE = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode curr = dummy;
        if (curr.next != null && curr.next.val == val) {
            curr.next = curr.next.next;
        }
        return dummy.next;
    }
}
`;

export const WRONG_ADVANCE_AFTER_DELETE_SOURCE = `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode curr = dummy;
        while (curr.next != null) {
            if (curr.next.val == val) {
                curr.next = curr.next.next;
            }
            curr = curr.next;
        }
        return dummy.next;
    }
}
`;
