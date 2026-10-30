import { PowerOfTwoInputSchema, PROBLEM_META, expectedOutput, type Lesson, type PowerOfTwoInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_EVENNESS_SOURCE, WRONG_NO_POSITIVE_GUARD_SOURCE,
} from './reference.js';

type Lesson231 = Extract<Lesson, { id: '231' }>;
type Case231 = Lesson231['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: PowerOfTwoInput }[] = [
  { id: '231-demo-eight', title: '只有一个 1 位：8', input: { n: 8 } },
  { id: '231-demo-six', title: '偶数但有两个 1 位：6', input: { n: 6 } },
  { id: '231-demo-zero', title: '边界：0', input: { n: 0 } },
  { id: '231-demo-min', title: '最小 int：-2147483648', input: { n: -2147483648 } },
  { id: '231-demo-one', title: '2 的零次幂：1', input: { n: 1 } },
];

function testCase(id: string, n: number, coverage: string): Case231 {
  const input = PowerOfTwoInputSchema.parse({ n });
  const expected = expectedOutput('231', input);
  if (expected.kind !== 'boolean') throw new Error('231 可信期望必须是 boolean');
  return { id, input, expected, coverage };
}

const cases: Case231[] = [
  testCase('231-case-min', -2147483648, 'Java int 最小值只有符号位为 1，却是负数；抓未检查正数的错解。'),
  testCase('231-case-negative-power', -16, '负的 2 的整数次幂也不是题目要求的正数。'),
  testCase('231-case-negative-one', -1, '普通负数应在位运算前被排除。'),
  testCase('231-case-zero', 0, '零不能写成 2 的非负整数次幂；抓 n&(n-1)==0 漏守卫。'),
  testCase('231-case-one', 1, '2 的零次幂为 1；抓仅把正偶数视为 2 的幂的错解。'),
  testCase('231-case-two', 2, '最小正偶数幂 10₂；按位与 1 得 0。'),
  testCase('231-case-three', 3, '11₂ 有两个 1；相邻小数应返回 false。'),
  testCase('231-case-four', 4, '100₂ 是 2 的幂；验证按位与在跨位时仍为 0。'),
  testCase('231-case-five', 5, '101₂ 有两个分离的 1，不能只观察末位。'),
  testCase('231-case-six', 6, '110₂ 是正偶数却不是 2 的幂；抓仅检查偶数的错解。'),
  testCase('231-case-eight', 8, '默认演示 1000₂，仅有一个 1。'),
  testCase('231-case-ten', 10, '1010₂ 是正偶数，但有两个 1。'),
  testCase('231-case-before-thousand', 1023, '1023=2^10-1，低十位全为 1。'),
  testCase('231-case-thousand', 1024, '1024=2^10，大于演示小数仍应成功。'),
  testCase('231-case-highest-positive-power', 1073741824, '2^30 是 Java 正 int 中最大的 2 的幂。'),
  testCase('231-case-max', 2147483647, 'Java int 最大值有 31 个 1，不应因接近边界而误判。'),
];

export const lesson231 = {
  schemaVersion: 1, id: '231', slug: 'power-of-two', title: '2 的幂', order: 42,
  lessonVersion: PROBLEM_META['231'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '读懂 boolean 返回值、Java int 的有符号 32 位范围和按位与 &，区分 & 与布尔 &&。',
    '解释正数 n 与 n-1 按位与如何清除最低的 1 位，并证明结果为 0 的判定条件。',
    '在使用位技巧前排除 n<=0，能以 0 与 -2147483648 构造反例。',
    '先预测参考状态，再从方法骨架独立写 Java 并用真实 runner 验证。',
  ],
  source: { platform: 'LeetCode', number: 231, url: 'https://leetcode.com/problems/power-of-two/' },
  taskSemantics: '给定一个处于 Java int 范围内的整数 n，判断它能否写成 2 的非负整数次幂：1=2^0，2=2^1，4=2^2，依此类推。负数和 0 都返回 false；结果是 boolean，不是指数或二进制字符串。本题题面、示例与推导使用本站原创表述。',
  siteLimits: { description: '本站真实判题接受 Java int 全范围 -2147483648 到 2147483647。参考状态演示只表示预置参考算法的几步和 32 位教学视图；输入范围与真实判题一致。', inputSchemaId: 'PowerOfTwoInputSchema' },
  steps: [
    {
      id: '231-step-syntax', kind: 'syntax', title: 'Java 前置 · int、boolean、比较与按位与',
      body: `public boolean isPowerOfTwo(int n) 的参数 n 是 int 基本值，返回类型 boolean 只有 true 或 false。方法调用复制 n 的数值；这里没有数组对象，也不把 int 说成对象引用。Java int 是有符号的 32 位整数，范围 -2147483648…2147483647，最左位是符号位。n <= 0 是比较表达式，得到 boolean；if 的条件必须是 boolean。

按位与 & 对两个 int 的对应二进制位逐一运算，仅双方都为 1 的位置保留 1。不要与布尔 && 混淆；本题也不需要把 n 转成字符串。n-1 在 n>0 时处于 int 范围内，因而可安全用于后续位运算。变量 lowerBits 保存计算出的 int 基本值。`,
      relatedIds: ['J1', 'J2', 'J3', '231-case-min', '231-case-one'],
    },
    {
      id: '231-step-understanding', kind: 'understanding', title: '理解问题 · 正数且只有一个 1 位',
      body: `输入 {"n":8} 时，8 的二进制为 1000₂，等于 2^3，应返回 {"kind":"boolean","value":true}。输入 {"n":6} 时，6=110₂=4+2，有两个 1 位，应返回 false。1=1₂=2^0 也返回 true；0 不是任何 2 的非负整数次幂。

手算 n=8：n-1=7=0111₂，1000₂ & 0111₂=0000₂。手算 n=6：n-1=5=0101₂，0110₂ & 0101₂=0100₂，不等于 0。最小 int 虽然在二进制补码里只有最高位是 1，但它是负数，不能忽略正数条件。`,
      relatedIds: ['231-case-eight', '231-case-six', '231-case-one', '231-case-zero', '231-case-min'],
    },
    {
      id: '231-step-derivation', kind: 'derivation', title: '推导 · 先排除非正数，再清除最低的 1',
      body: `对正整数 n，设最低的 1 右侧有若干个 0。减 1 会把这个 1 变为 0，并把右侧的 0 变为 1；更高位保持原样。因此 n & (n-1) 恰好清掉 n 最低的那个 1，而其他 1 仍留着。结果为 0 当且仅当 n 原来只有一个 1 位，也即 n 是 2 的非负整数次幂。

必须先判断 n<=0：0 与 -1 按位与为 0，若直接套公式会误判；Java 最小 int 与溢出的 n-1 按位与也为 0，但它是负数。参考算法只走常数个 int 操作，时间 O(1)、额外空间 O(1)；本站真实执行的短时间不能证明复杂度。`,
      relatedIds: ['check-positive', 'clear-lowest-one', 'return-result', '231-case-zero', '231-case-min'],
    },
    {
      id: '231-step-prediction', kind: 'prediction', title: '先预测 · 守卫分支与最终返回',
      body: '先在当前输入判断是否会因 n<=0 提前返回，再判断最终返回 true 还是 false。默认 n=8 时第一问是继续位运算，第二问是 true；切换到 n=0 或最小 int，两问分别变为提前返回和 false。答案从所选输入的不可变快照生成，预测正确不等于学生 Java 已运行。',
      relatedIds: ['231-predict-gate', '231-predict-result'],
    },
    {
      id: '231-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表中的 32 位视图只是展示 int 位模式的教学辅助文本，并非 Java 程序创建的数组或字符串，也不表示 JVM 内存布局。守卫失败时 Java 直接返回，不会出现 n-1 或 lowerBits 局部值。前进、后退与代码高亮读取同一不可变快照；学生 Java 源码从独立通道送入真实 runner，不会被参考轨迹解释或冒充调试。',
      relatedIds: demoInputs.map(demo => demo.id),
    },
    {
      id: '231-step-guided', kind: 'guided-code', title: '引导编写 · 先写正数守卫，再完成位判定',
      body: '第一支架补正数守卫，第二支架自己组织守卫与位运算，第三支架从方法骨架完成代码。练习提示不以字符串匹配判定正确；最终必须把完整 Solution.java 提交给受限 Docker 中的真实 Java runner，通过本站测试才记录引导通过。',
      relatedIds: ['231-guided', '231-case-zero', '231-case-eight'],
    },
    {
      id: '231-step-independent', kind: 'independent-code', title: '独立挑战 · 用边界反例修正',
      body: '独立模式只给方法骨架，草稿和引导模式分开保存。运行 0 与最小 int 可查出漏正数守卫；运行 1 可查出把 2 的幂误判成“正偶数”；运行 6 可查出把“偶数”误认为“2 的幂”。先观察真实 Java 运行反馈，再修改源码重跑本站测试；旧源码的成功反馈不应套到新草稿上。',
      relatedIds: ['231-case-zero', '231-case-min', '231-case-one', '231-case-six'],
    },
    {
      id: '231-step-summary', kind: 'summary', title: '复盘 · 完整说出判定前提',
      body: '能否同时说明“n>0”和“n&(n-1)==0”缺一不可？解释 1 为什么成立、0 为什么不成立，以及最小 int 为什么不可只看 1 的个数。n、lowerBits 是基本值变量，不是指向对象的引用。本站分别记录预测、提示、查看答案、引导通过与独立通过本站测试；参考动画不是学生程序运行轨迹，也不代表官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '2b2606e5c417a337283af0381c0d1a8e67582cf37addac33f1e0ea24925cb914', algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '231-hint-concept', level: 1, body: '先看 n 是否为正。对正数，二进制里恰好一个 1 的数才可能是 2 的幂。' },
    { id: '231-hint-invariant', level: 2, body: '正整数减 1 会翻转最低的 1 及它右侧的位；与原数按位与后，最低的 1 被清除。结果为 0 说明原来只有一个 1。' },
    { id: '231-hint-pseudocode', level: 3, body: '若 n<=0，返回 false；否则计算 int lowerBits = n & (n - 1)，返回 lowerBits == 0。分别拿 0、1、6、8 检查。' },
  ],
  predictionChecks: [
    { id: '231-predict-gate', prompt: '默认 n=8，会因 n<=0 直接返回吗？', answer: { kind: 'choice', optionId: 'continue' }, options: [{ id: 'early', label: '提前返回 false' }, { id: 'continue', label: '继续按位计算' }], explanation: '8 是正数，if 条件为 false，继续计算 n & (n-1)。切换输入后由当前快照重新出题。', checkpointId: 'positive-gate' },
    { id: '231-predict-result', prompt: '默认 n=8 最终返回 true 还是 false？', answer: { kind: 'choice', optionId: 'true' }, options: [{ id: 'true', label: 'true：是 2 的幂' }, { id: 'false', label: 'false：不是 2 的幂' }], explanation: '8 & 7=0，8 是正数，所以返回 true。切换输入后由当前快照重新出题。', checkpointId: 'final-result' },
  ],
  guided: { id: '231-guided', finalCheck: 'real-java-submit', stages: [
    { id: '231-guided-guard', instruction: '支架 1 / 3：先补全 n<=0 的提前返回，位运算部分已给出。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isPowerOfTwo(int n) {
        // TODO：若 n 非正，立刻返回 false。
        int lowerBits = n & (n - 1);
        return lowerBits == 0;
    }
}
` },
    { id: '231-guided-bitwise', instruction: '支架 2 / 3：自己写正数守卫、n 与 n-1 的按位与，以及 boolean 返回值。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isPowerOfTwo(int n) {
        // TODO：先排除非正数，再清除最低的 1 位。
        throw new UnsupportedOperationException("请完成位判定");
    }
}
` },
    { id: '231-guided-whole', instruction: '支架 3 / 3：从方法骨架完成全部 Java，再提交真实 runner 的本站测试。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '231-error-no-guard', description: '直接判断 (n & (n - 1)) == 0，漏掉正数前提。', counterexampleInputId: '231-case-zero', explanation: '0 & -1 等于 0，但 0 不是 2 的非负整数次幂；最小 int 也会被这个错法误判。' },
    { id: '231-error-evenness', description: '认为所有正偶数都是 2 的幂。', counterexampleInputId: '231-case-six', explanation: '6=110₂ 含两个 1，虽然是偶数，按位与 5 得 4，不是 0。' },
    { id: '231-error-one', description: '把 n==1 当作例外错误地返回 false。', counterexampleInputId: '231-case-one', explanation: '1=2^0，是题目允许的幂，1 & 0=0。' },
    { id: '231-error-negative-bit', description: '只数二进制 1 位个数，忽略最高符号位与正数限制。', counterexampleInputId: '231-case-min', explanation: 'Java 最小 int 的补码只有最高位为 1，但其值是负数；守卫必须先于按位判定。' },
  ],
  testSuite: { version: PROBLEM_META['231'].testSuiteVersion, cases, wrongFixtures: [
    { id: '231-wrong-no-positive-guard', source: WRONG_NO_POSITIVE_GUARD_SOURCE, targetedCaseIds: ['231-case-zero', '231-case-min'] },
    { id: '231-wrong-evenness', source: WRONG_EVENNESS_SOURCE, targetedCaseIds: ['231-case-one', '231-case-six', '231-case-ten'] },
  ] },
  visualization: { modelId: '231-signed-int-bit-pattern', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson231;

export { WRONG_EVENNESS_SOURCE, WRONG_NO_POSITIVE_GUARD_SOURCE } from './reference.js';
