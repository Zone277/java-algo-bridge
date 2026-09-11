import { z } from 'zod';
import { LinkedListInputSchema, ListGraphSchema, expectedReversedList, type ListGraph } from './linked-list.js';

export const JAVA_INT_MIN = -2147483648;
export const JAVA_INT_MAX = 2147483647;
const javaInt = z.number().int().min(JAVA_INT_MIN).max(JAVA_INT_MAX);
const sorted = (values: readonly number[]) => values.every((value, index) => index === 0 || value >= values[index - 1]!);

export const ProblemIdSchema = z.enum(['704', '283', '977', '1', '20', '206', '21', '104', '70', '3']);
export type ProblemId = z.infer<typeof ProblemIdSchema>;
export const PROBLEM_ORDER = ['704', '283', '977', '1', '20', '206', '21', '104', '70', '3'] as const satisfies readonly ProblemId[];
export const PROBLEM_META = Object.freeze({
  '704': { order: 1, number: 704, lessonVersion: '704-v1', testSuiteVersion: '704-tests-v2', title: '二分查找', methodSignature: 'public int search(int[] nums, int target)' },
  '283': { order: 2, number: 283, lessonVersion: '283-v1', testSuiteVersion: '283-tests-v1', title: '移动零', methodSignature: 'public void moveZeroes(int[] nums)' },
  '977': { order: 3, number: 977, lessonVersion: '977-v1', testSuiteVersion: '977-tests-v1', title: '有序数组的平方', methodSignature: 'public int[] sortedSquares(int[] nums)' },
  '1': { order: 4, number: 1, lessonVersion: '1-v1', testSuiteVersion: '1-tests-v1', title: '两数之和', methodSignature: 'public int[] twoSum(int[] nums, int target)' },
  '20': { order: 5, number: 20, lessonVersion: '20-v1', testSuiteVersion: '20-tests-v1', title: '有效的括号', methodSignature: 'public boolean isValid(String s)' },
  '206': { order: 6, number: 206, lessonVersion: '206-v1', testSuiteVersion: '206-tests-v1', title: '反转链表', methodSignature: 'public ListNode reverseList(ListNode head)' },
  '21': { order: 7, number: 21, lessonVersion: '21-v1', testSuiteVersion: '21-tests-v1', title: '合并两个有序链表', methodSignature: 'public ListNode mergeTwoLists(ListNode list1, ListNode list2)' },
  '104': { order: 8, number: 104, lessonVersion: '104-v1', testSuiteVersion: '104-tests-v1', title: '二叉树的最大深度', methodSignature: 'public int maxDepth(TreeNode root)' },
  '70': { order: 9, number: 70, lessonVersion: '70-v1', testSuiteVersion: '70-tests-v1', title: '爬楼梯', methodSignature: 'public int climbStairs(int n)' },
  '3': { order: 10, number: 3, lessonVersion: '3-v1', testSuiteVersion: '3-tests-v1', title: '无重复字符的最长子串', methodSignature: 'public int lengthOfLongestSubstring(String s)' },
} satisfies Record<ProblemId, { order: number; number: number; lessonVersion: string; testSuiteVersion: string; title: string; methodSignature: string }>);

export const BinarySearchInputSchema = z.strictObject({
  nums: z.array(z.number().int().min(-9999).max(9999)).min(1).max(10000),
  target: z.number().int().min(-9999).max(9999),
}).refine(({ nums }) => nums.every((n, i) => i === 0 || n > nums[i - 1]!), { message: 'nums 必须严格升序且不重复' });
export const MoveZeroesInputSchema = z.strictObject({ nums: z.array(javaInt).min(1).max(10000) });
export const SortedSquaresInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-10000).max(10000)).min(1).max(10000) })
  .refine(({ nums }) => sorted(nums), { message: 'nums 必须非降序' });
export const TwoSumInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000000000).max(1000000000)).min(2).max(10000), target: z.number().int().min(-1000000000).max(1000000000) })
  .superRefine(({ nums, target }, ctx) => {
    const seen = new Map<number, number>();
    let pairs = 0;
    for (const value of nums) {
      pairs += seen.get(target - value) ?? 0;
      if (pairs > 1) break;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    if (pairs !== 1) ctx.addIssue({ code: 'custom', message: '本站输入必须恰有一个由不同下标组成的解' });
  });
export const ValidParenthesesInputSchema = z.strictObject({ s: z.string().min(1).max(10000).refine(value => [...value].every(char => '()[]{}'.includes(char)), 's 只能包含 ()[]{}') });
export const MergeListsInputSchema = z.strictObject({
  list1: z.array(z.number().int().min(-100).max(100)).max(50),
  list2: z.array(z.number().int().min(-100).max(100)).max(50),
}).refine(({ list1, list2 }) => sorted(list1) && sorted(list2), { message: 'list1 与 list2 必须分别非降序' });

function inspectCompactTree(tokens: readonly (number | null)[]) {
  if (tokens.length === 0) return { valid: true, depth: 0, count: 0 };
  if (tokens[0] === null) return { valid: false, depth: 0, count: 0 };
  let end = tokens.length;
  while (end > 1 && tokens[end - 1] === null) end--;
  const queue: number[] = [1];
  let cursor = 1;
  let count = 1;
  let maxDepth = 1;
  for (let parent = 0; parent < queue.length && cursor < end; parent++) {
    const depth = queue[parent]!;
    for (let side = 0; side < 2 && cursor < end; side++, cursor++) {
      if (tokens[cursor] !== null) { count++; maxDepth = Math.max(maxDepth, depth + 1); queue.push(depth + 1); }
    }
  }
  return { valid: cursor === end, depth: maxDepth, count };
}
export const TreeInputSchema = z.strictObject({ root: z.array(z.union([z.number().int().min(-100).max(100), z.null()])).max(2128) })
  .superRefine(({ root }, ctx) => {
    const result = inspectCompactTree(root);
    if (!result.valid) ctx.addIssue({ code: 'custom', message: 'root 必须是可达节点组成的紧凑队列式层序序列；根不能为 null，且不能含孤立数据' });
    if (result.count > 1000) ctx.addIssue({ code: 'custom', message: 'root 最多包含 1000 个非 null 节点' });
    if (result.depth > 128) ctx.addIssue({ code: 'custom', message: 'root 深度最多为 128' });
  });
export const ClimbStairsInputSchema = z.strictObject({ n: z.number().int().min(1).max(45) });
export const LongestSubstringInputSchema = z.strictObject({ s: z.string().max(10000).refine(value => [...value].every(char => char.codePointAt(0)! >= 0x20 && char.codePointAt(0)! <= 0x7e), 's 只能包含 U+0020—U+007E 的可打印 ASCII 字符') });

export const ProblemInputSchemas = Object.freeze({
  '704': BinarySearchInputSchema, '283': MoveZeroesInputSchema, '977': SortedSquaresInputSchema, '1': TwoSumInputSchema,
  '20': ValidParenthesesInputSchema, '206': LinkedListInputSchema, '21': MergeListsInputSchema, '104': TreeInputSchema,
  '70': ClimbStairsInputSchema, '3': LongestSubstringInputSchema,
});
export const ProblemInputSchema = z.union([BinarySearchInputSchema, MoveZeroesInputSchema, SortedSquaresInputSchema, TwoSumInputSchema, ValidParenthesesInputSchema, LinkedListInputSchema, MergeListsInputSchema, TreeInputSchema, ClimbStairsInputSchema, LongestSubstringInputSchema]);
export type BinarySearchInput = z.infer<typeof BinarySearchInputSchema>;
export type MoveZeroesInput = z.infer<typeof MoveZeroesInputSchema>;
export type SortedSquaresInput = z.infer<typeof SortedSquaresInputSchema>;
export type TwoSumInput = z.infer<typeof TwoSumInputSchema>;
export type ValidParenthesesInput = z.infer<typeof ValidParenthesesInputSchema>;
export type MergeListsInput = z.infer<typeof MergeListsInputSchema>;
export type TreeInput = z.infer<typeof TreeInputSchema>;
export type ClimbStairsInput = z.infer<typeof ClimbStairsInputSchema>;
export type LongestSubstringInput = z.infer<typeof LongestSubstringInputSchema>;
export type ProblemInputMap = {
  '704': BinarySearchInput; '283': MoveZeroesInput; '977': SortedSquaresInput; '1': TwoSumInput;
  '20': ValidParenthesesInput; '206': z.infer<typeof LinkedListInputSchema>; '21': MergeListsInput; '104': TreeInput;
  '70': ClimbStairsInput; '3': LongestSubstringInput;
};
export type ProblemInput = ProblemInputMap[ProblemId];

export const IntOutputSchema = z.strictObject({ kind: z.literal('int'), value: javaInt });
export const BooleanOutputSchema = z.strictObject({ kind: z.literal('boolean'), value: z.boolean() });
export const IntArrayOutputSchema = z.strictObject({ kind: z.literal('int-array'), values: z.array(javaInt).max(10000) });
export const OutputSchema = z.discriminatedUnion('kind', [IntOutputSchema, BooleanOutputSchema, IntArrayOutputSchema, ListGraphSchema]);
export type Output = z.infer<typeof OutputSchema>;
export const TREE_NODE_SOURCE = `public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
`;

export function parseProblemInput<I extends ProblemId>(problemId: I, input: unknown): ProblemInputMap[I] {
  return ProblemInputSchemas[problemId].parse(input) as ProblemInputMap[I];
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function expectedMergedList(input: MergeListsInput): ListGraph {
  const merged: string[] = [];
  let a = 0; let b = 0;
  while (a < input.list1.length && b < input.list2.length) {
    if (input.list1[a]! <= input.list2[b]!) merged.push(`a${a++}`); else merged.push(`b${b++}`);
  }
  while (a < input.list1.length) merged.push(`a${a++}`);
  while (b < input.list2.length) merged.push(`b${b++}`);
  const next = new Map(merged.map((current, index) => [current, merged[index + 1] ?? null]));
  return { kind: 'list-graph', headId: merged[0] ?? null, nodes: [
    ...input.list1.map((value, index) => ({ id: `a${index}`, value, nextId: next.get(`a${index}`) ?? null })),
    ...input.list2.map((value, index) => ({ id: `b${index}`, value, nextId: next.get(`b${index}`) ?? null })),
  ] };
}

function treeDepth(tokens: readonly (number | null)[]) { return inspectCompactTree(tokens).depth; }
export function expectedOutput<I extends ProblemId>(problemId: I, rawInput: ProblemInputMap[I]): Output {
  const input = parseProblemInput(problemId, rawInput) as ProblemInput;
  switch (problemId) {
    case '704': { const item = input as BinarySearchInput; return { kind: 'int', value: item.nums.indexOf(item.target) }; }
    case '283': { const values = [...(input as MoveZeroesInput).nums]; const nonzero = values.filter(value => value !== 0); return { kind: 'int-array', values: [...nonzero, ...Array(values.length - nonzero.length).fill(0)] }; }
    case '977': return { kind: 'int-array', values: (input as SortedSquaresInput).nums.map(value => value * value).sort((a, b) => a - b) };
    case '1': {
      const item = input as TwoSumInput;
      const seen = new Map<number, number>();
      for (let index = 0; index < item.nums.length; index++) { const other = seen.get(item.target - item.nums[index]!); if (other !== undefined) return { kind: 'int-array', values: [other, index] }; seen.set(item.nums[index]!, index); }
      throw new Error('TwoSumInput contract promised one pair');
    }
    case '20': {
      const stack: string[] = []; const matching: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      for (const char of (input as ValidParenthesesInput).s) { if ('([{'.includes(char)) stack.push(char); else if (stack.pop() !== matching[char]) return { kind: 'boolean', value: false }; }
      return { kind: 'boolean', value: stack.length === 0 };
    }
    case '206': return expectedReversedList(input as z.infer<typeof LinkedListInputSchema>);
    case '21': return expectedMergedList(input as MergeListsInput);
    case '104': return { kind: 'int', value: treeDepth((input as TreeInput).root) };
    case '70': { const n = (input as ClimbStairsInput).n; let previous = 1; let current = 2; for (let step = 3; step <= n; step++) [previous, current] = [current, previous + current]; return { kind: 'int', value: n === 1 ? 1 : current }; }
    case '3': {
      const s = (input as LongestSubstringInput).s; const last = new Map<string, number>(); let left = 0; let best = 0;
      for (let right = 0; right < s.length; right++) { left = Math.max(left, (last.get(s[right]!) ?? -1) + 1); last.set(s[right]!, right); best = Math.max(best, right - left + 1); }
      return { kind: 'int', value: best };
    }
  }
}

function equalOutput(a: Output, b: Output) { return stableJson(a) === stableJson(b); }
function judgeListStructure(problemId: '206' | '21', input: ProblemInputMap[typeof problemId], actual: Output) {
  if (actual.kind !== 'list-graph') return { passed: false, message: '返回类型不是平台要求的链表节点引用。' };
  if (problemId === '206') return { passed: equalOutput(expectedReversedList(input as z.infer<typeof LinkedListInputSchema>), actual), message: '必须复用所有原节点，保持值不变，严格反转 next 且无环。' };
  const item = input as MergeListsInput;
  const originals = new Map<string, { value: number; source: 'a' | 'b'; index: number }>();
  item.list1.forEach((value, index) => originals.set(`a${index}`, { value, source: 'a', index }));
  item.list2.forEach((value, index) => originals.set(`b${index}`, { value, source: 'b', index }));
  if (actual.nodes.length !== originals.size || new Set(actual.nodes.map(node => node.id)).size !== originals.size) return { passed: false, message: '输出必须恰好包含每个输入节点一次。' };
  const byId = new Map(actual.nodes.map(node => [node.id, node]));
  for (const [id, original] of originals) { const node = byId.get(id); if (!node || node.value !== original.value || (node.nextId !== null && !originals.has(node.nextId))) return { passed: false, message: '检测到新增/丢失节点、节点值变化或未知 next 引用。' }; }
  if ((actual.headId === null) !== (originals.size === 0) || (actual.headId !== null && !originals.has(actual.headId))) return { passed: false, message: '返回的头引用不是正确的输入节点。' };
  const visited = new Set<string>(); let id = actual.headId; let previousValue = Number.NEGATIVE_INFINITY; const lastIndex = { a: -1, b: -1 };
  while (id !== null) {
    if (visited.has(id) || visited.size >= originals.size) return { passed: false, message: '合并结果存在环或重复节点。' };
    const node = byId.get(id); const original = originals.get(id);
    if (!node || !original) return { passed: false, message: '合并结果引用未知节点。' };
    if (node.value < previousValue || original.index <= lastIndex[original.source]) return { passed: false, message: '合并结果未保持非降序或破坏了同一输入链的相对顺序。' };
    visited.add(id); previousValue = node.value; lastIndex[original.source] = original.index; id = node.nextId;
  }
  return { passed: visited.size === originals.size, message: visited.size === originals.size ? '返回链复用了全部输入节点，非降序且无环。' : '返回链丢失了输入节点。' };
}

export function judgeProblemOutput<I extends ProblemId>(problemId: I, input: ProblemInputMap[I], actual: Output): { passed: boolean; message: string; expected: Output } {
  const expected = expectedOutput(problemId, input);
  if (problemId === '1') {
    const item = input as TwoSumInput;
    const passed = actual.kind === 'int-array' && actual.values.length === 2 && actual.values.every(index => Number.isInteger(index) && index >= 0 && index < item.nums.length) && actual.values[0] !== actual.values[1] && item.nums[actual.values[0]!]! + item.nums[actual.values[1]!]! === item.target;
    return { expected, passed, message: passed ? '返回了两个不同的合法下标；下标顺序不限。' : '必须返回两个不同且范围合法的下标，它们对应元素之和应为 target。' };
  }
  if (problemId === '206' || problemId === '21') { const result = judgeListStructure(problemId, input as never, actual); return { expected, ...result }; }
  const passed = equalOutput(expected, actual);
  return { expected, passed, message: passed ? '真实返回值符合本站判定。' : `真实返回值与本站期望不符。` };
}
