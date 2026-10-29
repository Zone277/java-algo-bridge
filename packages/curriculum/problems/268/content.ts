import { MissingNumberInputSchema, PROBLEM_META, expectedOutput, type Lesson, type MissingNumberInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_OMIT_N_SOURCE, WRONG_VALUES_ONLY_SOURCE,
} from './reference.js';

type Lesson268 = Extract<Lesson, { id: '268' }>;
type Case268 = Lesson268['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: MissingNumberInput }[] = [
  { id: '268-demo-middle', title: '中间缺 2：[3, 0, 1]', input: { nums: [3, 0, 1] } },
  { id: '268-demo-zero', title: '缺 0：[1, 2, 3]', input: { nums: [1, 2, 3] } },
  { id: '268-demo-n', title: '缺 n：[0, 1, 2]', input: { nums: [0, 1, 2] } },
  { id: '268-demo-one', title: '一项：[0]', input: { nums: [0] } },
  { id: '268-demo-shuffle', title: '打乱顺序：[4, 2, 1, 0]', input: { nums: [4, 2, 1, 0] } },
];

function testCase(id: string, nums: number[], coverage: string): Case268 {
  const input = MissingNumberInputSchema.parse({ nums });
  const expected = expectedOutput('268', input);
  if (expected.kind !== 'int') throw new Error('268 可信输出必须是 int');
  return { id, input, expected, coverage };
}

const cases: Case268[] = [
  testCase('268-case-single-missing-n', [0], '最小 n=1，缺失值是 n=1；不能只寻找 0。'),
  testCase('268-case-single-missing-zero', [1], '最小 n=1，缺失值是 0；数组中不一定含 0。'),
  testCase('268-case-two-missing-middle', [2, 0], 'n=2 且中间值 1 缺失，输入顺序不是排序。'),
  testCase('268-case-middle-3', [3, 0, 1], '原创手算样例；中间缺 2，末项不是缺失值。'),
  testCase('268-case-missing-n-3', [0, 1, 2], 'n=3 且缺 n，忘记初始化候选 n 的错解失败。'),
  testCase('268-case-missing-zero-3', [1, 2, 3], 'n=3 且缺 0；答案 0 是合法数值，不是空标记。'),
  testCase('268-case-unordered-3', [1, 0, 3], '相同缺失值但不同排列，不能依赖排序位置。'),
  testCase('268-case-middle-4', [4, 2, 1, 0], 'n=4、缺 3，乱序且最大值在开头。'),
  testCase('268-case-missing-n-4', [0, 1, 2, 3], 'n=4、缺最大候选值 4，覆盖末尾边界。'),
  testCase('268-case-middle-5', [0, 5, 3, 1, 2], 'n=5、缺 4，多次打乱检查全部下标与值都参与。'),
  testCase('268-case-display-edge', Array.from({ length: 31 }, (_, value) => value).filter(value => value !== 14).reverse(), '恰好 30 项，可完整演示；缺 14 且输入逆序。'),
  testCase('268-case-over-display', Array.from({ length: 32 }, (_, value) => value).filter(value => value !== 17).reverse(), '31 项仍须真实判题，参考演示应明确拒绝。'),
  testCase('268-case-site-max', Array.from({ length: 10001 }, (_, value) => value).filter(value => value !== 5067).reverse(), '本站 n=10000 上限、值 10000 和缺失中间值；仅真实判题。'),
];

export const lesson268 = {
  schemaVersion: 1, id: '268', slug: 'missing-number', title: '缺失的数字', order: 39,
  lessonVersion: PROBLEM_META['268'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分数组的 n 个元素与 0..n 的 n+1 个候选值，解释为什么缺失值可能是 0 或 n。',
    '理解 Java int 的按位异或、nums.length 和循环边界，并从逐项抵消推导 O(n) 时间、O(1) 额外空间解法。',
    '能描述“先异或下标、再异或数组值”之间的半步状态和循环入口不变量。',
    '从未完成的方法骨架写出 Java，在真实 runner 中用反例修正后通过本站测试。',
  ],
  source: { platform: 'LeetCode', number: 268, url: 'https://leetcode.com/problems/missing-number/' },
  taskSemantics: '给定长度为 n 的数组 nums，里面有 0..n 范围内互不相同的 n 个整数，恰有一个候选值没有出现。返回这个缺少的整数；不返回下标，也不修改原数组。输入无排序保证。题面、示例和讲解均为本站原创。',
  siteLimits: { description: '本站真实判题接受 n=1..10000，值必须在 0..n 且互不相同；参考状态演示最多 30 项。超过演示限制但符合本站输入契约的代码仍可真实运行。', inputSchemaId: 'MissingNumberInputSchema' },
  steps: [
    {
      id: '268-step-syntax', kind: 'syntax', title: 'Java 前置 · 方法、int[] 与按位异或',
      body: `public int missingNumber(int[] nums) 定义接收数组、返回 int 的方法；平台调用 Solution 的方法，因此你不必写 main。nums 是数组对象的引用值，方法调用会复制该引用值，不会复制每个元素；i、missing 和返回值是 int 基本值。Java 数组长度写 nums.length，不写 nums.length()，也不能照搬 C 的 sizeof 推算参数数组长度。nums[i] 必须满足 0<=i<nums.length。

^ 是 Java int 的逐位异或，不是乘方；a^a=0，a^0=a。missing ^= i 在两个操作数都是 int 时等价于 missing = missing ^ i。^ 与布尔条件 && 不同。while 在每轮先检查 i<nums.length，i++ 把基本值 i 增加一。参考解法只读取 nums[i]，不会更改数组对象。`,
      relatedIds: ['J1', 'J2', 'J3'],
    },
    {
      id: '268-step-understanding', kind: 'understanding', title: '理解问题 · n 项、n+1 个候选',
      body: `输入 [3,0,1] 有 3 项，候选却是 0、1、2、3 共 4 个。0、1、3 都出现，故缺 2，应返回整数 2 而不是数组下标。输入 [0,1,2] 缺候选 3；输入 [1,2,3] 缺 0。不能假设缺失值总在数组中间或输入已排序。

手算 [3,0,1]：初始 missing=n=3；第一轮 i=0，3^0^3=0；第二轮 i=1，0^1^0=1；第三轮 i=2，1^2^1=2，返回 2。中途 missing=0/1 不代表已发现最终答案，而是候选 n、已处理下标与数组前缀的异或读数。`,
      relatedIds: ['268-case-middle-3', '268-case-missing-n-3', '268-case-missing-zero-3'],
    },
    {
      id: '268-step-derivation', kind: 'derivation', title: '算法推导 · 两份集合相互抵消',
      body: `最直接的办法是为 0..n 做一个 seen 表：先标记每个数组值，再找到未标记的一项，时间 O(n)、额外空间 O(n)。若希望只用固定数量的 int，可把所有候选值 0..n 与数组中的 n 个值全部异或。每个出现的值在两份集合各有一次，a^a=0；因为异或可交换、可结合，数组顺序无关，最后只剩缺失值。

参考代码先把 n 放进 missing，再在第 i 轮依次异或下标 i 与 nums[i]。循环入口不变量：missing 等于 n、下标 0..i-1 和数组前 i 项的异或；这三部分里只有前 i 对已并入。执行 missing ^= i 后只是半步，下标 i 已计入但 nums[i] 尚未计入；执行下一行后这一对才完整，随后 i++ 恢复入口不变量。i=n 时异或了 0..n 与全部输入值，返回缺失值。每项只读一次，时间 O(n)、额外空间 O(1)；本站运行时间不能代替复杂度证明。`,
      relatedIds: ['init-missing', 'xor-index', 'xor-value', 'advance-index', 'return-missing'],
    },
    {
      id: '268-step-prediction', kind: 'prediction', title: '先预测 · 初值、首对与终值',
      body: '切换当前演示输入，先预测 missing 的初值、第一对下标和值都异或后的 missing，再预测最终缺失值。默认 [3,0,1] 对应 3、0、2；[1,2,3] 对应 3、2、0。检查点从该输入的不可变快照计算，单项输入仍保留三处不同步骤。预测只检查理解，不会编译学生 Java。',
      relatedIds: ['268-predict-initial', '268-predict-first', '268-predict-final'],
    },
    {
      id: '268-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '这是“参考解法 · 算法状态演示（非 JVM 调试）”。变量表、数组、索引、高亮行和解释都读取同一不可变快照。注意“仅并入下标”阶段的 missing 与完成整对后的 missing 不同；后退时两者和 i 一起恢复。带“教学”字样的计数与标记并不是参考 Java 局部变量。这里固定演示参考算法，不会追踪学生源码；学生 Java 在单独的真实 Docker runner 中编译执行。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '268-step-guided', kind: 'guided-code', title: '引导编写 · 从一对抵消到完整方法',
      body: '第一支架补初值、异或两项与索引移动；第二支架自己写循环边界和完整配对；第三支架仅留方法骨架。静态练习不比较填入的字符串是否等于参考答案，也不代表代码通过。完成完整 Solution.java 后必须交给真实 Docker runner 运行本站用例，才记录引导通过。',
      relatedIds: ['268-guided'],
    },
    {
      id: '268-step-independent', kind: 'independent-code', title: '独立挑战 · 用边界和乱序反例修正',
      body: '独立模式从未完成的骨架开始，草稿与引导分开保存。先用 [0]、[1] 检查 0/n 两端，用 [3,0,1] 检查是否把下标和值都计入，用 [0,1,2] 检查 n 候选。出现真实编译错误、运行异常或错误答案时，按结构化反馈修改源码后重新运行；打印 PASS 不会影响判定。',
      relatedIds: ['268-case-single-missing-n', '268-case-single-missing-zero', '268-case-middle-3', '268-case-missing-n-3'],
    },
    {
      id: '268-step-summary', kind: 'summary', title: '复盘 · 为什么缺失值会留下',
      body: '说明数组有 n 项而候选范围有 n+1 项；为什么 missing 必须先包括 n；为什么下标和值都要异或；异或下标后、异或数组值前如何描述中间状态。再说明 nums 是数组引用值而 missing 是基本值。参考预测、演示、提示、查看答案、引导通过和独立通过本站测试分别记录；通过本站测试不宣称通过原平台官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'c49f2ec323538d7eab0060b6b6d5186c9ecd8ca4cf28fd026e69062dc38471e9',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '268-hint-concept', level: 1, body: '候选值有 0..n 共 n+1 个，数组只有 n 项。想一想什么 int 操作能让两个相同值归零，且不依赖出现顺序。' },
    { id: '268-hint-invariant', level: 2, body: '用 missing 保存 n、已经遍历的下标、已经遍历的数组值的异或。进入第 i 轮时，这两条前缀恰好都处理了 i 项；一轮内先并入 i，再并入 nums[i]。' },
    { id: '268-hint-pseudocode', level: 3, body: 'missing=nums.length，i=0；当 i<nums.length：missing ^= i；missing ^= nums[i]；i++。最后返回 missing。不能遗漏起始的 n，也不能读 nums[n]。' },
  ],
  predictionChecks: [
    { id: '268-predict-initial', prompt: '演示 [3,0,1]，循环前 missing 应初始化为多少？', answer: { kind: 'int', value: 3 }, explanation: 'n=3 是额外候选值，必须先放进去。切换输入后答案从当前快照计算。', checkpointId: 'initial-n' },
    { id: '268-predict-first', prompt: '演示 [3,0,1]，第一轮下标和值都异或后 missing 是多少？', answer: { kind: 'int', value: 0 }, explanation: '3^0^3=0；此时 i 仍为 0。切换输入后答案从当前快照计算。', checkpointId: 'first-pair' },
    { id: '268-predict-final', prompt: '演示 [3,0,1]，最终返回哪个值？', answer: { kind: 'int', value: 2 }, explanation: '候选 0、1、3 都被输入中的相同值抵消，留下 2。', checkpointId: 'final-missing' },
  ],
  guided: {
    id: '268-guided', finalCheck: 'real-java-submit', stages: [
      {
        id: '268-guided-pair', instruction: '支架 1 / 3：补 n 候选、当前下标、当前值和前进动作。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int missingNumber(int[] nums) {
        int missing = /* TODO：额外候选值 */;
        int i = 0;
        while (i < nums.length) {
            /* TODO：并入下标 i */
            /* TODO：并入数组值 nums[i] */
            /* TODO：前进 i */
        }
        return missing;
    }
}
`,
      },
      {
        id: '268-guided-loop', instruction: '支架 2 / 3：保留初值，从循环边界开始自己写完整配对与返回。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int missingNumber(int[] nums) {
        int missing = nums.length;
        int i = 0;
        // TODO：在合法下标内异或下标和值，最后返回 missing。
        throw new UnsupportedOperationException("请完成遍历");
    }
}
`,
      },
      { id: '268-guided-whole', instruction: '支架 3 / 3：仅从方法骨架实现，再提交真实 Java 本站测试。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '268-error-omit-n', description: '只异或下标 0..n-1 与数组值，遗漏候选 n。', counterexampleInputId: '268-case-missing-n-3', explanation: '[0,1,2] 缺 3；若不先放入 n，成对下标与数组值全抵消成 0。' },
    { id: '268-error-values-only', description: '只把数组值异或进 n，忘记下标。', counterexampleInputId: '268-case-middle-3', explanation: '3^3^0^1=1，而 [3,0,1] 缺的是 2；必须并入 0..n-1 的所有下标。' },
    { id: '268-error-overrun', description: '把 i<=nums.length 当作数组循环条件。', counterexampleInputId: '268-case-single-missing-n', explanation: '对于 [0]，i=1 时 nums[1] 不存在，Java 会抛 ArrayIndexOutOfBoundsException；n 是候选值，不是合法下标。' },
    { id: '268-error-sorted', description: '认为缺失值等于第一个与下标不同的数组值。', counterexampleInputId: '268-case-middle-3', explanation: '[3,0,1] 未排序，首项 3 与下标 0 不同，但缺失值是 2；本题不能默认有序。' },
  ],
  testSuite: {
    version: PROBLEM_META['268'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '268-wrong-omit-n', source: WRONG_OMIT_N_SOURCE, targetedCaseIds: ['268-case-single-missing-n', '268-case-missing-n-3', '268-case-middle-3'] },
      { id: '268-wrong-values-only', source: WRONG_VALUES_ONLY_SOURCE, targetedCaseIds: ['268-case-two-missing-middle', '268-case-middle-3', '268-case-missing-zero-3', '268-case-middle-5'] },
    ],
  },
  visualization: { modelId: '268-index-value-xor', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson268;
