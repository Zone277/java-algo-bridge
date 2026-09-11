export const ALGORITHM_VERSION = '21-dummy-merge-v1';

export const STARTER_SOURCE = `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // 复用输入节点，把两条非降序链合并后返回头引用。
        throw new UnsupportedOperationException("请完成 mergeTwoLists 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'create-dummy', startLine: 3, endLine: 3 },
  { stepId: 'init-tail', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'choose-source', startLine: 6, endLine: 6 },
  { stepId: 'attach-list1', startLine: 7, endLine: 7 },
  { stepId: 'move-list1', startLine: 8, endLine: 8 },
  { stepId: 'attach-list2', startLine: 10, endLine: 10 },
  { stepId: 'move-list2', startLine: 11, endLine: 11 },
  { stepId: 'move-tail', startLine: 13, endLine: 13 },
  { stepId: 'attach-remainder', startLine: 15, endLine: 15 },
  { stepId: 'return-head', startLine: 16, endLine: 16 },
];

export const WRONG_NEW_NODES_SOURCE = `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null || list2 != null) {
            if (list2 == null || (list1 != null && list1.val <= list2.val)) {
                tail.next = new ListNode(list1.val);
                list1 = list1.next;
            } else {
                tail.next = new ListNode(list2.val);
                list2 = list2.next;
            }
            tail = tail.next;
        }
        return dummy.next;
    }
}
`;

export const WRONG_MISSING_REMAINDER_SOURCE = `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        return dummy.next;
    }
}
`;

export const WRONG_CYCLE_SOURCE = `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = tail;
        return dummy.next;
    }
}
`;
