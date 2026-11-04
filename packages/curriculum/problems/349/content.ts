import {
  ArrayIntersectionInputSchema,
  PROBLEM_META,
  expectedOutput,
  type ArrayIntersectionInput,
  type Lesson,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_KEEP_DUPLICATES_SOURCE,
  WRONG_SAME_INDEX_SOURCE,
} from './reference.js';

type Lesson349 = Extract<Lesson, { id: '349' }>;
type Case349 = Lesson349['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: ArrayIntersectionInput }[] = [
  { id: 'demo-overlap', title: '重复但只返回一次', input: { nums1: [4, 9, 5, 4], nums2: [9, 4, 9, 8, 4] } },
  { id: 'demo-disjoint', title: '没有共同值', input: { nums1: [1, 3, 5], nums2: [2, 4, 6] } },
  { id: 'demo-zero-boundary', title: '零与上界', input: { nums1: [0, 500, 1000], nums2: [1000, 7, 0] } },
];

function testCase(id: string, input: ArrayIntersectionInput, coverage: string): Case349 {
  const parsed = ArrayIntersectionInputSchema.parse(input);
  const expected = expectedOutput('349', parsed);
  if (expected.kind !== 'int-array') throw new Error('349 expected output must be int-array');
  return { id, input: parsed, expected, coverage };
}

const cases: Case349[] = [
  testCase('349-case-single-common', { nums1: [7], nums2: [7] }, '两个最短数组有一个共同值。'),
  testCase('349-case-single-disjoint', { nums1: [7], nums2: [8] }, '两个最短数组没有共同值，返回空数组。'),
  testCase('349-case-duplicates-both', { nums1: [1, 2, 2, 1], nums2: [2, 2] }, '两侧都有重复值，交集仍只能包含一个 2。'),
  testCase('349-case-reordered', { nums1: [4, 9, 5], nums2: [9, 4, 9, 8, 4] }, '共同值位于不同下标，返回顺序不参与正确性。'),
  testCase('349-case-zero', { nums1: [0, 1, 2], nums2: [3, 0, 0] }, '零是普通合法值，且重复零只返回一次。'),
  testCase('349-case-upper-bound', { nums1: [999, 1000], nums2: [1000] }, '覆盖本站值域上界 1000。'),
  testCase('349-case-disjoint-many', { nums1: [1, 3, 5, 7], nums2: [2, 4, 6, 8] }, '多项完全不相交，不能把任一侧原样返回。'),
  testCase('349-case-all-same', { nums1: [6, 6, 6], nums2: [6, 6] }, '全部元素相同，结果长度必须为 1。'),
  testCase('349-case-first-subset', { nums1: [2, 4], nums2: [1, 2, 3, 4, 5] }, '第一个数组的不同值全部属于交集。'),
  testCase('349-case-second-subset', { nums1: [1, 2, 3, 4, 5], nums2: [2, 4] }, '第二个数组的不同值全部属于交集，验证参数角色不影响语义。'),
  testCase('349-case-duplicate-first', { nums1: [3, 3, 3, 8], nums2: [3, 9] }, '第一个数组重复命中，发现一次后不能重复写入结果。'),
  testCase('349-case-duplicate-second', { nums1: [5, 8], nums2: [8, 8, 8, 9] }, '第二个数组重复成员不会改变成员集合。'),
  testCase('349-case-three-common', { nums1: [10, 20, 30, 40], nums2: [30, 10, 50, 20] }, '三个共同值散落且顺序不同，检查完整收集。'),
  testCase('349-case-domain-edges', { nums1: [1000, 0, 500, 0], nums2: [500, 0, 1000, 1000] }, '同时覆盖 0、中间值和 1000，并检查去重。'),
];

export const lesson349 = {
  schemaVersion: 1,
  id: '349',
  slug: 'intersection-of-two-arrays',
  title: '两个数组的交集',
  order: 58,
  lessonVersion: PROBLEM_META['349'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: [
    '能写出 int[] 参数、增强 for 循环和 int[] 返回值，并区分数组引用与数组中的 int 基本值。',
    '能声明 HashSet<Integer>，说明泛型使用 Integer，以及 int 加入集合和取出时发生的自动装箱与拆箱。',
    '用“members 是 nums2 已扫描前缀的不同值，common 是已确认的共同值”陈述两段扫描不变量。',
    '理解交集结果不含重复值且顺序不限，并通过真实 Java runner 识别漏值、多值和重复值。',
  ],
  source: { platform: 'LeetCode', number: 349, url: 'https://leetcode.com/problems/intersection-of-two-arrays/' },
  taskSemantics: '给定两个非空整数数组，返回全部且仅有的共同值。每个共同值在结果中只能出现一次，返回顺序不限。输入数组中的重复项不增加结果项数；题面、例子和讲解均为本站原创表达。',
  siteLimits: { description: '本站真实判题中两个数组各含 1 到 1000 项，每项是 0 到 1000 的整数；参考演示为可读性要求每个数组不超过 30 项。', inputSchemaId: 'ArrayIntersectionInputSchema' },
  steps: [
    {
      id: '349-step-syntax', kind: 'syntax', title: 'Java 前置 · int[]、增强 for 与 HashSet<Integer>',
      body: '方法签名是 public int[] intersection(int[] nums1, int[] nums2)。nums1 和 nums2 是保存数组引用值的变量，元素才是 int 基本值；Java 调用方法时按值复制这两个引用值，并不会自动复制数组。增强 for 写作 for (int value : nums2)，依次把元素的 int 值赋给局部变量 value。\n\n集合写作 Set<Integer> members = new HashSet<>();，其中变量使用 Set<Integer> 接口，右侧对象的完整实现类型是 HashSet<Integer>，菱形 <> 让编译器推断 Integer。泛型不能使用 int，所以集合元素类型写 Integer；members.add(value) 时 int 自动装箱，contains(value) 查询时也按 Integer 的数值相等性判断。add 同一数值多次仍只保留一个成员。',
      relatedIds: ['J1', 'J2', 'J3', 'J5'],
    },
    {
      id: '349-step-understanding', kind: 'understanding', title: '理解任务 · 共同值只保留一份',
      body: '手工模拟 nums1=[4,9,5,4]、nums2=[9,4,9,8,4]。先把 nums2 的不同值整理成 {4,8,9}；再扫描 nums1：4 命中、9 命中、5 未命中、最后一个 4 虽再次命中却已在交集集合中。于是交集是 {4,9}。返回顺序不限，所以 [4,9] 或 [9,4] 都正确；[4,9,4] 因重复而错误，[4] 因漏掉 9 也错误。',
      relatedIds: ['349-case-reordered', '349-case-duplicates-both'],
    },
    {
      id: '349-step-derivation', kind: 'derivation', title: '算法推导 · 两个集合分开承担职责',
      body: '逐对比较两个数组会重复做许多工作。参考算法先扫描 nums2，令 members 保存其已扫描前缀的全部不同值；扫描结束后，contains 就能回答某个数是否出现在 nums2。再扫描 nums1，只有 members.contains(value) 为真时才把 value 放入 common。HashSet 自动去重，所以 common 始终等于“nums1 已扫描前缀与完整 nums2 的不同共同值”。\n\n参考代码最后利用本站 0..1000 的公布值域把 common 稳定转成升序 int[]，只是为了让演示可重复；题目判定仍接受任意顺序。平均时间为 O(n+m+1001)，固定值域下写作 O(n+m)，额外空间 O(n+m) 的不同值上界。小用例运行时间不能证明复杂度。',
      relatedIds: ['init-members', 'check-member', 'add-common', 'write-result'],
    },
    {
      id: '349-step-prediction', kind: 'prediction', title: '先预测 · 当前值是否命中，最终有几个值',
      body: '演示提供两个与输入绑定的检查点：第一次扫描 nums1 时，当前 value 是否存在于 members；结束前，common 中一共有多少个不同共同值。请先作答再揭示。它们是参考状态模型上的静态预测，不是 javac 或 java 的执行结果。',
      relatedIds: ['349-predict-first-membership', '349-predict-result-length'],
    },
    {
      id: '349-step-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '演示依次显示 nums2 扫描、nums1 查询、common 去重和结果数组写入。集合使用“整数键 → true”的成员表显示，表格排序只是方便阅读，不代表 HashSet 有顺序。所有变量、数组指针、集合和代码高亮读取同一个不可变快照；后退会恢复历史快照。学生源码不会改变这条预置轨迹，学生提交必须另走真实 Docker Java runner。',
      relatedIds: ['demo-overlap', 'demo-disjoint', 'demo-zero-boundary'],
    },
    {
      id: '349-step-guided', kind: 'guided-code', title: '引导编写 · 建成员集、收交集、转数组',
      body: '第一阶段补全 members 的 add 和 contains；第二阶段自己建立 common 并处理去重；第三阶段从方法骨架完成结果数组。静态支架只帮助组织代码，不通过源码字符串匹配判定正确。最终必须把完整 Solution.java 提交到真实 runner，通过本站测试后才记录引导通过。',
      relatedIds: ['349-guided'],
    },
    {
      id: '349-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例区分漏值与重复值',
      body: '独立草稿从方法骨架开始，与引导草稿分别保存。先运行 [7] 与 [8] 检查空交集，再运行 [1,2,2,1] 与 [2,2] 检查重复，再运行下标错开的 [4,9,5] 与 [9,4,9,8,4] 检查完整性。若结果重复，检查是否直接把每次命中写入列表；若漏值，检查是否错误地只比较相同下标。修正后提交全部本站测试。',
      relatedIds: ['349-case-single-disjoint', '349-case-duplicates-both', '349-case-reordered'],
    },
    {
      id: '349-step-summary', kind: 'summary', title: '复盘 · 集合负责成员关系和去重',
      body: '请用自己的话回答：为什么泛型写 Integer 而不是 int？members 与 common 分别保存什么？为什么 common.add 同一数值多次不会制造重复结果？为什么 [4,9] 和 [9,4] 都应通过？结果数组长度为什么应取 common.size()？\n\n本站分别记录预测完成、提示使用、查看答案、引导通过和独立通过本站测试。观看参考动画不表示学生 Java 已执行，通过本站测试也不代表 LeetCode 官方评测结果。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '79682f12e5882984972986e5ffeb4029c327d3c14ba35cd16dab15e3703278d3',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: [...REFERENCE_STEP_MAP],
  },
  hints: [
    { id: '349-hint-concept', level: 1, body: '先把一个数组的不同值保存起来，让另一个数组的每个值都能做成员查询。另准备一个集合自动去掉重复命中。' },
    { id: '349-hint-invariant', level: 2, body: 'members 最终等于 nums2 的不同值集合；扫描 nums1 的 value 前，common 恰好包含此前已经命中的不同值。只有 members.contains(value) 时才 add 到 common。' },
    { id: '349-hint-pseudocode', level: 3, body: 'members 加入 nums2 每项；遍历 nums1，命中 members 就加入 common；创建长度为 common.size() 的 int[]，把 common 的值各写一次并返回。返回顺序不限。' },
  ],
  predictionChecks: [
    {
      id: '349-predict-first-membership',
      prompt: '输入 nums1=[4,9,5,4]、nums2=[9,4,9,8,4]：第一次查询 value=4 时，members 包含 4 吗？',
      answer: { kind: 'choice', optionId: 'present' },
      options: [{ id: 'present', label: '包含' }, { id: 'absent', label: '不包含' }],
      explanation: 'members 已经收集 nums2 的全部不同值，其中包含 4。',
      checkpointId: 'first-membership',
    },
    {
      id: '349-predict-result-length',
      prompt: '同一输入的最终结果数组长度是多少？',
      answer: { kind: 'int', value: 2 },
      explanation: '不同共同值只有 4 和 9，因此 common.size() 与结果长度都是 2。',
      checkpointId: 'result-length',
    },
  ],
  guided: {
    id: '349-guided',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: '349-guided-membership',
        instruction: '支架 1 / 3：补全把 nums2 放入 members，以及扫描 nums1 时的成员查询。',
        checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> members = new HashSet<>();
        for (int value : nums2) {
            /* TODO：把 value 加入 members */
        }
        Set<Integer> common = new HashSet<>();
        for (int value : nums1) {
            if (/* TODO：value 是否在 members 中 */) common.add(value);
        }
        // TODO：把 common 转成 int[] 后返回。
        throw new UnsupportedOperationException("请完成结果转换");
    }
}
`,
      },
      {
        id: '349-guided-sets',
        instruction: '支架 2 / 3：自行建立两个集合，维持成员集和交集集的不变量，再创建正确长度的结果数组。',
        checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        // TODO：建立 members 和 common，再把每个共同值写入 int[]。
        throw new UnsupportedOperationException("请完成集合交集");
    }
}
`,
      },
      {
        id: '349-guided-whole',
        instruction: '支架 3 / 3：从方法骨架独立完成；最终提交完整 Java 源码到真实 runner。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  commonErrors: [
    { id: '349-error-keep-duplicates', description: '每次 nums1 的值命中就直接追加到结果列表，没有去重。', counterexampleInputId: '349-case-duplicates-both', explanation: '[1,2,2,1] 与 [2,2] 的共同值只有 2；直接追加会返回 [2,2]，违反每个值只出现一次。' },
    { id: '349-error-same-index', description: '只比较 nums1[i] 与 nums2[i]。', counterexampleInputId: '349-case-reordered', explanation: '共同值可以位于不同下标；[4,9,5] 与 [9,4,9,8,4] 的 4 和 9 都不会在相同下标配对。' },
    { id: '349-error-return-members', description: '把 nums2 的成员集合原样当成交集返回。', counterexampleInputId: '349-case-disjoint-many', explanation: 'members 只说明值出现在 nums2；还必须确认它也出现在 nums1。完全不相交时结果应为空。' },
    { id: '349-error-fixed-result-length', description: '按 nums1.length 创建并返回整个结果数组。', counterexampleInputId: '349-case-single-disjoint', explanation: '交集可能为空；固定长度数组会留下并返回默认的 0，凭空制造一个共同值。结果长度必须等于不同共同值个数。' },
  ],
  testSuite: {
    version: PROBLEM_META['349'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '349-wrong-keep-duplicates', source: WRONG_KEEP_DUPLICATES_SOURCE, targetedCaseIds: ['349-case-duplicates-both', '349-case-duplicate-first', '349-case-domain-edges'] },
      { id: '349-wrong-same-index', source: WRONG_SAME_INDEX_SOURCE, targetedCaseIds: ['349-case-reordered', '349-case-three-common', '349-case-second-subset'] },
    ],
  },
  visualization: {
    modelId: '349-two-hash-sets',
    modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id),
    maxItems: 30,
    maxSnapshots: 2000,
    maxTreeDepth: 8,
  },
} satisfies Lesson349;
