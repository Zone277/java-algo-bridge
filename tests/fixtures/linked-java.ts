export const alternateReverse = `class Solution {
    public ListNode reverseList(ListNode start) {
        ListNode result = null;
        for (ListNode cursor = start; cursor != null; ) {
            ListNode saved = cursor.next;
            cursor.next = result;
            result = cursor;
            cursor = saved;
        }
        return result;
    }
}
`;
export const cycleList = 'class Solution { public ListNode reverseList(ListNode head) { if (head != null) head.next = head; return head; } }';
export const loseNext = 'class Solution { public ListNode reverseList(ListNode head) { ListNode prev = null; ListNode curr = head; while (curr != null) { curr.next = prev; prev = curr; curr = curr.next; } return prev; } }';
export const cloneReverse = 'class Solution { public ListNode reverseList(ListNode head) { ListNode result = null; while (head != null) { result = new ListNode(head.val, result); head = head.next; } return result; } }';
export const reverseValues = 'class Solution { public ListNode reverseList(ListNode head) { java.util.ArrayList<ListNode> nodes = new java.util.ArrayList<>(); for (ListNode n = head; n != null; n = n.next) nodes.add(n); for (int i=0,j=nodes.size()-1;i<j;i++,j--) { int value=nodes.get(i).val; nodes.get(i).val=nodes.get(j).val; nodes.get(j).val=value; } return head; } }';
