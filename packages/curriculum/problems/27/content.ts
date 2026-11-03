import {
  PROBLEM_META,
  RemoveElementInputSchema,
  expectedOutput,
  type Lesson,
  type RemoveElementInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_COUNT_ONLY_SOURCE,
  WRONG_REMOVED_COUNT_SOURCE,
} from './reference.js';

type Lesson27 = Extract<Lesson, { id: '27' }>;
type Case27 = Lesson27['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RemoveElementInput }[] = [
  { id: '27-demo-mixed', title: '两端都有目标值：[3,2,2,3]，移除 3', input: { nums: [3, 2, 2, 3], val: 3 } },
  { id: '27-demo-clusters', title: '多段目标值：[0,1,2,2,3,0,4,2]，移除 2', input: { nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 } },
  { id: '27-demo-empty', title: '空数组：[]', input: { nums: [], val: 7 } },
  { id: '27-demo-all-remove', title: '全部移除：[5,5,5]', input: { nums: [5, 5, 5], val: 5 } },
];

function testCase(id: string, nums: number[], val: number, coverage: string): Case27 {
  const input = RemoveElementInputSchema.parse({ nums, val });
  const expected = expectedOutput('27', input);
  if (expected.kind !== 'int-array') throw new Error('27 可信输出必须是 int-array');
  return { id, input, expected, coverage };
}

const cases: Case27[] = [
  testCase('27-case-empty', [], 7, '空数组；循环不进入，返回 k=0，不能访问 nums[0]。'),
  testCase('27-case-single-remove', [5], 5, '单项且等于 val；有效前缀为空。'),
  testCase('27-case-single-keep', [5], -5, '单项且不等于 val；返回 1 并保留该值。'),
  testCase('27-case-all-remove', [4, 4, 4, 4], 4, '全部移除；区分保留数量与移除数量。'),
  testCase('27-case-all-keep', [-2, 0, 2, 4], 3, '没有元素等于 val；k 等于原长度。'),
  testCase('27-case-middle-run', [1, 7, 7, 7, 2], 7, '目标值集中在中间；后续 2 必须写回前缀。'),
  testCase('27-case-alternating', [9, 1, 9, 2, 9, 3, 9], 9, '目标值与保留值交替；检验多次跳过与覆盖。'),
  testCase('27-case-duplicates-kept', [3, 2, 2, 3], 3, '保留元素可以重复；结果多重集合必须含两个 2。'),
  testCase('27-case-negative', [-3, -1, -3, 0, -3, 2], -3, '负数目标与零；比较 int 数值，保留 [-1,0,2]。'),
  testCase('27-case-bounds', [-100, 100, -100, 0, 100], -100, '本站数值上下界；移除 -100 并保留两个 100。'),
  testCase('27-case-order-flexible', [1, 2, 3, 2, 4], 2, '顺序不限判定：前 k 项可为 [1,3,4] 的任意排列，但不可丢失或复制。'),
  testCase('27-case-display-edge', Array.from({ length: 30 }, (_, index) => index % 4), 2, '恰好 30 项仍可生成完整参考状态演示。'),
  testCase('27-case-run-only', Array.from({ length: 31 }, (_, index) => index % 3), 1, '31 项超出演示上限，但真实 Java 判题仍应接受。'),
  testCase('27-case-site-upper-all-remove', Array(10000).fill(8), 8, '本站 10000 项上限且全部移除，检验线性扫描与 k=0。'),
  testCase('27-case-site-upper-mixed', Array.from({ length: 10000 }, (_, index) => index % 5 - 2), 0, '本站 10000 项上限的混合输入，检验保留元素数量和多重集合。'),
];

export const lesson27 = {
  schemaVersion: 1,
  id: '27',
  slug: 'remove-element',
  title: '移除元素',
  order: 53,
  lessonVersion: PROBLEM_META['27'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '把 C 的数组扫描迁移到 Java 的方法、int[]、length、循环、元素赋值与 int 返回值。',
    '理解返回值 k 和原数组前 k 项共同组成答案，k 之后的元素不参与判定。',
    '用读写指针维护“已扫描部分中不等于 val 的稳定前缀”这一循环不变量。',
    '区分参考解法采用的稳定顺序与题目判定允许的任意顺序，并通过真实 runner 检查多重集合。',
  ],
  source: { platform: 'LeetCode', number: 27, url: 'https://leetcode.com/problems/remove-element/' },
  taskSemantics: '给定整数数组 nums 和整数 val，请在同一个数组对象中把所有不等于 val 的元素放到前面，返回这些元素的数量 k。前 k 项必须恰好包含应保留元素，顺序不限；k 之后的内容不参与判定。本站题面、示例、推导和代码均为原创表达。',
  siteLimits: { description: '本站真实判题接受 0—10000 项，每项与 val 均为 -100—100。参考状态演示最多 30 项；更长合法输入仍可真实运行。', inputSchemaId: 'RemoveElementInputSchema' },
  steps: [
    {
      id: '27-step-syntax', kind: 'syntax', title: 'Java 前置 · 方法、int[]、length、循环与返回值',
      body: `学生只写 class Solution 和 public int removeElement(int[] nums, int val)，不写 main。nums 是保存数组对象引用值的变量，val、read、write 和返回的 k 都是 int 基本值。nums.length 读取长度，nums[i] 访问或修改同一个数组对象的元素。Java 方法参数按值传递：调用时复制 nums 中的引用值，因此 nums[write]=... 会修改调用器持有的数组对象；给局部变量 nums 重新赋新数组只改变局部绑定。\n\nfor 循环写法与 C 相近。合法元素下标为 0 到 length-1；write 可以等于 length，表示前缀占满数组，此时不能再把它当下标访问。return write 只返回基本值；可信调用器会读取修改后的 nums[0..write) 并形成结构化结果。`,
      relatedIds: ['J1', 'J2', 'J3', '27-case-empty'],
    },
    {
      id: '27-step-understanding', kind: 'understanding', title: '读题与手算 · 数量和前缀必须一起正确',
      body: `输入 {"nums":[3,2,2,3],"val":3}。扫描第一个 3 时跳过；看到两个 2 时依次写到下标 0、1；最后一个 3 再跳过。参考解法返回 k=2，数组可能变为 [2,2,2,3]，结构化提交结果是 {"kind":"int-array","values":[2,2]}。\n\n本题允许前 k 项使用其他顺序。例如输入 [1,2,3,2,4]、val=2 时，[4,3,1] 也合法。判题比较数量和多重集合：重复的保留值不能被合并，val 不能残留，任何应保留值也不能丢失。`,
      relatedIds: ['27-case-duplicates-kept', '27-case-order-flexible'],
    },
    {
      id: '27-step-derivation', kind: 'derivation', title: '推导 · 用已扫描前缀覆盖不再需要的位置',
      body: `另建新数组很直观，却没有体现“在原数组中整理”的要求。只统计不等于 val 的个数也不够，因为可信调用器还会提交前 k 项。使用 read 逐项读取原输入，write 指向下一处保留位置：当前值不等于 val 时写入 nums[write] 并推进 write；等于 val 时只推进 read。\n\n循环入口不变量：nums[0..write) 恰好是原输入 nums[0..read) 中所有不等于 val 的元素，且保持相对顺序。因为 write 不会超过 read，写入不会破坏尚未读取的数据。扫描结束时 write 是保留数量，前缀也是完整答案。时间 O(n)，除局部变量外额外空间 O(1)。参考解法保持顺序便于推导，但真实判定接受同一多重集合的任意排列。`,
      relatedIds: ['init-write', 'check-keep', 'copy-keep', 'advance-write'],
    },
    {
      id: '27-step-predict', kind: 'prediction', title: '先预测 · 当前元素是否保留，最终 k 是多少',
      body: '默认演示 [3,2,2,3]、val=3 中，第一个 3 不进入有效前缀，最终 k=2。切换输入后，两道检查会从该输入的不可变参考快照读取答案。预测只是教学检查，不是学生 Java 的编译执行结果。',
      relatedIds: ['27-predict-decision', '27-predict-count'],
    },
    {
      id: '27-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '变量表、完整 nums、read/write 指针、有效前缀与代码高亮都读取同一份不可变快照。可前进、后退、播放、暂停、重置和切换输入。最终单独显示 submitted-prefix，明确 k 之后不参与判定。学生源码不会改变参考轨迹；学生 Java 只通过受限 Docker runner 得到真实反馈。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '27-step-guided', kind: 'guided-code', title: '引导编写 · 从保留条件到完整方法',
      body: '先补出“不等于 val 时写入”的分支，再独立维护 read/write，最后从方法骨架完成整题。静态练习只帮助检查思路，不能根据填入文字判通过；最终必须把完整 Solution.java 提交给真实 runner。',
      relatedIds: ['27-guided'],
    },
    {
      id: '27-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例检查数量、多重集合和边界',
      body: '独立模式只给方法骨架，并与引导草稿分别保存。先用空数组检查不越界，再用 [3,2,2,3] 检查重复保留值没有丢失，最后用目标值位于中间的输入检查后缀已写回前缀。真实反馈会区分编译错误、运行异常、超时、输出超限和错误答案；打印 PASS 不会通过本站测试。',
      relatedIds: ['27-case-empty', '27-case-duplicates-kept', '27-case-middle-run'],
    },
    {
      id: '27-step-summary', kind: 'summary', title: '复盘 · k 限定了判题读取的数组前缀',
      body: '能够说明 write 既是保留元素数量，也是下一写入位置；返回数量但没有整理前缀仍会失败。能够区分 int 基本值和 nums 中保存的数组引用值，并说明参考稳定顺序只是一个合法实现，题目契约还接受其他排列。提示使用、查看答案、引导通过与独立通过本站测试分别记录；本站判定不等于原平台官方评测。',
      relatedIds: ['J3', 'J8', 'return-length'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'd9a9a8d958b9fa100ddea6daabbffdd591ec721b57cc446690a255c6196d44de',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '27-hint-concept', level: 1, body: '答案是“所有不等于 val 的元素”。读取一个应保留的值时，要把它放进答案前缀。' },
    { id: '27-hint-invariant', level: 2, body: '让 nums[0..write) 始终等于已扫描原输入中的保留元素；read 读当前项，write 指向下一处可写位置。' },
    { id: '27-hint-pseudocode', level: 3, body: 'write=0；read 从 0 扫描。若 nums[read] != val，执行 nums[write]=nums[read] 后 write++。最后返回 write。' },
  ],
  predictionChecks: [
    {
      id: '27-predict-decision', prompt: '默认输入 [3,2,2,3]、val=3 中，read=0 时当前值会怎样处理？',
      answer: { kind: 'choice', optionId: 'remove' },
      options: [{ id: 'keep', label: '写入 nums[write] 并推进 write' }, { id: 'remove', label: '跳过且 write 不变' }],
      explanation: 'nums[0] 等于 val=3，所以不进入有效前缀。切换输入后从当前轨迹读取实际答案。', checkpointId: 'first-decision',
    },
    {
      id: '27-predict-count', prompt: '默认输入 [3,2,2,3]、val=3 的最终有效前缀长度 k 是多少？',
      answer: { kind: 'int', value: 2 },
      explanation: '两个 2 都必须保留，因此返回 2。切换输入后答案随当前轨迹变化。', checkpointId: 'final-count',
    },
  ],
  guided: {
    id: '27-guided', finalCheck: 'real-java-submit', stages: [
      {
        id: '27-guided-condition', instruction: '支架 1 / 3：补全保留条件、写入和 write 前进；等于 val 时不要写入。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int removeElement(int[] nums, int val) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            // TODO：若当前值应保留，把它写入有效前缀并推进 write。
        }
        return write;
    }
}
`,
      },
      {
        id: '27-guided-invariant', instruction: '支架 2 / 3：只保留变量提示，自己写扫描，让 nums[0..write) 始终是保留前缀。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int removeElement(int[] nums, int val) {
        int write = 0;
        // TODO：用 read 扫描原输入，遇到不等于 val 的值就写到 write。
        // TODO：返回有效前缀长度。
        throw new UnsupportedOperationException("请完成读写指针");
    }
}
`,
      },
      {
        id: '27-guided-whole', instruction: '支架 3 / 3：从方法骨架独立完成，再把完整 Java 源码交给真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  commonErrors: [
    { id: '27-error-removed-count', description: '返回等于 val 的元素数量，把“移除数量”当成 k。', counterexampleInputId: '27-case-all-remove', explanation: '[4,4,4,4]、val=4 应返回保留数量 0；移除数量 4 恰好相反。' },
    { id: '27-error-count-only', description: '只统计保留数量，却没有把保留值写到数组前缀。', counterexampleInputId: '27-case-middle-run', explanation: '[1,7,7,7,2] 虽能数出 2，但原前两项 [1,7] 仍含 val，必须把 2 写到下标 1。' },
    { id: '27-error-drop-duplicates', description: '误把任务当成去重，合并了重复的保留值。', counterexampleInputId: '27-case-duplicates-kept', explanation: '[3,2,2,3]、val=3 中两个 2 都是合法且必须保留的独立元素。' },
    { id: '27-error-empty-access', description: '先读取 nums[0] 再判断长度。', counterexampleInputId: '27-case-empty', explanation: '空数组是合法输入；提前读取会产生 ArrayIndexOutOfBoundsException，正确循环可以自然返回 0。' },
    { id: '27-error-rebind', description: '创建新数组并只给局部变量 nums 重新赋值，误以为调用器会看到新对象。', counterexampleInputId: '27-case-alternating', explanation: 'Java 按值传递数组引用值；重新绑定局部 nums 不会替换调用器持有的数组，必须修改原数组元素。' },
  ],
  testSuite: {
    version: PROBLEM_META['27'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '27-wrong-removed-count', source: WRONG_REMOVED_COUNT_SOURCE, targetedCaseIds: ['27-case-single-remove', '27-case-all-remove', '27-case-all-keep'] },
      { id: '27-wrong-count-only', source: WRONG_COUNT_ONLY_SOURCE, targetedCaseIds: ['27-case-middle-run', '27-case-alternating', '27-case-negative'] },
    ],
  },
  visualization: {
    modelId: '27-stable-filter-prefix', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson27;

export { WRONG_COUNT_ONLY_SOURCE, WRONG_REMOVED_COUNT_SOURCE } from './reference.js';
