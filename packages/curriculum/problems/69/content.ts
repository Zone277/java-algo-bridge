import { PROBLEM_META, SqrtInputSchema, expectedOutput, type Lesson, type SqrtInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_ROUND_NEAREST_SOURCE, WRONG_STRICT_SQUARE_SOURCE,
} from './reference.js';

type Lesson69 = Extract<Lesson, { id: '69' }>;
type Case69 = Lesson69['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: SqrtInput }[] = [
  { id: '69-demo-eight', title: '非完全平方数：8', input: { x: 8 } },
  { id: '69-demo-sixteen', title: '完全平方数：16', input: { x: 16 } },
  { id: '69-demo-zero', title: '边界：0', input: { x: 0 } },
  { id: '69-demo-one', title: '边界：1', input: { x: 1 } },
  { id: '69-demo-max-int', title: '最大 int：2147483647', input: { x: 2147483647 } },
];

function testCase(id: string, input: SqrtInput, coverage: string): Case69 {
  const parsed = SqrtInputSchema.parse(input);
  const expected = expectedOutput('69', parsed);
  if (expected.kind !== 'int') throw new Error('69 可信期望必须是 int');
  return { id, input: parsed, expected, coverage };
}

const cases: Case69[] = [
  testCase('69-case-zero', { x: 0 }, '下界 0：应直接返回 0，不可把右界设成负数后误回 1。'),
  testCase('69-case-one', { x: 1 }, '下界 1：应直接返回 1，避免除以零。'),
  testCase('69-case-two', { x: 2 }, '最小的非完全平方数，x/2 为 1，返回 1。'),
  testCase('69-case-three', { x: 3 }, '开方介于 1 和 2 之间，必须向下取整。'),
  testCase('69-case-four', { x: 4 }, '最小的非平凡完全平方数；比较必须允许相等。'),
  testCase('69-case-five', { x: 5 }, '平方根略大于 2；不能把整数除法的截断误解为平方根。'),
  testCase('69-case-eight', { x: 8 }, '平方根接近 3 但尚不足 3，四舍五入错解会返回 3。'),
  testCase('69-case-nine', { x: 9 }, '完全平方数，结果正好是 3；严格小于比较会错过它。'),
  testCase('69-case-fifteen', { x: 15 }, '紧邻 16 之前，根为 3 而不是 4。'),
  testCase('69-case-sixteen', { x: 16 }, '中点恰为根时必须保留该候选，结果为 4。'),
  testCase('69-case-twenty-four', { x: 24 }, '紧邻 25 之前，检查最后一次左/右边界收缩。'),
  testCase('69-case-twenty-five', { x: 25 }, '完全平方数 25 的根为 5，检查等号。'),
  testCase('69-case-largest-before-46340-square', { x: 2147395599 }, '46340² 之前一项，结果 46339；发现乘法溢出或错误上取整。'),
  testCase('69-case-46340-square', { x: 2147395600 }, '最大 int 内最大的完全平方数；正确根为 46340。'),
  testCase('69-case-max-int', { x: 2147483647 }, 'Java int 上限，结果仍为 46340，不能用 int 的 mid*mid 比较。'),
];

export const lesson69 = {
  schemaVersion: 1,
  id: '69', slug: 'sqrtx', title: '整数平方根', order: 35,
  lessonVersion: PROBLEM_META['69'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J8'],
  objectives: [
    '能把“向下取整的平方根”改写为寻找最大满足 k²≤x 的非负整数。',
    '能在闭区间二分中维护候选范围和已确认可行的 answer，说明为什么每次都能排除一侧。',
    '能解释 int 除法 x/mid 的截断以及 mid>0 时 mid≤x/mid 与 mid²≤x 等价，避开 int 乘法溢出和除零。',
    '能针对 0、1、完全平方数、平方数相邻值与最大 int 构造反例，再将完整 Java 提交到真实 runner。',
  ],
  source: { platform: 'LeetCode', number: 69, url: 'https://leetcode.com/problems/sqrtx/' },
  taskSemantics: '给定非负 Java int x，返回不超过 x 的平方根的最大非负整数。比如 x=8，2²=4≤8 而 3²=9>8，返回 2；x=9 返回 3。返回值是 int，不需要输出小数。题面、例子和讲解均为本站原创表达。',
  siteLimits: { description: '本站真实判题接受 0—2147483647 的 Java int。参考演示完整生成至多 2000 个快照；区间是数字范围，界限表只是教学视图，不会展开数十亿项数组，也不影响真实判题。', inputSchemaId: 'SqrtInputSchema' },
  steps: [
    {
      id: '69-step-syntax', kind: 'syntax', title: 'Java 前置 · int、整数除法与返回值',
      body: '方法签名 public int mySqrt(int x) 接收一个 int 基本值，调用时会复制这个数值；这里没有数组或对象引用。return 交回一个 int，方法不负责打印。对非负整数，x / mid 使用 Java 整数除法，舍去小数部分：8 / 3 等于 2。mid 必须先保证大于 0 才能做除法。\n\n若写 int square = mid * mid，x 接近 2147483647 时乘积可能超过 int 上限而溢出；本题用 mid <= x / mid 避免乘法，且 mid 总在从 1 开始的候选区间中。对应 J1 方法、J2 基本值和整数运算、J8 失败反馈。',
      relatedIds: ['J1', 'J2', 'J8'],
    },
    {
      id: '69-step-understanding', kind: 'understanding', title: '读题 · 结果是某个整数门槛',
      body: '手算 x=8：0²、1²、2² 都不超过 8，而 3² 已经超过，所以答案是 2。手算 x=16：4² 正好等于 16，应返回 4。x=0 和 x=1 直接返回自身。\n\n可以把所有非负整数分成“平方不超过 x”和“平方超过 x”两段；答案就是前一段最右端。四舍五入会把 8 的平方根误答成 3。',
      relatedIds: ['69-case-eight', '69-case-sixteen', '69-case-zero', '69-case-one'],
    },
    {
      id: '69-step-derivation', kind: 'derivation', title: '推导 · 搜索最大的可行整数',
      body: '逐个试 1、2、3……能找到门槛，但大输入要做太多次比较。对 x≥2，整数答案至少为 1、至多为 x/2，所以从闭区间 [left,right]=[1,x/2] 搜索。answer 初始为 1，表示已经确认可行的值。\n\n循环不变量：answer²≤x；真正答案要么已等于 answer，要么仍在 [left,right]。mid≤x/mid 等价于 mid²≤x（因为 mid>0），可行时记录 answer=mid 并搜索更大的右半区；不可行时把 right 移到 mid-1。每步缩小区间，结束时 answer 就是最大可行值。x<2 提前返回避免右界和除法的特殊处理。\n\n在通常的定长整数运算模型下，比较次数为 O(log x)，额外变量为 O(1)；本站有限测试不能证明复杂度。',
      relatedIds: ['init-answer', 'compare-square', 'record-answer', 'move-left', 'move-right'],
    },
    {
      id: '69-step-prediction', kind: 'prediction', title: '先预测 · 分支、中点与最终根',
      body: '切换演示输入后，先判断 x<2 是否进入提前返回；对于较大输入，再预测首次 mid，最后预测返回的整数。每个答案从当前输入的不可变参考快照读取。x=0/1 不会产生 mid 检查点，但仍有提前返回和最终值两问。预测属于教学检查，不会执行学生 Java。',
      relatedIds: ['69-predict-small', '69-predict-first-mid', '69-predict-result'],
    },
    {
      id: '69-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '逐步观察 left、right、mid、answer 与 x/mid 的值：先算中点，再比较，若可行先记录 answer 后移动 left。界限表只是数字区间的教学抽象，不是 Java 程序创建的 Map 或数组；不能把 x=2147483647 的区间展开为数十亿个元素。变量表和区间表读取同一份快照。此动画只对应参考 Java 代码，学生编辑源码不改变它；学生代码另由真实 javac/java 运行。',
      relatedIds: ['69-demo-eight', '69-demo-sixteen', '69-demo-zero', '69-demo-one', '69-demo-max-int'],
    },
    {
      id: '69-step-guided', kind: 'guided-code', title: '引导编写 · 从比较到完整二分',
      body: '第一支架补正确的除法比较；第二支架自己组织候选区间和左右边界更新；第三支架只留方法骨架，写完完整 Solution.java。支架只是可编辑练习，不靠填入文字是否与参考解法一致来判通过。最终使用真实 Java runner 提交本站测试，才会记录引导通过。',
      relatedIds: ['69-guided'],
    },
    {
      id: '69-step-independent', kind: 'independent-code', title: '独立挑战 · 从边界反例修正',
      body: '独立模式初始只有方法骨架，与引导草稿分开保存。先运行 0、1、8、9、16 和 2147483647：8 错误可能误做四舍五入；9 或 16 错误要查等号；最大 int 错误要查乘法溢出。出现编译错误、运行异常或错误答案时读结构化反馈，修正后提交完整源码。打印 PASS 不会改变判定。',
      relatedIds: ['69-case-zero', '69-case-one', '69-case-eight', '69-case-nine', '69-case-sixteen', '69-case-max-int'],
    },
    {
      id: '69-step-summary', kind: 'summary', title: '复盘 · 解释门槛与溢出',
      body: '用 x=8 说明可行区间与不变量：为什么 mid=2 可保留而 3 不可保留？说明 mid>0 的保护、整数除法条件、提前返回以及 answer 最终为何是下取整结果。参考演示和预测不代表学生代码运行；本站分别记录提示、查看答案、引导通过与独立通过本站测试，不代表 LeetCode 官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '9abcf830ebdd34083caa5406bda85e8c2a8834acf68be058cc93017f0c178b37',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '69-hint-concept', level: 1, body: '要找的是最后一个满足 k²≤x 的整数，不是最接近平方根的整数。0 和 1 可直接返回。' },
    { id: '69-hint-invariant', level: 2, body: '对于 x≥2，从 [1,x/2] 二分。answer 保存已经证实可行的候选；真答案还在未排除的区间或就是 answer。mid 一定大于 0，因而可安全计算 x/mid。' },
    { id: '69-hint-pseudocode', level: 3, body: '若 x<2 返回 x；left=1,right=x/2,answer=1；当 left<=right：mid=left+(right-left)/2；若 mid<=x/mid，answer=mid 且 left=mid+1；否则 right=mid-1；最后返回 answer。' },
  ],
  predictionChecks: [
    {
      id: '69-predict-small', prompt: '演示输入 8：x<2 的提前返回条件成立吗？',
      answer: { kind: 'choice', optionId: 'continue' },
      options: [{ id: 'return', label: '成立，直接返回 x' }, { id: 'continue', label: '不成立，继续二分' }],
      explanation: '8 不小于 2，所以继续设定搜索区间；切换输入后会用对应快照更新答案。', checkpointId: 'small-branch',
    },
    {
      id: '69-predict-first-mid', prompt: '演示输入 8：第一次进入循环，mid 是多少？',
      answer: { kind: 'int', value: 2 },
      explanation: 'left=1、right=8/2=4，mid=1+(4-1)/2 的整数部分=2。切换输入后答案来自当前快照。', checkpointId: 'first-mid',
    },
    {
      id: '69-predict-result', prompt: '演示输入 8：最终返回的整数是多少？',
      answer: { kind: 'int', value: 2 },
      explanation: '2²≤8 而 3²>8，所以返回 2。切换输入后答案来自当前快照。', checkpointId: 'final-root',
    },
  ],
  guided: {
    id: '69-guided', finalCheck: 'real-java-submit',
    stages: [
      {
        id: '69-guided-compare', instruction: '支架 1 / 3：补上避免 int 乘法溢出的比较条件；确认 x=8 与 x=16 的区别。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int mySqrt(int x) {
        if (x < 2) return x;
        int left = 1, right = x / 2, answer = 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (false /* TODO：改为使用 x / mid 的可行性比较 */) {
                answer = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return answer;
    }
}
`,
      },
      {
        id: '69-guided-interval', instruction: '支架 2 / 3：保留方法与提前返回，自己建立候选区间、记录 answer 并完成 while。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int mySqrt(int x) {
        if (x < 2) return x;
        // TODO：在 [1, x/2] 中二分，使用 x/mid 比较并保存最大可行值。
        throw new UnsupportedOperationException("请完成二分搜索");
    }
}
`,
      },
      { id: '69-guided-whole', instruction: '支架 3 / 3：从方法骨架写完整代码，再提交真实 Java 本站测试。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '69-error-round', description: '把平方根四舍五入，而不是取最大可行整数。', counterexampleInputId: '69-case-eight', explanation: '√8 约 2.828，四舍五入是 3，但 3²=9 已超过 8，应返回 2。' },
    { id: '69-error-strict', description: '判断 mid²<x 而遗漏等于 x 的候选。', counterexampleInputId: '69-case-sixteen', explanation: '4²=16 正好满足不超过 x；严格小于会错误地舍弃 4。' },
    { id: '69-error-overflow', description: '直接用 int 的 mid*mid 与大 x 比较。', counterexampleInputId: '69-case-max-int', explanation: 'mid 可能远大于 46340，int 乘法溢出后会产生错误符号/值；让 mid>0 并比较 mid<=x/mid。' },
    { id: '69-error-zero', description: '没有先处理 0，直接用 mid 作除数。', counterexampleInputId: '69-case-zero', explanation: '从 0 起搜索可能令 mid=0 并触发除零，或者错误返回初始 answer=1；先对 x<2 返回 x。' },
  ],
  testSuite: {
    version: PROBLEM_META['69'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '69-wrong-round-nearest', source: WRONG_ROUND_NEAREST_SOURCE, targetedCaseIds: ['69-case-three', '69-case-eight', '69-case-fifteen', '69-case-max-int'] },
      { id: '69-wrong-strict-square', source: WRONG_STRICT_SQUARE_SOURCE, targetedCaseIds: ['69-case-four', '69-case-nine', '69-case-sixteen', '69-case-twenty-five', '69-case-46340-square'] },
    ],
  },
  visualization: { modelId: '69-division-binary-search', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson69;
