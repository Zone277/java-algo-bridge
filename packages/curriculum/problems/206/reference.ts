export const ALGORITHM_VERSION = '206-reverse-v1';
export const REFERENCE_SOURCE = `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
`;
export const REFERENCE_STEP_MAP = [
  { stepId: 'init-prev', startLine: 3, endLine: 3 },
  { stepId: 'init-curr', startLine: 4, endLine: 4 },
  { stepId: 'check-loop', startLine: 5, endLine: 5 },
  { stepId: 'save-next', startLine: 6, endLine: 6 },
  { stepId: 'reverse-next', startLine: 7, endLine: 7 },
  { stepId: 'move-prev', startLine: 8, endLine: 8 },
  { stepId: 'move-curr', startLine: 9, endLine: 9 },
  { stepId: 'return-prev', startLine: 11, endLine: 11 },
];
