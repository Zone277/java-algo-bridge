import { PROBLEM_META, SortedSquaresInputSchema, expectedOutput, type Lesson, type SortedSquaresInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_DESCENDING_SOURCE, WRONG_ORIGINAL_ORDER_SOURCE } from './reference.js';

type Lesson977 = Extract<Lesson, { id: '977' }>;
type Case977 = Lesson977['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: SortedSquaresInput }[] = [
  { id: 'mixed', title: '两端交替：[-7,-3,2,3,11]', input: { nums: [-7, -3, 2, 3, 11] } },
  { id: 'all-negative', title: '全为负数：[-9,-4,-1]', input: { nums: [-9, -4, -1] } },
  { id: 'duplicates', title: '重复平方：[-2,-2,0,2,2]', input: { nums: [-2, -2, 0, 2, 2] } },
];

function testCase(id: string, input: SortedSquaresInput, coverage: string): Case977 {
  const expected = expectedOutput('977', SortedSquaresInputSchema.parse(input));
  if (expected.kind !== 'int-array') throw new Error('977 expected output must be int-array');
  return { id, input, expected, coverage };
}

const cases: Case977[] = [
  testCase('mixed', demoInputs[0]!.input, '负数与正数混合，最大平方在左右端之间交替产生，并包含相同平方 9。'),
  testCase('all-negative', demoInputs[1]!.input, '全负数组；平方后的大小顺序与原数值顺序相反。'),
  testCase('all-positive', { nums: [1, 2, 5] }, '全正数组；右指针连续提供最大平方。'),
  testCase('singleton-zero', { nums: [0] }, '单元素零；left == right 时必须处理一次。'),
  testCase('singleton-negative', { nums: [-5] }, '单个负数，返回新数组中的正平方。'),
  testCase('duplicates', demoInputs[2]!.input, '输入可重复，左右相等平方都要各写入一次。'),
  testCase('value-bounds', { nums: [-10000, 10000] }, '本站值域两端；平方 100000000 仍在 Java int 范围。'),
  testCase('all-zero', { nums: [0, 0, 0] }, '多个零，验证循环次数、写指针和数组长度。'),
  testCase('even-mixed', { nums: [-5, -3, -2, 4, 8] }, '奇数个混合元素，左右端选择多次切换。'),
  testCase('zero-duplicates', { nums: [-3, -1, 0, 0, 2] }, '零重复且最小平方位于中间，结果前缀含两个零。'),
];

export const lesson977 = {
  schemaVersion: 1,
  id: '977',
  slug: 'squares-of-a-sorted-array',
  title: '有序数组的平方',
  order: 3,
  lessonVersion: PROBLEM_META['977'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '会用 new int[长度] 创建结果数组，并返回数组引用。',
    '从有序输入的两端比较平方，解释为何最大值一定来自端点。',
    '维护“结果数组已确定后缀”不变量，从末尾向前完成双指针算法。',
  ],
  source: { platform: 'LeetCode', number: 977, url: 'https://leetcode.com/problems/squares-of-a-sorted-array/' },
  taskSemantics: '给定一个按非降序排列的整数数组，把每个元素平方后按非降序放入一个新数组并返回。题意参考 LeetCode 977；本站题面、示例、推导和代码均为原创，与原平台无官方关联。',
  siteLimits: { description: '本站教学输入上限：数组长度 1—10000，元素为 -10000—10000，输入必须非降序。该值域保证平方不超过 100000000。演示最多 30 项；超出演示上限不截断播放，仍可在真实判题范围内执行。', inputSchemaId: 'SortedSquaresInput' },
  steps: [
    {
      id: 'syntax-new-array', kind: 'syntax', title: 'J3 · new int[] 与两个数组对象',
      body: 'C 中常由调用者准备输出缓冲区；本题的 Java 方法直接创建并返回数组。int[] result = new int[nums.length]; 会创建一个新的 int 数组对象，长度与 nums 相同。方括号里的 nums.length 是长度，不是最后下标；新 int 数组中的每一项初始为 0。若直接写 int[] result = nums，只是复制引用值，两个变量仍指向同一个数组，并没有创建结果副本。这里需要保留输入、另建结果，所以必须使用 new。\n静态预测：nums 指向输入数组，执行 int[] result = new int[nums.length] 后，result 与 nums 是否指向同一对象？答案是否；它们长度相同，但身份不同。此检查不执行 Java。',
      relatedIds: [],
    },
    {
      id: 'syntax-return-array', kind: 'syntax', title: 'J1 / J2 · 方法签名、乘法与返回数组',
      body: '方法签名是 public int[] sortedSquares(int[] nums)。第一个 int[] 表示返回一个 int 数组引用，参数 int[] nums 是输入数组引用。平台调用器负责创建输入并读取返回数组，你不写 main，也不能靠打印 PASS 通过。\nnums[left] * nums[left] 使用 Java int 乘法；负数乘自身得到非负平方。本站把元素限制在 ±10000 内，因此不会发生 int 溢出。return result; 立即结束方法并交回 result 的引用值；不是逐项打印，也不是返回 result.length。',
      relatedIds: [],
    },
    {
      id: 'understanding', kind: 'understanding', title: '读题与手工模拟 · 平方会改变顺序',
      body: '输入已经按原数值从小到大排列，但平方后不能照抄原顺序。以 [-7,-3,2,3,11] 为例，逐项平方得到 [49,9,4,9,121]，它还没有排序；正确输出是 [4,9,9,49,121]。\n手工从结果末端填写：先比较 -7²=49 与 11²=121，把 121 放到 result[4]，right 左移；再比较 49 与 3²=9，把 49 放到 result[3]，left 右移；接着把 9、9、4 依次写到下标 2、1、0。每次拿走的是剩余元素中的最大平方，因此从后向前写不会覆盖已经确定的位置。新数组尚未填写的位置实际值是 Java 默认的 0，但“已确定”范围由 write 指针界定，不能把占位 0 当成算法已经算出的答案。',
      relatedIds: [],
    },
    {
      id: 'derivation', kind: 'derivation', title: '推导 · 最大平方为什么只可能在两端',
      body: '直接办法是先平方，再调用排序，时间约为 O(n log n)。题目额外保证 nums 非降序，因此负数区域越靠左绝对值可能越大，正数区域越靠右绝对值越大。剩余闭区间 [left,right] 中，绝对值最大的数必在某个端点；内部元素不可能超过两端绝对值的较大者。\n建立长度相同的 result，并令 write 指向末尾。不变量是：每轮开始时，nums[left..right] 恰是尚未处理的元素；result[write+1..n-1] 已是最终答案中同一位置的有序后缀。比较两个端点的平方，把较大者写到 result[write]，只移动被使用的输入指针，再把 write 减一。新写入值不大于后缀中的旧值，所以不变量保持。\n每个输入元素只处理一次，时间 O(n)；结果数组是任务要求的输出，除它外只用固定变量。少量测试耗时不能证明复杂度。',
      relatedIds: [],
    },
    {
      id: 'prediction', kind: 'prediction', title: '先预测，再揭示两处状态',
      body: '默认输入两端平方是 49 与 121。先预测第一次写入 result[4] 的值，再预测写完后 write 的新下标。答案来自当前输入生成的下一份不可变快照；切换演示输入会生成新答案。预测只是教学检查，不产生真实代码通过记录。',
      relatedIds: ['predict-first-value', 'predict-first-write'],
    },
    {
      id: 'reference-demo', kind: 'reference-demo', title: '参考算法状态演示',
      body: '界面固定标注“参考解法 · 算法状态演示（非 JVM 调试）”。nums 和 result 是两个不同 ID 的数组状态；left/right 标在输入数组，write 标在结果数组。所有数组、变量、说明与代码高亮来自同一个执行后快照。上一步直接恢复旧快照，不倒推操作；编辑学生 Java 不会改变参考轨迹。展开完整参考源会记录看过答案。',
      relatedIds: [],
    },
    {
      id: 'guided-code', kind: 'guided-code', title: '引导编写 · 逐步撤去双指针支架',
      body: '第一阶段补“仍有未处理元素”的循环条件；第二阶段自己完成端点平方比较、写入和对应指针移动；第三阶段只保留方法骨架，从创建结果数组开始独立组织代码。静态阶段只记录练习动作，最后必须提交完整 Solution 到真实 Java runner；本站不会比较你填的字符串是否等于参考答案。',
      relatedIds: ['guided-977'],
    },
    {
      id: 'independent-code', kind: 'independent-code', title: '独立挑战 · 从方法骨架开始',
      body: '独立草稿与引导草稿分开保存。先用一个输入运行，观察真实返回数组；故意或意外得到错误顺序时，根据首个失败用例检查 write 的方向和移动了哪一端。修正后提交全部本站测试。编译成功只表示语法成立，当前源码真实完整提交通过才更新“独立模式通过本站测试”。',
      relatedIds: [],
    },
    {
      id: 'summary', kind: 'summary', title: '复盘 · 三个方向必须说清楚',
      body: '请用自己的话解释：为什么不能按原顺序直接平方？为什么最大平方来自剩余区间两端？为什么比较出最大值后要从 result 末端向前写？为什么 nums 和 result 是不同对象？\n本站分别保存预测、提示、答案查看、引导通过和独立模式通过；刷新会恢复两份草稿。通过仅表示满足本站公布用例，不等于 LeetCode 官方评测，也不自动证明复杂度。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '80af9c54d406ffa7c3143ff9f3f5b2c9ea24a68d8406394cdbde3872f23933f3',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-concept', level: 1, body: '平方大小取决于绝对值。对一个有序区间，绝对值最大的候选会出现在哪里？先不要考虑如何写代码。' },
    { id: 'hint-invariant', level: 2, body: '维护尚未处理的闭区间 [left,right]，并让 result[write+1..末尾] 始终是已经确定的最终后缀。每轮只消耗一个端点。' },
    { id: 'hint-pseudocode', level: 3, body: '创建等长结果；left=0、right=n-1、write=n-1；循环比较两端平方，把较大者写到 result[write]，移动对应端点并令 write--；最后返回 result。' },
  ],
  predictionChecks: [
    { id: 'predict-first-value', prompt: '默认输入 [-7,-3,2,3,11]，第一次应在 result[4] 写入多少？', answer: { kind: 'int', value: 121 }, explanation: '两端平方为 49 和 121，结果末端先放较大值 121。', checkpointId: 'first-write-value' },
    { id: 'predict-first-write', prompt: '第一次写入 result[4] 后，write 变成多少？', answer: { kind: 'int', value: 3 }, explanation: '下标 4 已确定，下一次向前一格写入，所以 write-- 后为 3。', checkpointId: 'first-write-index' },
  ],
  guided: {
    id: 'guided-977',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-loop', instruction: '支架 1 / 3：把 false 改成闭区间仍有元素时的条件。解释为什么 left == right 时还要执行一次。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('while (left <= right)', 'while (false /* TODO：仍有未处理元素 */)') },
      { id: 'guided-choice', instruction: '支架 2 / 3：补两端平方比较，把较大值写到 result[write]，并只移动被使用的一端；删除 TODO 异常。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public int[] sortedSquares(int[] nums) {
        int[] result = new int[nums.length];
        int left = 0;
        int right = nums.length - 1;
        int write = nums.length - 1;
        while (left <= right) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            // TODO：比较、写入，并移动被使用的输入指针。
            throw new UnsupportedOperationException("请补端点选择");
        }
        return result;
    }
}
` },
      { id: 'guided-whole', instruction: '支架 3 / 3：从方法骨架写完整解法；自行创建新数组、维护三个指针并返回结果。最终提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'square-original-order', description: '逐项平方后直接返回，忘记平方会改变负数部分的次序。', counterexampleInputId: 'mixed', explanation: '[-7,-3,2,3,11] 逐项平方是 [49,9,4,9,121]，并非非降序。必须利用绝对值从两端选择，或另行排序。' },
    { id: 'largest-at-front', description: '每次选择最大平方，却从 result[0] 开始向后写，得到降序结果。', counterexampleInputId: 'all-positive', explanation: '[1,2,5] 先选 25；若写在下标 0，随后得到 [25,4,1]。选择最大值时必须从结果末端向前填。' },
    { id: 'compare-values', description: '直接比较 nums[left] 与 nums[right]，没有比较平方或绝对值。', counterexampleInputId: 'all-negative', explanation: '在 [-9,-4,-1] 中，数值 -1 较大，但平方 1 较小；剩余最大平方来自左端 -9。' },
    { id: 'skip-singleton', description: '循环写成 left < right，漏掉最后一个尚未处理的元素。', counterexampleInputId: 'singleton-negative', explanation: '单元素时 left 与 right 都是 0，仍必须把 25 写入 result[0]。闭区间应使用 left <= right。' },
  ],
  testSuite: {
    version: PROBLEM_META['977'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-original-order', source: WRONG_ORIGINAL_ORDER_SOURCE, targetedCaseIds: ['mixed', 'all-negative', 'even-mixed'] },
      { id: 'wrong-largest-from-front', source: WRONG_DESCENDING_SOURCE, targetedCaseIds: ['mixed', 'all-positive', 'zero-duplicates'] },
    ],
  },
  visualization: { modelId: '977-two-pointers', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson977;
