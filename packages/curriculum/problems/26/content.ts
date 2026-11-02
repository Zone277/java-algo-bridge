import {
  PROBLEM_META,
  RemoveDuplicatesInputSchema,
  expectedOutput,
  type Lesson,
  type RemoveDuplicatesInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_COUNT_ONLY_SOURCE,
  WRONG_RETURN_LENGTH_SOURCE,
} from './reference.js';

type Lesson26 = Extract<Lesson, { id: '26' }>;
type Case26 = Lesson26['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RemoveDuplicatesInput }[] = [
  { id: '26-demo-clusters', title: '成组重复：[1,1,2,2,3]', input: { nums: [1, 1, 2, 2, 3] } },
  { id: '26-demo-all-same', title: '全部相同：[4,4,4,4]', input: { nums: [4, 4, 4, 4] } },
  { id: '26-demo-distinct', title: '没有重复：[-2,0,3]', input: { nums: [-2, 0, 3] } },
  { id: '26-demo-single', title: '单项：[7]', input: { nums: [7] } },
];

function testCase(id: string, nums: number[], coverage: string): Case26 {
  const input = RemoveDuplicatesInputSchema.parse({ nums });
  const expected = expectedOutput('26', input);
  if (expected.kind !== 'int-array') throw new Error('26 可信输出必须是 int-array');
  return { id, input, expected, coverage };
}

const siteUpper = Array.from({ length: 10000 }, (_, index) => -100 + Math.floor(index * 201 / 10000));
const cases: Case26[] = [
  testCase('26-case-single', [7], '最小长度；循环不进入，k 必须为 1，有效前缀为 [7]。'),
  testCase('26-case-pair-same', [2, 2], '两个相同值；跳过第二项并返回前缀 [2]。'),
  testCase('26-case-pair-distinct', [2, 3], '两个不同值；写指针前进，保留完整数组。'),
  testCase('26-case-clusters', [1, 1, 2, 2, 3], '多组重复；检验稳定压缩和连续两次跳过。'),
  testCase('26-case-long-run', [0, 0, 0, 0, 1], '长重复段之后出现新值；新值必须写到下标 1。'),
  testCase('26-case-all-same', [4, 4, 4, 4, 4], '全部相同；有效前缀长度只能是 1。'),
  testCase('26-case-no-duplicates', [-3, -1, 0, 2, 5], '无重复输入；k 等于原长度且值保持原顺序。'),
  testCase('26-case-negative-duplicates', [-5, -5, -2, -2, -2, 0], '负数和零的重复组；比较数值而非符号或绝对值。'),
  testCase('26-case-bounds', [-100, -100, 100, 100], '本站数值上下界，结果为 [-100,100]。'),
  testCase('26-case-middle-duplicates', [-2, -1, -1, -1, 0, 1], '重复只在中间；前后唯一值都不能丢失。'),
  testCase('26-case-alternating-runs', [-2, -2, -1, 0, 0, 1, 1, 2], '不同长度的重复段交替出现，检验每组只保留首项。'),
  testCase('26-case-display-edge', Array.from({ length: 30 }, (_, index) => Math.floor(index / 3) - 5), '恰好 30 项仍可生成完整参考状态演示。'),
  testCase('26-case-run-only', Array.from({ length: 31 }, (_, index) => Math.floor(index / 4) - 4), '31 项超出演示上限，但真实 Java 判题仍应接受。'),
  testCase('26-case-site-upper-same', Array(10000).fill(9), '本站 10000 项上限且全部重复，检验线性扫描和 k=1。'),
  testCase('26-case-site-upper-diverse', siteUpper, '本站 10000 项上限并覆盖 -100 到 100 的全部合法值，检验每个值只保留一次。'),
];

export const lesson26 = {
  schemaVersion: 1,
  id: '26',
  slug: 'remove-duplicates-from-sorted-array',
  title: '删除有序数组中的重复项',
  order: 50,
  lessonVersion: PROBLEM_META['26'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '从 C 的数组与下标过渡到 Java 的 int[]、length、while/for、数组元素赋值和 int 返回值。',
    '理解返回值 k 与原地修改后的 nums[0..k) 必须同时正确，k 之后的内容不参与判定。',
    '用读写指针维护“已扫描部分的有序去重结果”这一循环不变量。',
    '根据真实编译与执行反馈区分返回长度错误、前缀内容错误和越界异常。',
  ],
  source: { platform: 'LeetCode', number: 26, url: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/' },
  taskSemantics: '给定一个非降序排列的整数数组 nums，请在同一个数组对象内把每个不同值按原顺序放到前面，返回不同值的数量 k。只有 nums 的前 k 项构成答案，k 之后的内容可以保留旧值。本站题面、示例、推导和代码均为原创表达。',
  siteLimits: { description: '本站真实判题接受 1—10000 项、每项 -100—100，输入必须非降序。参考状态演示最多 30 项；更长合法输入仍可真实运行。', inputSchemaId: 'RemoveDuplicatesInputSchema' },
  steps: [
    {
      id: '26-step-syntax', kind: 'syntax', title: 'Java 前置 · 方法、int[]、length、循环与返回值',
      body: `学生只写 class Solution 和 public int removeDuplicates(int[] nums)，不写 main。nums 是保存数组对象引用值的变量，nums.length 是长度，nums[i] 读取或修改该对象的第 i 项；i、read、write 和返回的 k 都是 int 基本值。Java 参数按值传递：调用方法时复制数组引用值，所以 nums[write]=... 会修改调用器持有的同一数组对象；给 nums 变量重新赋一个新数组只改变本地绑定。\n\nfor (int read=1; read<nums.length; read++) 与 C 的计数循环含义相近。合法元素下标为 0 到 length-1；write 可以暂时等于 length，表示有效前缀已占满数组，但此时不能再访问 nums[write]。return write 返回基本值，不会自动返回整个数组；可信调用器会把返回 k 与修改后的前缀一起交给判题器。`,
      relatedIds: ['J1', 'J2', 'J3', '26-case-single'],
    },
    {
      id: '26-step-understanding', kind: 'understanding', title: '读题与手算 · 返回 k，同时整理前缀',
      body: `输入 {"nums":[1,1,2,2,3]}。第一次看到 1 时它已在前缀；第二个 1 重复，跳过。看到 2 时把它写到下标 1，看到第二个 2 时跳过；看到 3 时写到下标 2。最后 k=3，数组可能是 [1,2,3,2,3]。判题读取前 3 项 [1,2,3]；后两项虽仍有旧值，也不算错误。结构化提交结果是 {"kind":"int-array","values":[1,2,3]}。`,
      relatedIds: ['26-case-clusters', '26-case-pair-same'],
    },
    {
      id: '26-step-derivation', kind: 'derivation', title: '推导 · 为什么有序条件让一次扫描足够',
      body: `若另建集合再返回不同值数量，可能算对 k，却没有完成“把答案写回原数组”的要求。输入已非降序，相同值必定相邻；因此不必保存所有见过的值，只要把当前 nums[read] 与有效前缀最后一项 nums[write-1] 比较。不同则写到 nums[write] 并让 write 前进，相同则跳过。\n\n循环入口不变量：nums[0..write) 恰好是原输入 nums[0..read) 的有序去重结果，write 是其长度和下一写入位置。一次新值写入后不变量扩展到 read+1；重复值不改变结果。扫描结束时 nums[0..write) 正是整个输入的去重结果。时间 O(n)，除局部变量外额外空间 O(1)；这是由扫描次数和存储推导出来的，不是用少量运行时间猜测。`,
      relatedIds: ['init-write', 'check-unique', 'copy-unique', 'advance-write'],
    },
    {
      id: '26-step-predict', kind: 'prediction', title: '先预测 · 当前值是否写入，最终 k 是多少',
      body: '默认演示 [1,1,2,2,3] 中，read=1 的第二个 1 会被跳过；最终 k=3。切换输入后两题会从该输入的不可变参考快照重新计算。预测只是教学检查，不是学生 Java 的编译执行结果。',
      relatedIds: ['26-predict-decision', '26-predict-count'],
    },
    {
      id: '26-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '变量表、完整 nums 数组、read/write 指针、有效前缀和代码高亮都读取同一份不可变快照。可用下一步、上一步、播放、暂停和重置观察写入前后的差异。最后另列 submitted-prefix，明确它才是 k 限定的判题结果。学生源码不会改变参考轨迹；学生 Java 只通过受限 Docker runner 得到真实反馈。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '26-step-guided', kind: 'guided-code', title: '引导编写 · 从比较条件到完整方法',
      body: '先补出“与有效前缀最后一项不同”的分支，再自己维护 read/write，最后从方法骨架完成整题。静态练习只帮助检查思路，不能因为文本像参考答案就判通过；最终必须提交完整 Solution.java 到真实 runner。',
      relatedIds: ['26-guided'],
    },
    {
      id: '26-step-independent', kind: 'independent-code', title: '独立挑战 · 同时验证 k 和数组前缀',
      body: '独立模式只给方法骨架，和引导草稿分别保存。先用 [2,2] 检查 k，再用 [1,1,2] 检查前缀是否真的变为 [1,2]，最后用无重复数组检查 write 到达 length 时不越界。真实反馈会区分编译错误、运行异常、超时与错误答案；打印 PASS 不会通过本站测试。',
      relatedIds: ['26-case-pair-same', '26-case-clusters', '26-case-no-duplicates'],
    },
    {
      id: '26-step-summary', kind: 'summary', title: '复盘 · 有效前缀是一项完整契约',
      body: '能够说明 write 的双重含义：它既是不同值数量，也是下一写入位置。返回 k 但不修改前缀、修改前缀却返回错误 k 都不能通过。区分 int 基本值与 nums 变量保存的引用值，并说明数组尾部未纳入答案。提示使用、查看答案、引导通过与独立通过本站测试分别记录；本站判定不等于原平台官方评测。',
      relatedIds: ['J3', 'J8', 'return-length'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '90086fd4c440a4364c6cde7ca673b6e40b71ccc19a5d0f8fffbc6f73f637e029',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '26-hint-concept', level: 1, body: '输入已经排序；相同值会连在一起。想一想当前值只需与哪一个已保留值比较。' },
    { id: '26-hint-invariant', level: 2, body: '让 nums[0..write) 始终等于已扫描部分的去重结果。read 读当前项，write 指向下一处可写位置。' },
    { id: '26-hint-pseudocode', level: 3, body: '令 write=1；read 从 1 扫描。若 nums[read] != nums[write-1]，执行 nums[write]=nums[read] 后 write++。最后返回 write。' },
  ],
  predictionChecks: [
    {
      id: '26-predict-decision', prompt: '默认输入 [1,1,2,2,3] 中 read=1 时，当前值会怎样处理？',
      answer: { kind: 'choice', optionId: 'skip' },
      options: [{ id: 'copy', label: '写入 nums[write]' }, { id: 'skip', label: '跳过且 write 不变' }],
      explanation: 'nums[1] 与有效前缀最后一项 nums[0] 都是 1，所以跳过。切换输入后从当前轨迹读取实际答案。', checkpointId: 'first-decision',
    },
    {
      id: '26-predict-count', prompt: '默认输入 [1,1,2,2,3] 的最终有效前缀长度 k 是多少？',
      answer: { kind: 'int', value: 3 },
      explanation: '不同值是 1、2、3，因此返回 3；切换输入后答案随当前轨迹变化。', checkpointId: 'final-count',
    },
  ],
  guided: {
    id: '26-guided', finalCheck: 'real-java-submit', stages: [
      {
        id: '26-guided-condition', instruction: '支架 1 / 3：补全判断、写入和 write 前进；注意比较对象是有效前缀最后一项。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int removeDuplicates(int[] nums) {
        int write = 1;
        // 保持 nums[0..write) 是已扫描部分的不重复前缀。
        for (int read = 1; read < nums.length; read++) {
            // TODO：若当前值是新值，把它写入有效前缀并推进 write。
        }
        return write;
    }
}
`,
      },
      {
        id: '26-guided-invariant', instruction: '支架 2 / 3：只保留变量提示，自己写循环，让 nums[0..write) 始终是不重复前缀。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int removeDuplicates(int[] nums) {
        int write = 1;
        // TODO：用 read 扫描剩余元素，维护有效前缀。
        // TODO：返回有效前缀长度。
        throw new UnsupportedOperationException("请完成读写指针");
    }
}
`,
      },
      {
        id: '26-guided-whole', instruction: '支架 3 / 3：从方法骨架独立完成，再把完整 Java 源码交给真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  commonErrors: [
    { id: '26-error-length-only', description: '直接返回 nums.length，误以为排序数组已经满足要求。', counterexampleInputId: '26-case-pair-same', explanation: '[2,2] 只有一个不同值，正确 k=1；原长度 2 会让重复值进入判题前缀。' },
    { id: '26-error-count-only', description: '只统计不同值数量，没有把新值写到数组前缀。', counterexampleInputId: '26-case-clusters', explanation: '[1,1,2,2,3] 虽能数出 3，但原前三项 [1,1,2] 不是要求的 [1,2,3]。' },
    { id: '26-error-write-zero', description: '把 write 初始化为 0，却仍访问 nums[write-1]。', counterexampleInputId: '26-case-pair-distinct', explanation: '一旦进入循环就会访问 nums[-1] 并产生数组越界异常；首项已经构成长度为 1 的有效前缀，所以 write 应从 1 开始。' },
    { id: '26-error-return-last-index', description: '把 write 当作最后一个有效下标，错误返回 write-1。', counterexampleInputId: '26-case-single', explanation: 'k 是元素数量；单项数组应返回 1，而最后下标是 0。' },
  ],
  testSuite: {
    version: PROBLEM_META['26'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '26-wrong-return-length', source: WRONG_RETURN_LENGTH_SOURCE, targetedCaseIds: ['26-case-pair-same', '26-case-clusters', '26-case-site-upper-same'] },
      { id: '26-wrong-count-only', source: WRONG_COUNT_ONLY_SOURCE, targetedCaseIds: ['26-case-clusters', '26-case-long-run', '26-case-negative-duplicates'] },
    ],
  },
  visualization: {
    modelId: '26-stable-unique-prefix', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson26;

export { WRONG_COUNT_ONLY_SOURCE, WRONG_RETURN_LENGTH_SOURCE } from './reference.js';
