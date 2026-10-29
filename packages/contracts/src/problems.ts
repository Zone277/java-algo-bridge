import { z } from 'zod';
import { LinkedListInputSchema, ListGraphSchema, expectedReversedList, type ListGraph } from './linked-list.js';

export const JAVA_INT_MIN = -2147483648;
export const JAVA_INT_MAX = 2147483647;
const javaInt = z.number().int().min(JAVA_INT_MIN).max(JAVA_INT_MAX);
const sorted = (values: readonly number[]) => values.every((value, index) => index === 0 || value >= values[index - 1]!);

export const ProblemIdSchema = z.enum(['704', '283', '977', '1', '20', '206', '21', '104', '70', '3', '35', '121', '217', '53', '167', '242', '88', '125', '169', '11', '209', '198', '153', '136', '746', '33', '392', '322', '724', '219', '560', '34', '202', '387', '69', '122', '144', '94', '268', '338']);
export type ProblemId = z.infer<typeof ProblemIdSchema>;
export const PROBLEM_ORDER = ['704', '283', '977', '1', '20', '206', '21', '104', '70', '3', '35', '121', '217', '53', '167', '242', '88', '125', '169', '11', '209', '198', '153', '136', '746', '33', '392', '322', '724', '219', '560', '34', '202', '387', '69', '122', '144', '94', '268', '338'] as const satisfies readonly ProblemId[];
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
  '35': { order: 11, number: 35, lessonVersion: '35-v1', testSuiteVersion: '35-tests-v1', title: '搜索插入位置', methodSignature: 'public int searchInsert(int[] nums, int target)' },
  '121': { order: 12, number: 121, lessonVersion: '121-v1', testSuiteVersion: '121-tests-v1', title: '买卖股票的最佳时机', methodSignature: 'public int maxProfit(int[] prices)' },
  '217': { order: 13, number: 217, lessonVersion: '217-v1', testSuiteVersion: '217-tests-v1', title: '存在重复元素', methodSignature: 'public boolean containsDuplicate(int[] nums)' },
  '53': { order: 14, number: 53, lessonVersion: '53-v1', testSuiteVersion: '53-tests-v1', title: '最大子数组和', methodSignature: 'public int maxSubArray(int[] nums)' },
  '167': { order: 15, number: 167, lessonVersion: '167-v1', testSuiteVersion: '167-tests-v1', title: '有序数组两数之和 II', methodSignature: 'public int[] twoSum(int[] numbers, int target)' },
  '242': { order: 16, number: 242, lessonVersion: '242-v1', testSuiteVersion: '242-tests-v1', title: '有效的字母异位词', methodSignature: 'public boolean isAnagram(String s, String t)' },
  '88': { order: 17, number: 88, lessonVersion: '88-v1', testSuiteVersion: '88-tests-v1', title: '合并两个有序数组', methodSignature: 'public void merge(int[] nums1, int m, int[] nums2, int n)' },
  '125': { order: 18, number: 125, lessonVersion: '125-v1', testSuiteVersion: '125-tests-v1', title: '验证回文串', methodSignature: 'public boolean isPalindrome(String s)' },
  '169': { order: 19, number: 169, lessonVersion: '169-v1', testSuiteVersion: '169-tests-v1', title: '多数元素', methodSignature: 'public int majorityElement(int[] nums)' },
  '11': { order: 20, number: 11, lessonVersion: '11-v1', testSuiteVersion: '11-tests-v1', title: '盛最多水的容器', methodSignature: 'public int maxArea(int[] height)' },
  '209': { order: 21, number: 209, lessonVersion: '209-v1', testSuiteVersion: '209-tests-v1', title: '长度最小的子数组', methodSignature: 'public int minSubArrayLen(int target, int[] nums)' },
  '198': { order: 22, number: 198, lessonVersion: '198-v1', testSuiteVersion: '198-tests-v1', title: '打家劫舍', methodSignature: 'public int rob(int[] nums)' },
  '153': { order: 23, number: 153, lessonVersion: '153-v1', testSuiteVersion: '153-tests-v1', title: '寻找旋转排序数组中的最小值', methodSignature: 'public int findMin(int[] nums)' },
  '136': { order: 24, number: 136, lessonVersion: '136-v1', testSuiteVersion: '136-tests-v1', title: '只出现一次的数字', methodSignature: 'public int singleNumber(int[] nums)' },
  '746': { order: 25, number: 746, lessonVersion: '746-v1', testSuiteVersion: '746-tests-v1', title: '使用最小花费爬楼梯', methodSignature: 'public int minCostClimbingStairs(int[] cost)' },
  '33': { order: 26, number: 33, lessonVersion: '33-v1', testSuiteVersion: '33-tests-v1', title: '搜索旋转排序数组', methodSignature: 'public int search(int[] nums, int target)' },
  '392': { order: 27, number: 392, lessonVersion: '392-v1', testSuiteVersion: '392-tests-v1', title: '判断子序列', methodSignature: 'public boolean isSubsequence(String s, String t)' },
  '322': { order: 28, number: 322, lessonVersion: '322-v1', testSuiteVersion: '322-tests-v1', title: '零钱兑换', methodSignature: 'public int coinChange(int[] coins, int amount)' },
  '724': { order: 29, number: 724, lessonVersion: '724-v1', testSuiteVersion: '724-tests-v1', title: '寻找数组中心下标', methodSignature: 'public int pivotIndex(int[] nums)' },
  '219': { order: 30, number: 219, lessonVersion: '219-v1', testSuiteVersion: '219-tests-v1', title: '存在重复元素 II', methodSignature: 'public boolean containsNearbyDuplicate(int[] nums, int k)' },
  '560': { order: 31, number: 560, lessonVersion: '560-v1', testSuiteVersion: '560-tests-v1', title: '和为 K 的子数组', methodSignature: 'public int subarraySum(int[] nums, int k)' },
  '34': { order: 32, number: 34, lessonVersion: '34-v1', testSuiteVersion: '34-tests-v1', title: '在排序数组中查找元素的第一个和最后一个位置', methodSignature: 'public int[] searchRange(int[] nums, int target)' },
  '202': { order: 33, number: 202, lessonVersion: '202-v1', testSuiteVersion: '202-tests-v1', title: '快乐数', methodSignature: 'public boolean isHappy(int n)' },
  '387': { order: 34, number: 387, lessonVersion: '387-v1', testSuiteVersion: '387-tests-v1', title: '字符串中的第一个唯一字符', methodSignature: 'public int firstUniqChar(String s)' },
  '69': { order: 35, number: 69, lessonVersion: '69-v1', testSuiteVersion: '69-tests-v1', title: '整数平方根', methodSignature: 'public int mySqrt(int x)' },
  '122': { order: 36, number: 122, lessonVersion: '122-v1', testSuiteVersion: '122-tests-v1', title: '买卖股票的最佳时机 II', methodSignature: 'public int maxProfit(int[] prices)' },
  '144': { order: 37, number: 144, lessonVersion: '144-v1', testSuiteVersion: '144-tests-v1', title: '二叉树的前序遍历', methodSignature: 'public List<Integer> preorderTraversal(TreeNode root)' },
  '94': { order: 38, number: 94, lessonVersion: '94-v1', testSuiteVersion: '94-tests-v1', title: '二叉树的中序遍历', methodSignature: 'public List<Integer> inorderTraversal(TreeNode root)' },
  '268': { order: 39, number: 268, lessonVersion: '268-v1', testSuiteVersion: '268-tests-v1', title: '缺失的数字', methodSignature: 'public int missingNumber(int[] nums)' },
  '338': { order: 40, number: 338, lessonVersion: '338-v1', testSuiteVersion: '338-tests-v1', title: '比特位计数', methodSignature: 'public int[] countBits(int n)' },
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
export const SearchInsertInputSchema = BinarySearchInputSchema;
export const MaxProfitInputSchema = z.strictObject({ prices: z.array(z.number().int().min(0).max(10000)).min(1).max(10000) });
export const ContainsDuplicateInputSchema = z.strictObject({ nums: z.array(javaInt).min(1).max(10000) });
export const MaximumSubarrayInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-10000).max(10000)).min(1).max(10000) });
export const TwoSumSortedInputSchema = z.strictObject({ numbers: z.array(z.number().int().min(-1000).max(1000)).min(2).max(10000), target: z.number().int().min(-1000).max(1000) })
  .superRefine(({ numbers, target }, ctx) => {
    if (!sorted(numbers)) ctx.addIssue({ code: 'custom', message: 'numbers 必须非降序' });
    const seen = new Map<number, number>();
    let pairs = 0;
    for (const value of numbers) {
      pairs += seen.get(target - value) ?? 0;
      if (pairs > 1) break;
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    if (pairs !== 1) ctx.addIssue({ code: 'custom', message: '本站输入必须恰有一个由不同下标组成的解' });
  });
export const ValidAnagramInputSchema = z.strictObject({
  s: z.string().min(1).max(10000).regex(/^[a-z]+$/, 's 只能包含小写英文字母'),
  t: z.string().min(1).max(10000).regex(/^[a-z]+$/, 't 只能包含小写英文字母'),
});
export const MergeSortedArrayInputSchema = z.strictObject({
  nums1: z.array(z.number().int().min(-1000000000).max(1000000000)).min(1).max(400),
  m: z.number().int().min(0).max(200),
  nums2: z.array(z.number().int().min(-1000000000).max(1000000000)).max(200),
  n: z.number().int().min(0).max(200),
}).superRefine(({ nums1, m, nums2, n }, ctx) => {
  if (nums1.length !== m + n || nums2.length !== n) ctx.addIssue({ code: 'custom', message: 'nums1 长度必须等于 m+n，nums2 长度必须等于 n' });
  if (m + n > 200) ctx.addIssue({ code: 'custom', message: '本站 m+n 最多 200' });
  if (!sorted(nums1.slice(0, m)) || !sorted(nums2)) ctx.addIssue({ code: 'custom', message: '有效数组元素必须分别非降序' });
  if (nums1.slice(m).some(value => value !== 0)) ctx.addIssue({ code: 'custom', message: 'nums1 的 n 个预留位置必须为 0' });
});
export const ValidPalindromeInputSchema = z.strictObject({ s: z.string().min(1).max(10000).regex(/^[\x20-\x7e]+$/, 's 只能包含可打印 ASCII 字符') });
export const MajorityElementInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000000000).max(1000000000)).min(1).max(10000) })
  .superRefine(({ nums }, ctx) => {
    const counts = new Map<number, number>();
    for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
    if (![...counts.values()].some(count => count > nums.length / 2)) ctx.addIssue({ code: 'custom', message: '本站输入保证严格过半的多数元素' });
  });

export const ContainerWaterInputSchema = z.strictObject({ height: z.array(z.number().int().min(0).max(10000)).min(2).max(10000) });
export const MinimumSubarrayInputSchema = z.strictObject({ target: z.number().int().min(1).max(1000000000), nums: z.array(z.number().int().min(1).max(10000)).min(1).max(10000) });
export const HouseRobberInputSchema = z.strictObject({ nums: z.array(z.number().int().min(0).max(400)).min(1).max(100) });
export const RotatedMinimumInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-5000).max(5000)).min(1).max(5000) })
  .refine(({ nums }) => {
    if (new Set(nums).size !== nums.length) return false;
    let descents = 0;
    for (let i = 0; i < nums.length; i++) if (nums[i]! > nums[(i + 1) % nums.length]!) descents++;
    return descents <= 1;
  }, { message: 'nums 必须是互不相同的严格升序数组的一次旋转（允许原顺序）' });
export const SingleNumberInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-30000).max(30000)).min(1).max(10000) })
  .refine(({ nums }) => {
    const counts = new Map<number, number>();
    for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.values()].filter(count => count === 1).length === 1 && [...counts.values()].every(count => count === 1 || count === 2);
  }, { message: '必须恰有一个值出现一次，其余每个值出现两次；本站最多 10000 项' });
export const MinCostStairsInputSchema = z.strictObject({ cost: z.array(z.number().int().min(0).max(999)).min(2).max(1000) });

export const RotatedSearchInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-10000).max(10000)).min(1).max(5000), target: z.number().int().min(-10000).max(10000) })
  .refine(({ nums }) => {
    if (new Set(nums).size !== nums.length) return false;
    let descents = 0;
    for (let i = 0; i < nums.length; i++) if (nums[i]! > nums[(i + 1) % nums.length]!) descents++;
    return descents <= 1;
  }, { message: 'nums 必须是严格升序且无重复数组的旋转，允许原顺序' });
export const IsSubsequenceInputSchema = z.strictObject({ s: z.string().max(100).regex(/^[a-z]*$/), t: z.string().max(10000).regex(/^[a-z]*$/) });
export const CoinChangeInputSchema = z.strictObject({ coins: z.array(z.number().int().min(1).max(JAVA_INT_MAX)).min(1).max(12), amount: z.number().int().min(0).max(10000) });

export const PivotIndexInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000).max(1000)).min(1).max(10000) });
export const NearbyDuplicateInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000000000).max(1000000000)).min(1).max(10000), k: z.number().int().min(0).max(100000) });
export const SubarraySumInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000).max(1000)).min(1).max(10000), k: z.number().int().min(-10000000).max(10000000) });
export const SearchRangeInputSchema = z.strictObject({ nums: z.array(z.number().int().min(-1000000000).max(1000000000)).max(10000), target: z.number().int().min(-1000000000).max(1000000000) }).refine(({ nums }) => sorted(nums), { message: 'nums 必须非降序，可包含重复值' });
export const HappyNumberInputSchema = z.strictObject({ n: z.number().int().min(1).max(JAVA_INT_MAX) });
export const FirstUniqueCharInputSchema = z.strictObject({ s: z.string().min(1).max(10000).regex(/^[a-z]+$/) });
export const SqrtInputSchema = z.strictObject({ x: z.number().int().min(0).max(JAVA_INT_MAX) });
export const StockProfitIIInputSchema = z.strictObject({ prices: z.array(z.number().int().min(0).max(10000)).min(1).max(10000) });
export const MissingNumberInputSchema = z.strictObject({ nums: z.array(z.number().int().min(0).max(10000)).min(1).max(10000) })
  .refine(({ nums }) => new Set(nums).size === nums.length && nums.every(value => value <= nums.length), { message: 'nums 必须是 0..n 范围内互不相同的 n 个数，恰缺一项' });
export const CountingBitsInputSchema = z.strictObject({ n: z.number().int().min(0).max(9999) });

export const ProblemInputSchemas = Object.freeze({
  '69': SqrtInputSchema, '122': StockProfitIIInputSchema, '144': TreeInputSchema,
  '94': TreeInputSchema, '268': MissingNumberInputSchema, '338': CountingBitsInputSchema,
  '34': SearchRangeInputSchema, '202': HappyNumberInputSchema, '387': FirstUniqueCharInputSchema,
  '724': PivotIndexInputSchema, '219': NearbyDuplicateInputSchema, '560': SubarraySumInputSchema,
  '704': BinarySearchInputSchema, '283': MoveZeroesInputSchema, '977': SortedSquaresInputSchema, '1': TwoSumInputSchema,
  '20': ValidParenthesesInputSchema, '206': LinkedListInputSchema, '21': MergeListsInputSchema, '104': TreeInputSchema,
  '70': ClimbStairsInputSchema, '3': LongestSubstringInputSchema, '35': SearchInsertInputSchema,
  '121': MaxProfitInputSchema, '217': ContainsDuplicateInputSchema,
  '53': MaximumSubarrayInputSchema, '167': TwoSumSortedInputSchema, '242': ValidAnagramInputSchema,
  '88': MergeSortedArrayInputSchema, '125': ValidPalindromeInputSchema, '169': MajorityElementInputSchema,
  '11': ContainerWaterInputSchema, '209': MinimumSubarrayInputSchema, '198': HouseRobberInputSchema,
  '33': RotatedSearchInputSchema, '392': IsSubsequenceInputSchema, '322': CoinChangeInputSchema,
  '153': RotatedMinimumInputSchema, '136': SingleNumberInputSchema, '746': MinCostStairsInputSchema,
});
export const ProblemInputSchema = z.union([BinarySearchInputSchema, MoveZeroesInputSchema, SortedSquaresInputSchema, TwoSumInputSchema, ValidParenthesesInputSchema, LinkedListInputSchema, MergeListsInputSchema, TreeInputSchema, ClimbStairsInputSchema, LongestSubstringInputSchema, MaxProfitInputSchema, MaximumSubarrayInputSchema, TwoSumSortedInputSchema, ValidAnagramInputSchema, MergeSortedArrayInputSchema, ValidPalindromeInputSchema, MajorityElementInputSchema, ContainerWaterInputSchema, MinimumSubarrayInputSchema, HouseRobberInputSchema, RotatedMinimumInputSchema, SingleNumberInputSchema, MinCostStairsInputSchema, RotatedSearchInputSchema, IsSubsequenceInputSchema, CoinChangeInputSchema, PivotIndexInputSchema, NearbyDuplicateInputSchema, SubarraySumInputSchema, SearchRangeInputSchema, HappyNumberInputSchema, FirstUniqueCharInputSchema, SqrtInputSchema, StockProfitIIInputSchema, MissingNumberInputSchema, CountingBitsInputSchema]);
export type BinarySearchInput = z.infer<typeof BinarySearchInputSchema>;
export type MoveZeroesInput = z.infer<typeof MoveZeroesInputSchema>;
export type SortedSquaresInput = z.infer<typeof SortedSquaresInputSchema>;
export type TwoSumInput = z.infer<typeof TwoSumInputSchema>;
export type ValidParenthesesInput = z.infer<typeof ValidParenthesesInputSchema>;
export type MergeListsInput = z.infer<typeof MergeListsInputSchema>;
export type TreeInput = z.infer<typeof TreeInputSchema>;
export type ClimbStairsInput = z.infer<typeof ClimbStairsInputSchema>;
export type LongestSubstringInput = z.infer<typeof LongestSubstringInputSchema>;
export type SearchInsertInput = z.infer<typeof SearchInsertInputSchema>;
export type MaxProfitInput = z.infer<typeof MaxProfitInputSchema>;
export type ContainsDuplicateInput = z.infer<typeof ContainsDuplicateInputSchema>;
export type MaximumSubarrayInput = z.infer<typeof MaximumSubarrayInputSchema>;
export type TwoSumSortedInput = z.infer<typeof TwoSumSortedInputSchema>;
export type ValidAnagramInput = z.infer<typeof ValidAnagramInputSchema>;
export type MergeSortedArrayInput = z.infer<typeof MergeSortedArrayInputSchema>;
export type ValidPalindromeInput = z.infer<typeof ValidPalindromeInputSchema>;
export type MajorityElementInput = z.infer<typeof MajorityElementInputSchema>;
export type ContainerWaterInput = z.infer<typeof ContainerWaterInputSchema>;
export type MinimumSubarrayInput = z.infer<typeof MinimumSubarrayInputSchema>;
export type HouseRobberInput = z.infer<typeof HouseRobberInputSchema>;
export type RotatedMinimumInput = z.infer<typeof RotatedMinimumInputSchema>;
export type SingleNumberInput = z.infer<typeof SingleNumberInputSchema>;
export type MinCostStairsInput = z.infer<typeof MinCostStairsInputSchema>;
export type RotatedSearchInput = z.infer<typeof RotatedSearchInputSchema>;
export type IsSubsequenceInput = z.infer<typeof IsSubsequenceInputSchema>;
export type CoinChangeInput = z.infer<typeof CoinChangeInputSchema>;
export type PivotIndexInput = z.infer<typeof PivotIndexInputSchema>;
export type NearbyDuplicateInput = z.infer<typeof NearbyDuplicateInputSchema>;
export type SubarraySumInput = z.infer<typeof SubarraySumInputSchema>;
export type SearchRangeInput = z.infer<typeof SearchRangeInputSchema>;
export type HappyNumberInput = z.infer<typeof HappyNumberInputSchema>;
export type FirstUniqueCharInput = z.infer<typeof FirstUniqueCharInputSchema>;
export type SqrtInput = z.infer<typeof SqrtInputSchema>;
export type StockProfitIIInput = z.infer<typeof StockProfitIIInputSchema>;
export type MissingNumberInput = z.infer<typeof MissingNumberInputSchema>;
export type CountingBitsInput = z.infer<typeof CountingBitsInputSchema>;
export type ProblemInputMap = {
  '69': SqrtInput; '122': StockProfitIIInput; '144': TreeInput;
  '94': TreeInput; '268': MissingNumberInput; '338': CountingBitsInput;
  '34': SearchRangeInput; '202': HappyNumberInput; '387': FirstUniqueCharInput;
  '724': PivotIndexInput; '219': NearbyDuplicateInput; '560': SubarraySumInput;
  '33': RotatedSearchInput; '392': IsSubsequenceInput; '322': CoinChangeInput;
  '704': BinarySearchInput; '283': MoveZeroesInput; '977': SortedSquaresInput; '1': TwoSumInput;
  '20': ValidParenthesesInput; '206': z.infer<typeof LinkedListInputSchema>; '21': MergeListsInput; '104': TreeInput;
  '70': ClimbStairsInput; '3': LongestSubstringInput; '35': SearchInsertInput; '121': MaxProfitInput;
  '217': ContainsDuplicateInput;
  '53': MaximumSubarrayInput; '167': TwoSumSortedInput; '242': ValidAnagramInput;
  '88': MergeSortedArrayInput; '125': ValidPalindromeInput; '169': MajorityElementInput;
  '11': ContainerWaterInput; '209': MinimumSubarrayInput; '198': HouseRobberInput;
  '153': RotatedMinimumInput; '136': SingleNumberInput; '746': MinCostStairsInput;
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
    case '94': {
      // Explicit stack oracle, independent of the recursive reference Java solution.
      const tokens = (input as TreeInput).root;
      if (tokens.length === 0) return { kind: 'int-array', values: [] };
      const nodes: { value: number; left: number | null; right: number | null }[] = [{ value: tokens[0]!, left: null, right: null }];
      const queue = [0]; let cursor = 1;
      for (let parent = 0; parent < queue.length && cursor < tokens.length; parent++) {
        for (const side of ['left', 'right'] as const) {
          if (cursor >= tokens.length) break;
          const value = tokens[cursor++];
          if (value !== null) { const index = nodes.length; nodes.push({ value: value!, left: null, right: null }); nodes[queue[parent]!]![side] = index; queue.push(index); }
        }
      }
      const values: number[] = []; const stack: number[] = []; let current: number | null = 0;
      while (current !== null || stack.length) {
        while (current !== null) { stack.push(current); current = nodes[current]!.left; }
        const index = stack.pop()!; const node = nodes[index]!;
        values.push(node.value); current = node.right;
      }
      return { kind: 'int-array', values };
    }
    case '268': {
      const nums = (input as MissingNumberInput).nums;
      const seen = new Uint8Array(nums.length + 1);
      for (const value of nums) seen[value] = 1;
      return { kind: 'int', value: seen.indexOf(0) };
    }
    case '338': {
      const { n } = input as CountingBitsInput;
      const values = Array.from({ length: n + 1 }, (_, value) => {
        let bits = 0; let x = value;
        while (x !== 0) { x &= x - 1; bits++; }
        return bits;
      });
      return { kind: 'int-array', values };
    }
    case '69': return { kind: 'int', value: Math.floor(Math.sqrt((input as SqrtInput).x)) };
    case '122': {
      // Two-state dynamic program, independent of the taught sum-of-rises greedy scan.
      const prices = (input as StockProfitIIInput).prices;
      let cash = 0; let hold = -prices[0]!;
      for (let day = 1; day < prices.length; day++) {
        const previousCash = cash;
        cash = Math.max(cash, hold + prices[day]!);
        hold = Math.max(hold, previousCash - prices[day]!);
      }
      return { kind: 'int', value: cash };
    }
    case '144': {
      // Iterative stack oracle, independent of the recursive reference Java implementation.
      const tokens = (input as TreeInput).root;
      if (tokens.length === 0) return { kind: 'int-array', values: [] };
      const nodes: { value: number; left: number | null; right: number | null }[] = [{ value: tokens[0]!, left: null, right: null }];
      const queue = [0]; let cursor = 1;
      for (let parent = 0; parent < queue.length && cursor < tokens.length; parent++) {
        for (const side of ['left', 'right'] as const) {
          if (cursor >= tokens.length) break;
          const value = tokens[cursor++];
          if (value !== null) { const index = nodes.length; nodes.push({ value: value!, left: null, right: null }); nodes[queue[parent]!]![side] = index; queue.push(index); }
        }
      }
      const values: number[] = []; const stack = [0];
      while (stack.length) {
        const node = nodes[stack.pop()!]!; values.push(node.value);
        if (node.right !== null) stack.push(node.right);
        if (node.left !== null) stack.push(node.left);
      }
      return { kind: 'int-array', values };
    }
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
    case '35': {
      const item = input as SearchInsertInput; let left = 0; let right = item.nums.length;
      while (left < right) { const mid = left + Math.floor((right - left) / 2); if (item.nums[mid]! < item.target) left = mid + 1; else right = mid; }
      return { kind: 'int', value: left };
    }
    case '121': {
      const prices = (input as MaxProfitInput).prices; let minimum = prices[0]!; let best = 0;
      for (let day = 1; day < prices.length; day++) { best = Math.max(best, prices[day]! - minimum); minimum = Math.min(minimum, prices[day]!); }
      return { kind: 'int', value: best };
    }
    case '217': {
      const nums = (input as ContainsDuplicateInput).nums;
      return { kind: 'boolean', value: new Set(nums).size !== nums.length };
    }
    case '53': {
      const nums = (input as MaximumSubarrayInput).nums;
      let prefix = 0; let minimumPrefix = 0; let best = Number.NEGATIVE_INFINITY;
      for (const value of nums) { prefix += value; best = Math.max(best, prefix - minimumPrefix); minimumPrefix = Math.min(minimumPrefix, prefix); }
      return { kind: 'int', value: best };
    }
    case '167': {
      const item = input as TwoSumSortedInput;
      const seen = new Map<number, number>();
      for (let index = 0; index < item.numbers.length; index++) {
        const earlier = seen.get(item.target - item.numbers[index]!);
        if (earlier !== undefined) return { kind: 'int-array', values: [earlier + 1, index + 1] };
        seen.set(item.numbers[index]!, index);
      }
      throw new Error('TwoSumSortedInput contract promised one pair');
    }
    case '242': {
      const { s, t } = input as ValidAnagramInput;
      if (s.length !== t.length) return { kind: 'boolean', value: false };
      const counts = Array<number>(26).fill(0);
      for (let index = 0; index < s.length; index++) { counts[s.charCodeAt(index) - 97]!++; counts[t.charCodeAt(index) - 97]!--; }
      return { kind: 'boolean', value: counts.every(count => count === 0) };
    }
    case '88': {
      const { nums1, m, nums2 } = input as MergeSortedArrayInput;
      return { kind: 'int-array', values: [...nums1.slice(0, m), ...nums2].sort((a, b) => a - b) };
    }
    case '125': {
      const normalized = (input as ValidPalindromeInput).s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return { kind: 'boolean', value: normalized === [...normalized].reverse().join('') };
    }
    case '169': {
      const nums = (input as MajorityElementInput).nums;
      const counts = new Map<number, number>();
      for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
      const winner = [...counts].find(([, count]) => count > nums.length / 2);
      if (!winner) throw new Error('MajorityElementInput contract promised a majority');
      return { kind: 'int', value: winner[0] };
    }
    case '11': {
      // Process bars by descending height, independently of the reference two-pointer scan.
      const height = (input as ContainerWaterInput).height;
      const indices = height.map((_, index) => index).sort((a, b) => height[b]! - height[a]!);
      let left = height.length; let right = -1; let best = 0;
      for (const index of indices) {
        left = Math.min(left, index); right = Math.max(right, index);
        best = Math.max(best, height[index]! * (right - left));
      }
      return { kind: 'int', value: best };
    }
    case '209': {
      const { nums, target } = input as MinimumSubarrayInput;
      const prefix = [0];
      for (const value of nums) prefix.push(prefix.at(-1)! + value);
      let best = nums.length + 1;
      for (let start = 0; start < nums.length; start++) {
        const threshold = prefix[start]! + target;
        let low = start + 1; let high = prefix.length;
        while (low < high) {
          const mid = low + Math.floor((high - low) / 2);
          if (prefix[mid]! < threshold) low = mid + 1; else high = mid;
        }
        if (low < prefix.length) best = Math.min(best, low - start);
      }
      return { kind: 'int', value: best > nums.length ? 0 : best };
    }
    case '198': {
      const nums = (input as HouseRobberInput).nums;
      const dp = Array<number>(nums.length + 1).fill(0);
      for (let count = 1; count <= nums.length; count++) dp[count] = Math.max(dp[count - 1]!, (count > 1 ? dp[count - 2]! : 0) + nums[count - 1]!);
      return { kind: 'int', value: dp[nums.length]! };
    }
    case '724': {
      const { nums } = input as PivotIndexInput;
      const prefix = [0]; const suffix = Array<number>(nums.length + 1).fill(0);
      for (const value of nums) prefix.push(prefix[prefix.length - 1]! + value);
      for (let i = nums.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1]! + nums[i]!;
      return { kind: 'int', value: nums.findIndex((_, i) => prefix[i] === suffix[i + 1]) };
    }
    case '219': {
      // Group by value and order by index; adjacent occurrences minimize distance.
      const { nums, k } = input as NearbyDuplicateInput;
      const pairs = nums.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value || a.index - b.index);
      return { kind: 'boolean', value: pairs.some((pair, i) => i > 0 && pair.value === pairs[i - 1]!.value && pair.index - pairs[i - 1]!.index <= k) };
    }
    case '560': {
      // Build all prefix-position lists, then count earlier positions with binary search.
      const { nums, k } = input as SubarraySumInput;
      const prefix = [0]; const positions = new Map<number, number[]>([[0, [0]]]);
      for (let i = 0; i < nums.length; i++) {
        const sum = prefix[i]! + nums[i]!; prefix.push(sum);
        const list = positions.get(sum) ?? []; list.push(i + 1); positions.set(sum, list);
      }
      let count = 0;
      for (let end = 1; end < prefix.length; end++) {
        const list = positions.get(prefix[end]! - k) ?? [];
        let low = 0; let high = list.length;
        while (low < high) { const mid = low + Math.floor((high - low) / 2); if (list[mid]! < end) low = mid + 1; else high = mid; }
        count += low;
      }
      return { kind: 'int', value: count };
    }
    case '34': {
      // A linear independent oracle; the taught reference uses two binary searches.
      const { nums, target } = input as SearchRangeInput;
      let first = -1; let last = -1;
      for (let index = 0; index < nums.length; index++) if (nums[index] === target) { if (first === -1) first = index; last = index; }
      return { kind: 'int-array', values: [first, last] };
    }
    case '202': {
      // Floyd cycle detection is independent of the taught visited-set reference.
      const { n } = input as HappyNumberInput;
      const next = (value: number) => { let sum = 0; while (value > 0) { const digit = value % 10; sum += digit * digit; value = Math.floor(value / 10); } return sum; };
      let slow = n; let fast = next(n);
      while (fast !== 1 && slow !== fast) { slow = next(slow); fast = next(next(fast)); }
      return { kind: 'boolean', value: fast === 1 };
    }
    case '387': {
      // Track first position and count independently of the reference's int[26].
      const { s } = input as FirstUniqueCharInput;
      const seen = new Map<string, { first: number; count: number }>();
      for (let index = 0; index < s.length; index++) {
        const char = s[index]!; const entry = seen.get(char);
        if (entry) entry.count++; else seen.set(char, { first: index, count: 1 });
      }
      let answer = -1;
      for (const entry of seen.values()) if (entry.count === 1 && (answer === -1 || entry.first < answer)) answer = entry.first;
      return { kind: 'int', value: answer };
    }
    case '33': { const { nums, target } = input as RotatedSearchInput; return { kind: 'int', value: nums.indexOf(target) }; }
    case '392': {
      // Indexed character positions with upper-bound queries, independent of the two-pointer model.
      const { s, t } = input as IsSubsequenceInput;
      const positions = new Map<string, number[]>();
      for (let i = 0; i < t.length; i++) { const list = positions.get(t[i]!) ?? []; list.push(i); positions.set(t[i]!, list); }
      let previous = -1;
      for (const char of s) {
        const list = positions.get(char) ?? [];
        let low = 0; let high = list.length;
        while (low < high) { const mid = low + Math.floor((high - low) / 2); if (list[mid]! <= previous) low = mid + 1; else high = mid; }
        if (low === list.length) return { kind: 'boolean', value: false };
        previous = list[low]!;
      }
      return { kind: 'boolean', value: true };
    }
    case '322': {
      // Breadth-first search by coin count, independent of bottom-up minimum-cost DP.
      const { coins, amount } = input as CoinChangeInput;
      const distance = Array<number>(amount + 1).fill(-1); distance[0] = 0;
      const queue = [0];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const value = queue[cursor]!;
        if (value === amount) return { kind: 'int', value: distance[value]! };
        for (const coin of coins) {
          if (coin > amount - value) continue;
          const next = value + coin;
          if (distance[next] === -1) { distance[next] = distance[value]! + 1; queue.push(next); }
        }
      }
      return { kind: 'int', value: -1 };
    }
    case '153': return { kind: 'int', value: Math.min(...(input as RotatedMinimumInput).nums) };
    case '136': {
      const counts = new Map<number, number>();
      for (const value of (input as SingleNumberInput).nums) counts.set(value, (counts.get(value) ?? 0) + 1);
      return { kind: 'int', value: [...counts].find(([, count]) => count === 1)![0] };
    }
    case '746': {
      // Independent backward cost-to-go recurrence; reference teaches forward arrival costs.
      const { cost } = input as MinCostStairsInput;
      const remaining = Array<number>(cost.length + 2).fill(0);
      for (let i = cost.length - 1; i >= 0; i--) remaining[i] = cost[i]! + Math.min(remaining[i + 1]!, remaining[i + 2]!);
      return { kind: 'int', value: Math.min(remaining[0]!, remaining[1]!) };
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
  if (problemId === '167') {
    const item = input as TwoSumSortedInput;
    const passed = actual.kind === 'int-array' && actual.values.length === 2 &&
      Number.isInteger(actual.values[0]) && Number.isInteger(actual.values[1]) &&
      actual.values[0]! >= 1 && actual.values[0]! < actual.values[1]! && actual.values[1]! <= item.numbers.length &&
      item.numbers[actual.values[0]! - 1]! + item.numbers[actual.values[1]! - 1]! === item.target;
    return { expected, passed, message: passed ? '返回了按升序排列的两个合法 1 起始下标。' : '必须返回 1 起始且 index1 < index2 的两个合法下标，元素之和为 target。' };
  }
  if (problemId === '206' || problemId === '21') { const result = judgeListStructure(problemId, input as never, actual); return { expected, ...result }; }
  const passed = equalOutput(expected, actual);
  return { expected, passed, message: passed ? '真实返回值符合本站判定。' : `真实返回值与本站期望不符。` };
}
