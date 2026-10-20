import { SingleNumberInputSchema, PROBLEM_META, expectedOutput, type Lesson, type SingleNumberInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_FIRST_SOURCE, WRONG_OR_SOURCE } from './reference.js';

type Lesson136 = Extract<Lesson, { id: '136' }>;
type Case136 = Lesson136['testSuite']['cases'][number];
export const demoInputs: { id: string; title: string; input: SingleNumberInput }[] = [
  { id: 'demo-separated', title: '重复项分散：[6, 3, 6]', input: { nums: [6, 3, 6] } },
  { id: 'demo-negative', title: '负数也抵消：[-7, 2, 2]', input: { nums: [-7, 2, 2] } },
  { id: 'demo-zero', title: '唯一值是零：[4, 0, 4]', input: { nums: [4, 0, 4] } },
  { id: 'demo-single', title: '只有一项：[9]', input: { nums: [9] } },
];
function testCase(id: string, nums: number[], coverage: string): Case136 {
  const input = SingleNumberInputSchema.parse({ nums });
  const expected = expectedOutput('136', input);
  if (expected.kind !== 'int') throw new Error('136 expected output must be int');
  return { id, input, expected, coverage };
}
const cases: Case136[] = [
  testCase('case-single', [9], '最小长度，初始化零并扫描一次。'),
  testCase('case-first-duplicate', [6, 3, 6], '首项重复且两次出现不相邻，唯一值在中间。'),
  testCase('case-unique-first', [5, 8, 8], '唯一值在开头，最后一项不是答案。'),
  testCase('case-unique-last', [7, 7, 2], '唯一值在最后，不能漏掉末项。'),
  testCase('case-zero-unique', [4, 0, 4], '零为合法答案，位或无法将成对的 4 抵消。'),
  testCase('case-zero-pair', [0, 3, 0], '零也可以是成对值，而非特殊空标记。'),
  testCase('case-negative-unique', [-7, 2, 2], '唯一值为负数，32 位二补码不影响自反抵消。'),
  testCase('case-negative-pair', [-4, 5, -4], '相同负数分散在两端，需要抵消全部 32 位。'),
  testCase('case-interleaved', [8, 3, 5, 3, 8], '多组成对值交错，不能只比较邻居。'),
  testCase('case-bounds', [-30000, 30000, -30000], '本站数值边界与正负混合。'),
  testCase('case-negative-single', [-30000], '最小长度与负数边界同时出现。'),
  testCase('case-large', [...Array.from({ length: 50 }, (_, i) => i + 1), -123, ...Array.from({ length: 50 }, (_, i) => 50 - i)], '101 项真实执行；超出演示上限必须明确拒绝参考模型。'),
];
export const lesson136 = {
  schemaVersion: 1, id: '136', slug: 'single-number', title: '只出现一次的数字', order: 24,
  lessonVersion: PROBLEM_META['136'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '理解 Java int 按位异或和 32 位二补码，区分 ^、| 与布尔逻辑运算。',
    '从逐位奇偶性推导成对抵消，并说明恰有一次/两次的输入保证为何必要。',
    '用前缀不变量解释每步 result 与 i，包括异或后但尚未 i++ 的状态。',
    '从方法骨架写完整 Java，经真实编译执行与本站测试验证。',
  ],
  source: { platform: 'LeetCode', number: 136, url: 'https://leetcode.com/problems/single-number/' },
  taskSemantics: '给一个非空整数数组，恰有一个值只出现一次，其他每个值都恰好出现两次。返回那个只出现一次的值，不是它的下标。数组没有排序保证，也不要求修改它；题面和讲解为本站原创。',
  siteLimits: { description: '本站真实判题接受 1—10000 项，每项在 -30000—30000 内，且满足唯一一次、其余两次的频次保证。参考演示最多 30 项。', inputSchemaId: 'SingleNumberInputSchema' },
  steps: [
    {
      id: '136-step-syntax', kind: 'syntax', title: 'Java 前置 · int 的按位异或',
      body: `public int singleNumber(int[] nums) 接收数组并返回一个 int。nums 保存数组对象的引用值，调用时按值复制引用值；i 和 result 保存 int 基本值。nums.length 不加括号，nums[i] 只在 0<=i<nums.length 时合法。while 先判断条件；i++ 将 i 的数值增加一。参考解法不会写 nums[i]，因此数组内容保持不变。

对两个 int 使用 ^ 是逐位异或：0^0=0、1^1=0、0^1=1、1^0=1；它不是乘方，也不是整数加法。result ^= nums[i] 在本题两个操作数均为 int 时等价于 result = result ^ nums[i]。| 是按位或，1|1=1，无法抵消。&& 和 || 用于 boolean 条件，不能拿 int 当布尔值。

Java int 是有符号 32 位二补码；负数也有固定的 32 位模式，相同模式异或仍为全零。展示的二进制字符串是教学表示，不是另一个 Java 数值类型；最终仍返回有符号 int。`,
      relatedIds: ['J1', 'J2', 'J3'],
    },
    {
      id: '136-step-understanding', kind: 'understanding', title: '理解任务 · 值、频次和返回值',
      body: `输入 [6,3,6]，6 出现两次，3 出现一次，因此返回 3；返回下标 1 不符合任务。重复项不必相邻。输入 [4,0,4] 必须返回 0，零不是“未找到”；输入 [-7,2,2] 返回 -7。只有 [9] 时也有合法答案 9。

手算 [6,3,6] 的低三位：从 000 开始，000^110=110（6），110^011=101（5），101^110=011（3）。中途 result=5 可以不是任何输入值；它代表前缀各位的奇偶性，不是当前已经确认的答案。`,
      relatedIds: ['case-first-duplicate', 'case-zero-unique', 'case-negative-unique'],
    },
    {
      id: '136-step-derivation', kind: 'derivation', title: '算法推导 · 从计数到成对抵消',
      body: `先用 Map 统计每个值出现几次就能求解，但需要随不同值增多的额外空间。利用本题更强的频次保证：a^a=0，a^0=a；异或满足交换律和结合律。于是任意顺序的所有元素异或后，每对相同值全部抵消，只剩单独的一项。这个证明同时适用于负数的 32 位模式，不需要排序或把相邻项配在一起。

初始化 result=0、i=0。循环条件处保持不变量：result 是前 i 项 nums[0..i) 的异或，尚未读到的元素位于 [i,n)。执行 result ^= nums[i] 后，已处理 i+1 项，但 i 暂时没变；再执行 i++，不变量恢复。i=n 时所有成对值抵消，返回 result。教学 processed 读数专门标明这个中间差别。

每项访问一次，时间 O(n)，额外空间 O(1)，不修改输入。运行计时不是复杂度证明。若允许一个值出现三次或有多个单独值，异或聚合不再能保证找到“唯一一次”的值；本站输入校验会拒绝这些不符合题意的输入。`,
      relatedIds: ['init-result', 'xor-value', 'advance-index', 'return-result'],
    },
    {
      id: '136-step-prediction', kind: 'prediction', title: '先预测 · 从第一项到全部项',
      body: '对当前演示输入，先预测第一次异或后的 result，再预测最终返回值。默认 [6,3,6] 的两次答案分别为 6 和 3；换成 [-7,2,2] 则分别为 -7 和 -7。检查点从当前输入的不可变快照生成，单项输入也有两处检查。预测通过仅为学习检查，不表示 Java 已运行。',
      relatedIds: ['136-predict-first', '136-predict-final'],
    },
    {
      id: '136-step-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '变量、数组、指针、32 位表示、说明和代码高亮读取同一快照。观察 result 更新时 i 还没动，下一步 i 才增加；后退会恢复完整旧快照。processed 和二进制字符串是教学读数，不是参考 Java 的局部变量。这里演示固定参考算法，学生编辑源码不会改变它；学生执行在另一条真实 Java 通道完成。',
      relatedIds: demoInputs.map(demo => demo.id),
    },
    {
      id: '136-step-guided', kind: 'guided-code', title: '引导编写 · 逐渐撤掉支架',
      body: '先补中性元、异或与下标前进，再自己写循环，最后回到方法骨架完成整段。支架自查不比较你与参考答案的源码文本，也不算真实通过；提交完整 Java，由固定容器真实编译执行所有本站用例后才记录引导通过。',
      relatedIds: ['136-guided'],
    },
    {
      id: '136-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例修正',
      body: '独立模式从未完成的方法骨架开始，草稿与引导分开保存。用 [6,3,6] 检查错误的“直接返回首项”；用 [4,0,4] 检查把 ^ 写成 |；用 [-4,5,-4] 检查负数处理。运行失败后阅读真实编译诊断或用例实际输出，改动源码后重新运行，再提交本站完整测试。',
      relatedIds: ['case-first-duplicate', 'case-zero-unique', 'case-negative-pair'],
    },
    {
      id: '136-step-summary', kind: 'summary', title: '复盘 · 为什么能抵消',
      body: '解释相同的两个负数为何也抵消，为什么中间 result 不一定是输入值，以及异或后尚未移动 i 时不变量如何表述。说明方法返回值与下标、参数引用值与数组对象的区别。本站分别记录提示、查看答案、引导通过、独立通过本站测试与预测；播放动画不表示掌握，通过本站测试不等于 LeetCode 官方评测通过。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' }, independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'e9c246b60cf42b1f53de424d09771678e9c8303bc6bff82ea5025f24a6547caf', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: '136-hint-concept', level: 1, body: '寻找一种操作，让两个相同的值互相抵消，让零不改变任何值。逐位看相同的两个 1 会发生什么？' },
    { id: '136-hint-invariant', level: 2, body: '用 result 表示已读前缀的逐位奇偶性；初始化为空前缀的 0。成对值可以不相邻，因为异或可交换、可结合。' },
    { id: '136-hint-pseudocode', level: 3, body: 'result=0、i=0；只要 i<nums.length，就 result ^= nums[i]，再 i++；最后返回 result。不要把 ^ 换成 |，也不要从 1 开始。' },
  ],
  predictionChecks: [
    { id: '136-predict-first', prompt: '[6,3,6] 的第一项与初始 0 异或后 result 是多少？', answer: { kind: 'int', value: 6 }, explanation: '0^6=6，此时 i 仍为 0，已处理一项。', checkpointId: 'first-xor' },
    { id: '136-predict-final', prompt: '[6,3,6] 全部处理完后返回多少？', answer: { kind: 'int', value: 3 }, explanation: '6^3^6 可以重排为 6^6^3=0^3=3。', checkpointId: 'final-result' },
  ],
  guided: {
    id: '136-guided', finalCheck: 'real-java-submit', stages: [
      {
        id: '136-guided-operators', instruction: '支架 1 / 3：补空前缀值、逐位抵消操作和下标前进。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int singleNumber(int[] nums) {
        int result = /* TODO：空前缀的异或 */;
        int i = 0;
        while (i < nums.length) {
            /* TODO：把 nums[i] 异或进 result */
            /* TODO：前进下标 */
        }
        return result;
    }
}
`,
      },
      {
        id: '136-guided-loop', instruction: '支架 2 / 3：根据前缀不变量写出完整循环和返回。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int singleNumber(int[] nums) {
        int result = 0;
        int i = 0;
        // TODO：逐项异或，写出循环边界与返回值。
        throw new UnsupportedOperationException("请完成遍历");
    }
}
`,
      },
      { id: '136-guided-whole', instruction: '支架 3 / 3：从骨架完成方法，再提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '136-error-first', description: '直接返回首项。', counterexampleInputId: 'case-first-duplicate', explanation: '[6,3,6] 的首项出现两次，正确值在中间。' },
    { id: '136-error-or', description: '把异或 ^ 错写成位或 |。', counterexampleInputId: 'case-zero-unique', explanation: '4|0|4=4，而 4^0^4=0；位或保留出现过的 1 位，不会抵消。' },
    { id: '136-error-init', description: '初始化 result=1 或漏读最后一项。', counterexampleInputId: 'case-single', explanation: '[9] 必须得到 9。1^9=8；跳过唯一项则返回 0。中性元必须为 0，遍历必须完整。' },
  ],
  testSuite: {
    version: PROBLEM_META['136'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '136-wrong-first', source: WRONG_FIRST_SOURCE, targetedCaseIds: ['case-first-duplicate', 'case-zero-unique'] },
      { id: '136-wrong-or', source: WRONG_OR_SOURCE, targetedCaseIds: ['case-zero-unique', 'case-negative-pair'] },
    ],
  },
  visualization: { modelId: '136-prefix-xor', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson136;
