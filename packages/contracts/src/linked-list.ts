import { z } from 'zod';
export const LINKED_LESSON_VERSION = '206-v1';
export const LINKED_TEST_SUITE_VERSION = '206-tests-v1';
export const LINKED_STARTER_SOURCE = `class Solution {
    public ListNode reverseList(ListNode head) {
        // 返回反转后的头节点；复用原节点，不修改节点的值。
        throw new UnsupportedOperationException("请完成 reverseList 方法");
    }
}
`;
export const LIST_NODE_SOURCE = `public class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
`;
export const LinkedListInputSchema = z.strictObject({ head: z.array(z.number().int().min(-5000).max(5000)).max(5000) });
export const ListGraphSchema = z.strictObject({ kind: z.literal('list-graph'), headId: z.string().nullable(), nodes: z.array(z.strictObject({ id: z.string().min(1), value: z.number().int(), nextId: z.string().nullable() })).max(5001) });
export type LinkedListInput = z.infer<typeof LinkedListInputSchema>;
export type ListGraph = z.infer<typeof ListGraphSchema>;
/** Original object identity order, not just reversed values. Nodes serialized in original ID order. */
export function expectedReversedList(input: LinkedListInput): ListGraph {
  return { kind: 'list-graph', headId: input.head.length ? `h${input.head.length - 1}` : null, nodes: input.head.map((value, i) => ({ id: `h${i}`, value, nextId: i ? `h${i - 1}` : null })) };
}
