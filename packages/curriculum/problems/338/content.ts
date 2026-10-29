import { CountingBitsInputSchema, PROBLEM_META, expectedOutput, type CountingBitsInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_PARITY_ONLY_SOURCE, WRONG_PREVIOUS_PLUS_PARITY_SOURCE } from './reference.js';

type Lesson338 = Extract<Lesson, { id: '338' }>;
type Case338 = Lesson338['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: CountingBitsInput }[] = [
  { id: 'demo-five', title: '递推到 5：n=5', input: { n: 5 } },
  { id: 'demo-seven', title: '多个 1：n=7', input: { n: 7 } },
  { id: 'demo-zero', title: '只含 0：n=0', input: { n: 0 } },
  { id: 'demo-thirteen', title: '跨过 8：n=13', input: { n: 13 } },
];

function testCase(id: string, n: number, coverage: string): Case338 {
  const input = CountingBitsInputSchema.parse({ n });
  const expected = expectedOutput('338', input);
  if (expected.kind !== 'int-array') throw new Error('338 expected output must be int-array');
  return { id, input, expected, coverage };
}

const cases: Case338[] = [
  testCase('case-zero', 0, '最小输入：for 循环完全不执行，仍需返回只含 0 的长度一数组。'),
  testCase('case-one', 1, '首次递推 1>>1=0，末位为 1，不能遗漏下标 1。'),
  testCase('case-two', 2, '偶数 2 的末位为 0，结果仍继承 bits[1]。'),
  testCase('case-three', 3, '3 的两个低位均为 1，抓住只返回 i&1 的错误。'),
  testCase('case-four', 4, '跨越 2 的幂，4 只有一个 1，抓住沿用 bits[i-1] 的错误。'),
  testCase('case-five', 5, '默认演示：同时覆盖偶数、奇数和 4→5 的递推。'),
  testCase('case-seven', 7, '7 的二进制 111 含三个 1，不能把 1 的个数当作是否为奇数。'),
  testCase('case-eight', 8, '8 的二进制 1000 重新只有一个 1，验证每个 2 的幂边界。'),
  testCase('case-thirteen', 13, '13 的二进制 1101 含三个 1，需复用 bits[6]=2。'),
  testCase('case-demo-upper', 29, '参考演示 30 项上限；真实执行应得到长度 30 的结果。'),
  testCase('case-run-only', 30, '第 31 项超出演示展示限制，但仍必须通过真实 Java 判题。'),
  testCase('case-medium', 127, '连续七个 1，检查多轮依赖和末项计数 7。'),
  testCase('case-site-upper', 9999, '本站真实判题上限；输出恰有 10000 项，不应被演示的 30 项上限截断。'),
];

export const lesson338 = {
  schemaVersion: 1, id: '338', slug: 'counting-bits', title: '比特位计数', order: 40,
  lessonVersion: PROBLEM_META['338'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分 int 基本值、int[] 数组对象和数组引用值，正确创建长度 n+1 的结果数组。',
    '用二进制末位与右移推导 bits[i]=bits[i>>1]+(i&1)，证明被引用的旧状态已算好。',
    '读懂参考快照中 Java 数组默认零与已推导状态的差别，先预测再揭示中间值。',
    '从方法骨架独立写出完整 Java，并根据真实编译与本站测试反馈修正。',
  ],
  source: { platform: 'LeetCode', number: 338, url: 'https://leetcode.com/problems/counting-bits/' },
  taskSemantics: '给定非负整数 n，返回长度为 n+1 的整数数组，数组下标 i（0≤i≤n）处填写 i 的二进制表示中 1 的个数。结果必须包含 0 对应的首项；不是只返回 n 自身的计数。本题题面、示例、推导和代码为本站原创表达。',
  siteLimits: { description: '本站真实判题接受 n=0—9999，结果长度为 n+1。参考状态演示最多显示 30 项，即 n≤29；n=30—9999 仍可真实运行和判题。', inputSchemaId: 'CountingBitsInputSchema' },
  steps: [
    {
      id: '338-step-syntax', kind: 'syntax', title: 'Java 前置 · 方法、数组、移位与按位与',
      body: `public int[] countBits(int n) 中，参数 n 是 int 基本值，返回类型 int[] 表示整数数组；学生只写 Solution 类，不写 main。int[] bits = new int[n + 1] 创建一个数组对象，bits 变量保存该对象的引用值。Java 调用方法按值复制参数；这不意味着把数组对象整体复制。新建 int 数组的元素默认是 0，但尚未计算的零不能充当“已证明答案”。bits.length 是 n+1，合法下标为 0…n。

for (int i=1; i<=n; i++) 从 1 开始：0 的结果已由默认零给出，<= 才会算到 n。对本题非负整数，i >> 1 相当于去掉二进制最低位；i & 1 只取最低位（0 或 1）。这里 & 是按位与，不能写成布尔 &&。Java int 有符号且固定 32 位，本站 n 非负；不要把右移说成适用于任意负数的数学除法。数组下标必须是 int 且在范围内。`,
      relatedIds: ['J1', 'J2', 'J3', 'case-zero'],
    },
    {
      id: '338-step-understanding', kind: 'understanding', title: '读题与手算 · 0 到 5 的每个答案',
      body: `本站输入 {"n":5} 把整数 5 传给方法，结构化输出应为 {"kind":"int-array","values":[0,1,1,2,1,2]}。逐项手算：0 的二进制 0 含 0 个 1；1=1 含 1 个；2=10 含 1 个；3=11 含 2 个；4=100 含 1 个；5=101 含 2 个。数组必须依次保留所有 i 的答案，所以长度是 6，不是 5。n=0 时返回 [0]，不是空数组。`,
      relatedIds: ['case-five', 'case-zero'],
    },
    {
      id: '338-step-derivation', kind: 'derivation', title: '推导 · 删去末位，再加上末位',
      body: `直接对每个 i 独立数位可以得到答案。要复用已算结果，观察任何非负 i 的二进制：右移一位 i>>1 恰好删去最低位；被删的位是 i&1。所以 1 的个数满足 bits[i]=bits[i>>1]+(i&1)。例如 13=1101，13>>1=6=110，末位为 1；bits[13]=bits[6]+1=2+1=3。

循环不变量：开始处理 i 时，bits[0…i) 都已经计算正确。因为 i≥1 且 i>>1<i，右侧引用的 bits[i>>1] 必然已知；赋值后正确范围扩到 bits[0…i]。i=n+1 时整段结束。算法对每个 i 做常数次操作，时间 O(n)，返回数组占 O(n)；除必须返回的数组外只用 O(1) 额外变量。运行计时不能证明复杂度。演示中的“已推导表”是教学标记，Java 实际只创建 bits 数组。`,
      relatedIds: ['allocate-bits', 'check-index', 'assign-count', 'return-bits'],
    },
    {
      id: '338-step-prediction', kind: 'prediction', title: '先预测 · 中途与终点',
      body: '先对当前演示输入预测约中间位置的 bits[i]，再预测最终 bits[n]；默认 n=5 时分别是 bits[2]=1 与 bits[5]=2。改为 n=7 后分别是 bits[3]=2 与 bits[7]=3。n=0 也有两次检查：初建数组首项与返回首项都为 0。回答来自当前输入的状态快照，预测正确不等于学生 Java 已编译执行。',
      relatedIds: ['338-predict-middle', '338-predict-final'],
    },
    {
      id: '338-step-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。变量、结果数组、已推导表、下标、解释与代码高亮读取同一不可变快照；上一步可恢复赋值前的数组。实际 bits 数组的未来元素因 Java 默认值显示为 0，旁边已推导表将其标为未计算，不能把两者混同。输入切换会重新生成并校验轨迹；学生源码不会改变参考快照，学生真实 Java 运行结果由另一通道反馈。',
      relatedIds: demoInputs.map(demo => demo.id),
    },
    {
      id: '338-step-guided', kind: 'guided-code', title: '引导编写 · 从末位公式到整段方法',
      body: '先补出 bits[i] 的递推赋值，再补循环边界与返回，最后从方法骨架写完整 Java。支架中的文字自查不按源码字符串是否与参考答案相同判通过。只有完整 Solution.java 提交真实受限 Java runner，通过本站测试后才记录引导通过。',
      relatedIds: ['338-guided'],
    },
    {
      id: '338-step-independent', kind: 'independent-code', title: '独立编写 · 用反例定位错误',
      body: '独立模式提供未完成方法骨架，草稿与引导练习分别保存。用 n=3 检查只看最低位的写法，用 n=4 检查误把前一项累加的写法，用 n=0 检查数组长度与循环边界。编辑后先运行一个用例观察真实结果，再提交全套本站测试；失败可根据结构化实际输出和期望逐项定位，不根据打印 PASS 判断。',
      relatedIds: ['case-three', 'case-four', 'case-zero'],
    },
    {
      id: '338-step-summary', kind: 'summary', title: '复盘 · 解释答案数组和递推依赖',
      body: '说清为什么 4 的计数从 2 回到 1、为什么 i>>1 总在已计算区间，以及返回数组长度必须为 n+1。区分 int 基本值 i、保存引用值的 bits 变量、数组对象及其中元素。本站分别保存预测、提示、查看答案、引导通过和独立通过本站测试；播放参考动画不代表掌握，通过本站测试不等于官方评测通过。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' }, independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '6e8f53b7910a84dfceeb4e4a1f94fb1de5edd85218ee10c82610f3eea8f74db3', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '338-hint-concept', level: 1, body: '先想 13=1101：去掉最后一个二进制位后是 110，剩下的 1 已经可以从更小下标的答案取得。' },
    { id: '338-hint-invariant', level: 2, body: '处理 i 前，0…i-1 的结果已经正确；i>>1<i。最低位可用 i&1 得到，于是当前结果等于旧结果加最低位。' },
    { id: '338-hint-pseudocode', level: 3, body: '创建 int[n+1]；从 i=1 到 i<=n，令 bits[i]=bits[i>>1]+(i&1)；返回 bits。n=0 时循环不执行，数组里仍有首项 0。' },
  ],
  predictionChecks: [
    { id: '338-predict-middle', prompt: '默认 n=5 时，先预测 bits[2] 是多少？', answer: { kind: 'int', value: 1 }, explanation: '2=10，只有一个 1；bits[2]=bits[1]+0=1。', checkpointId: 'middle-count' },
    { id: '338-predict-final', prompt: '默认 n=5 时，最终 bits[5] 是多少？', answer: { kind: 'int', value: 2 }, explanation: '5=101，bits[5]=bits[2]+1=2。', checkpointId: 'final-count' },
  ],
  guided: {
    id: '338-guided', finalCheck: 'real-java-submit', stages: [
      {
        id: '338-guided-formula', instruction: '支架 1 / 3：补出根据更小下标与末位计算 bits[i] 的一行。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            // TODO：把 bits[i >> 1] 与 i 的最低位相加，存到 bits[i]。
        }
        return bits;
    }
}
`,
      },
      {
        id: '338-guided-loop', instruction: '支架 2 / 3：自己写完整循环边界和递推公式，记得返回整个数组。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        // TODO：从 1 到 n 逐项填写 bits。
        return bits;
    }
}
`,
      },
      { id: '338-guided-whole', instruction: '支架 3 / 3：从骨架完成方法，再将完整 Java 提交真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '338-error-parity', description: '只返回当前数最低位 i&1，遗漏其余二进制位。', counterexampleInputId: 'case-three', explanation: '3=11，最低位是 1，但两个数位都为 1，因此 bits[3]=2。' },
    { id: '338-error-previous', description: '误用 bits[i-1]+(i&1) 累加邻项。', counterexampleInputId: 'case-four', explanation: '4=100 只含一个 1；从 3=11 的计数 2 累加会得到错误结果 2。' },
    { id: '338-error-length', description: '创建 int[n] 或从 0 开始错误访问前项。', counterexampleInputId: 'case-zero', explanation: 'n=0 的合法结果仍是 [0]；数组必须有 n+1 项，循环从 1 开始。' },
  ],
  testSuite: {
    version: PROBLEM_META['338'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '338-wrong-parity', source: WRONG_PARITY_ONLY_SOURCE, targetedCaseIds: ['case-three', 'case-seven', 'case-thirteen'] },
      { id: '338-wrong-previous', source: WRONG_PREVIOUS_PLUS_PARITY_SOURCE, targetedCaseIds: ['case-four', 'case-eight', 'case-site-upper'] },
    ],
  },
  visualization: { modelId: '338-bit-counts', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson338;

export { WRONG_PARITY_ONLY_SOURCE, WRONG_PREVIOUS_PLUS_PARITY_SOURCE } from './reference.js';
