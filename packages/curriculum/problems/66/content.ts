import { PlusOneInputSchema, PROBLEM_META, expectedOutput, type Lesson, type PlusOneInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_LAST_DIGIT_SOURCE, WRONG_NO_GROWTH_SOURCE } from './reference.js';

type Lesson66 = Extract<Lesson, { id: '66' }>;
type Case66 = Lesson66['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: PlusOneInput }[] = [
  { id: '66-demo-carry', title: '末位进位：[1,2,9]', input: { digits: [1, 2, 9] } },
  { id: '66-demo-all-nine', title: '全部进位：[9,9]', input: { digits: [9, 9] } },
  { id: '66-demo-zero', title: '单个零：[0]', input: { digits: [0] } },
  { id: '66-demo-no-carry', title: '无需进位：[3,4,2]', input: { digits: [3, 4, 2] } },
];

function testCase(id: string, digits: number[], coverage: string): Case66 {
  const input = PlusOneInputSchema.parse({ digits });
  const expected = expectedOutput('66', input);
  if (expected.kind !== 'int-array') throw new Error('66 可信输出必须是 int-array');
  return { id, input, expected, coverage };
}

const cases: Case66[] = [
  testCase('66-case-zero', [0], '最小合法输入 0；应成为 [1]，不能把零当成空数组。'),
  testCase('66-case-one', [1], '单个普通数字无需进位；仍返回一位数组 [2]。'),
  testCase('66-case-eight', [8], '末位小于 9 时直接加一，避免错误地提前扩容。'),
  testCase('66-case-nine', [9], '单个 9 的进位必须扩容为 [1,0]，不能返回 [0]。'),
  testCase('66-case-simple', [1, 2, 3], '多位无进位，只修改最低位，不影响高位。'),
  testCase('66-case-before-nine', [1, 2, 8], '末位 8 加一成为 9，不能错误地把 9 当成本轮必进位。'),
  testCase('66-case-tail-nine', [1, 2, 9], '末位 9 清零，向左一位加一；检验传递一次进位。'),
  testCase('66-case-two-nines', [1, 9, 9], '连续两个 9 清零，进位越过两个低位。'),
  testCase('66-case-all-nine-two', [9, 9], '全部为 9 时必须新建更长数组 [1,0,0]。'),
  testCase('66-case-all-nine-three', [9, 9, 9], '更多连续 9 扩位，验证全部清零和新首位 1。'),
  testCase('66-case-middle-zero', [2, 0, 0], '低位零直接变一，高位及中间零保持原样。'),
  testCase('66-case-separated-nine', [9, 0, 9], '高位已有 9 不代表整体扩位；进位应停在中间的 0。'),
  testCase('66-case-display-edge', [...Array(29).fill(1), 9], '恰好 30 项可以演示，且只在末两位之间进位。'),
  testCase('66-case-run-only', [...Array(30).fill(1), 9], '31 项超出演示上限，但真实 Java 判题仍应接受。'),
  testCase('66-case-site-upper', Array(100).fill(9), '本站 100 位输入上限；全 9 进位得到 101 位结果。'),
];

export const lesson66 = {
  schemaVersion: 1, id: '66', slug: 'plus-one', title: '加一', order: 48,
  lessonVersion: PROBLEM_META['66'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '从 C 的数组循环过渡到 Java 的 int[]、length、倒序 for 和 int[] 返回值。',
    '把逐位加一理解为从最低位向左传播进位，说明何时可以立即返回。',
    '区分原 digits 数组对象与全 9 时新建的 grown 数组对象，以及变量保存的引用值。',
    '利用结构化真实运行反馈定位遗漏进位、遗漏扩位和越界等错误。',
  ],
  source: { platform: 'LeetCode', number: 66, url: 'https://leetcode.com/problems/plus-one/' },
  taskSemantics: '给定从高位到低位排列的十进制数字数组 digits，它表示一个非负整数；把这个数加一，以同样顺序返回数字数组。除单个 [0] 外没有前导零。结果可以比输入多一位。本站题面、示例、推导与代码为原创表达。',
  siteLimits: { description: '本站真实判题接受 1—100 位，每位 0—9，多位数字不得以 0 开头。参考状态演示最多 30 位；超出演示上限的合法输入仍可真实运行。', inputSchemaId: 'PlusOneInputSchema' },
  steps: [
    { id: '66-step-syntax', kind: 'syntax', title: 'Java 前置 · 数组、长度和返回数组',
      body: `public int[] plusOne(int[] digits) 接收一个 int[] 数组对象的引用值，返回一个 int[] 引用值。学生写 Solution 类和该方法，不写 main。与 C 中数组循环相似，Java 用 digits.length 取得元素个数，合法下标是 0 到 digits.length-1；最后一位在最右端。for (int i=digits.length-1; i>=0; i--) 每轮向左移动，i 是 int 基本值，digits 是保存数组引用值的变量。\n\nJava 参数一律按值传递：传入 digits 时复制的是引用值，不复制整个数组。digits[i]=0 会改动该数组对象；若只写 digits = new int[...]，改变的只是本方法的变量绑定，调用方原来持有的数组仍是原对象。参考解法在全 9 时新建 grown 并返回；返回值决定调用方拿到哪个数组。`,
      relatedIds: ['J1', 'J2', 'J3', '66-case-nine'] },
    { id: '66-step-understanding', kind: 'understanding', title: '读题与手算 · 129 如何变成 130',
      body: `输入 {"digits":[1,2,9]} 表示整数 129，不是三个独立答案。加一后是 130，所以结构化返回 {"kind":"int-array","values":[1,3,0]}。先看最右端 9：9+1 使该位变 0，并把进位传给左边 2；2+1 得 3，进位结束，最左端 1 不变。输入 [9,9] 表示 99，结果 100，需要 [1,0,0] 三位。单个 [0] 结果为 [1]。`,
      relatedIds: ['66-case-tail-nine', '66-case-all-nine-two', '66-case-zero'] },
    { id: '66-step-derivation', kind: 'derivation', title: '推导 · 进位只沿连续的 9 传播',
      body: `一种直观办法是先把整个数字转换成 Java int 再加一，但 100 位远超 int 范围，而且题目要求返回数字数组。逐位处理更直接：从右往左，若当前位小于 9，加一后进位结束，可立刻返回同一个数组；若当前位是 9，把它改为 0，继续向左。若所有位都是 9，则原数组已全部清零，另建长度加一的数组，在首项写 1，其余项由 Java 默认初始化为 0。\n\n循环入口不变量：当前下标 i 右侧原本是一段连续的 9；它们已被改为 0，表示仍有一个进位待处理；i 左侧及当前位置仍保持输入值。遇到非 9 后加一并返回，结果正确；越过最高位仍有进位，则新建 [1,0,…,0]。最多扫描 n 位，时间 O(n)；通常只用 O(1) 额外空间，全 9 时新结果额外占 O(n)。这里的复杂度来自操作推导，不能用少量运行计时证明。`,
      relatedIds: ['check-digit', 'check-nine', 'increment-digit', 'reset-nine', 'allocate-grown', 'set-leading'] },
    { id: '66-step-predict', kind: 'prediction', title: '先预测 · 末位变化与最终长度',
      body: '先在当前演示输入中预测处理最右位后的数值，再预测返回数组的长度。默认 [1,2,9] 的答案依次为 0 和 3；换成 [9,9]，第二个答案变为 3。两次预测都从当前输入的参考状态快照读取，不是学生 Java 的编译执行结果。',
      relatedIds: ['66-predict-first', '66-predict-length'] },
    { id: '66-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、数组、当前下标、代码高亮和解释共用同一份不可变快照；前进、后退可看清 digits 中某个 9 何时变 0。全 9 输入会保留 digits 数组对象，并单独显示新建的 grown 数组及其引用绑定；对象不因变量重新绑定而自动消失。学生编辑的 Java 源码不会改写这里的参考轨迹，真实结果由受限 Docker runner 另行反馈。',
      relatedIds: demoInputs.map(item => item.id) },
    { id: '66-step-guided', kind: 'guided-code', title: '引导编写 · 从一位进位到完整方法',
      body: '支架先练习在小于 9 时加一并返回，再处理连续 9，最后从骨架完成全 9 扩位。静态自查只帮助思考，不按填入文本是否与参考答案一样判通过。最后必须把完整 Solution.java 交给真实 Java runner，通过本站用例才记录引导通过。',
      relatedIds: ['66-guided'] },
    { id: '66-step-independent', kind: 'independent-code', title: '独立挑战 · 处理全 9 和中间零',
      body: '独立模式只给未完成的方法骨架，和引导草稿分开保存。先用 [1,2,9] 检查向左进位，用 [9,9] 检查扩位，再用 [9,0,9] 确认高位已有 9 不一定扩位。若真实运行报错或返回错误，查看结构化输入、期望与实际结果后修改并重新提交；打印 PASS 不会让答案通过。',
      relatedIds: ['66-case-tail-nine', '66-case-all-nine-two', '66-case-separated-nine'] },
    { id: '66-step-summary', kind: 'summary', title: '复盘 · 数组对象与返回值',
      body: '解释为何只需从右扫描，何时立即返回，何时必须新建更长数组。区分 int 基本值、digits/grown 变量持有的引用值与两个数组对象；全 9 时原数组变成零，但返回的是 grown。预测、提示、查看答案、引导通过与独立通过本站测试分别记录。本站判题不等于原平台官方评测。',
      relatedIds: ['J3', 'J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'd3272ae3b12417d96005eae13133691a038ebe98d967d83ac0dccc26546ec6f8', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '66-hint-concept', level: 1, body: '像手算十进制加法一样，从最低位起处理；想想哪一种数字会让进位继续向左。' },
    { id: '66-hint-invariant', level: 2, body: '扫描到 i 前，右边原来连续的 9 都已改为 0，进位仍待处理。遇到小于 9 的位，只需给它加一并停止。' },
    { id: '66-hint-pseudocode', level: 3, body: '从 i=digits.length-1 递减到 0：若 digits[i]<9，则 digits[i]++ 并返回 digits；否则把 digits[i] 设为 0。循环走完后创建长度为 digits.length+1 的新数组，首项设 1 并返回。' },
  ],
  predictionChecks: [
    { id: '66-predict-first', prompt: '输入 [1,2,9] 时，处理最右位后，该位变成多少？', answer: { kind: 'int', value: 0 }, explanation: '末位 9 加一向左进位，当前位写 0；切换输入后从当前快照读取。', checkpointId: 'first-digit' },
    { id: '66-predict-length', prompt: '输入 [1,2,9] 时，最终返回数组有多少项？', answer: { kind: 'int', value: 3 }, explanation: '向左一位就停止，仍有三位；全 9 输入才需要增加一位。', checkpointId: 'result-length' },
  ],
  guided: {
    id: '66-guided', finalCheck: 'real-java-submit', stages: [
      { id: '66-guided-one', instruction: '支架 1 / 3：补出当前位不为 9 时的动作，以及遇到 9 后的处理。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                // TODO：该位加一并返回结果。
            }
            // TODO：该位是 9，清零并继续向左。
        }
        int[] grown = new int[digits.length + 1];
        grown[0] = 1;
        return grown;
    }
}
` },
      { id: '66-guided-carry', instruction: '支架 2 / 3：自己写完整的倒序循环和全 9 扩位，保留方法签名。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public int[] plusOne(int[] digits) {
        // TODO：从最低位向左传播进位。
        // TODO：若循环走完，构造并返回多一位的新数组。
        throw new UnsupportedOperationException("请完成逐位加一");
    }
}
` },
      { id: '66-guided-whole', instruction: '支架 3 / 3：只从方法骨架完成整题，再把完整 Java 交给真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '66-error-last-only', description: '只对最低位加一并取模，不向左传递进位。', counterexampleInputId: '66-case-tail-nine', explanation: '[1,2,9] 会错误得到 [1,2,0]；正确结果 [1,3,0] 必须修改前一位。' },
    { id: '66-error-no-growth', description: '所有位都是 9 时直接返回已清零的原数组。', counterexampleInputId: '66-case-all-nine-two', explanation: '[9,9]+1=100，需要三个数字；返回 [0,0] 会丢失最高位。' },
    { id: '66-error-left-to-right', description: '从最高位开始加一，忽略十进制进位只从低位传来。', counterexampleInputId: '66-case-simple', explanation: '[1,2,3] 应成为 [1,2,4]，不能先把首项 1 改成 2。' },
    { id: '66-error-array-binding', description: '扩位时仅令参数变量指向新数组，却返回旧数组。', counterexampleInputId: '66-case-nine', explanation: '赋值变量不会自动更改待返回对象；必须明确返回结果数组 grown。' },
  ],
  testSuite: {
    version: PROBLEM_META['66'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '66-wrong-last-only', source: WRONG_LAST_DIGIT_SOURCE, targetedCaseIds: ['66-case-tail-nine', '66-case-two-nines', '66-case-nine'] },
      { id: '66-wrong-no-growth', source: WRONG_NO_GROWTH_SOURCE, targetedCaseIds: ['66-case-nine', '66-case-all-nine-two', '66-case-site-upper'] },
    ],
  },
  visualization: { modelId: '66-decimal-carry', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson66;

export { WRONG_LAST_DIGIT_SOURCE, WRONG_NO_GROWTH_SOURCE } from './reference.js';
