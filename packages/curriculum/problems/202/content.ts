import {
  HappyNumberInputSchema,
  PROBLEM_META,
  expectedOutput,
  type HappyNumberInput,
  type Lesson,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_CYCLE_AS_SUCCESS_SOURCE,
  WRONG_ONE_ROUND_SOURCE,
} from './reference.js';

type Lesson202 = Extract<Lesson, { id: '202' }>;
type Case202 = Lesson202['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: HappyNumberInput }[] = [
  { id: '202-demo-happy', title: '多轮到 1：19', input: { n: 19 } },
  { id: '202-demo-cycle', title: '非 1 循环：2', input: { n: 2 } },
  { id: '202-demo-one', title: '起点就是 1：1', input: { n: 1 } },
];

function testCase(id: string, input: HappyNumberInput, coverage: string): Case202 {
  const parsed = HappyNumberInputSchema.parse(input);
  const expected = expectedOutput('202', parsed);
  if (expected.kind !== 'boolean') throw new Error('202 可信期望必须是 boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case202[] = [
  testCase('202-case-one', { n: 1 }, '起点就是 1；while 短路跳过，直接返回 true。'),
  testCase('202-case-nineteen', { n: 19 }, '19→82→68→100→1，需要多轮；能抓到只算一轮的错解。'),
  testCase('202-case-two', { n: 2 }, '2→4→16→37→58→89→145→42→20→4 进入非 1 环；重复状态应返回 false。'),
  testCase('202-case-ten', { n: 10 }, '10→1，只需一次变换，检查 0 位也应参与但不贡献平方和。'),
  testCase('202-case-hundred', { n: 100 }, '含两个零的十进制数，一次变换到 1。'),
  testCase('202-case-seven', { n: 7 }, '多轮快乐数，不是仅有 19 可成功。'),
  testCase('202-case-four', { n: 4 }, '从常见非 1 环内出发，不应把遇到旧状态当成功。'),
  testCase('202-case-sixteen', { n: 16 }, '另一非 1 环入口，检查环检测与终止。'),
  testCase('202-case-twenty', { n: 20 }, '有末尾零且处于非 1 环，区分数字处理与结果判定。'),
  testCase('202-case-sixty-eight', { n: 68 }, '68→100→1，检查个位与十位的平方都被累计。'),
  testCase('202-case-three', { n: 3 }, '初始数字不在常见环内，若进入环仍要返回 false。'),
  testCase('202-case-thirty-seven', { n: 37 }, '从非 1 环内的 37 出发，再次回到 37 时应终止。'),
  testCase('202-case-billion', { n: 1000000000 }, '多位数和大量零；Java int 除法每轮都要推进。'),
  testCase('202-case-max-int', { n: 2147483647 }, '输入上边界，首轮平方和仍在 Java int 范围内。'),
];

export const lesson202 = {
  schemaVersion: 1,
  id: '202',
  slug: 'happy-number',
  title: '快乐数',
  order: 33,
  lessonVersion: PROBLEM_META['202'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: [
    '能用 Java int 的 % 10 取个位，用 /= 10 舍弃个位，并逐位累加平方。',
    '能解释 seen 保存已处理的整轮数字，而不是每一位数字；重复的非 1 状态说明后续会循环。',
    '分清 int 基本值 n、sum 与引用变量 seen；方法收到 n 的值副本，HashSet 是另一个对象。',
    '能用 n=1、19、2 和 int 上界构造反例，再把完整 Java 方法提交到真实 runner。',
  ],
  source: { platform: 'LeetCode', number: 202, url: 'https://leetcode.com/problems/happy-number/' },
  taskSemantics: '从一个正整数 n 出发，每轮把它替换成十进制各位数字的平方和。若某一轮到达 1，返回 true；若在到 1 前重复遇到某个非 1 数字，返回 false。返回的是 boolean，不是变换次数。题面、示例与讲解为本站原创表达。',
  siteLimits: { description: '本站真实判题接受 1 到 2147483647 的 Java int；参考演示每种结构最多 30 项、完整轨迹最多 2000 快照，超过上限会拒绝演示，不截断真实判题。', inputSchemaId: 'HappyNumberInputSchema' },
  steps: [
    {
      id: '202-step-syntax', kind: 'syntax', title: 'Java 前置 · int、取余、整除与 Set',
      body: '方法签名是 public boolean isHappy(int n)。n 和局部变量 sum、digit 都是 int 基本值；调用方法会复制 n 的数值，并不会创建装着 n 的对象。n % 10 取最后一位；对本题非负数，n /= 10 用 Java 整数除法舍去最后一位。乘法 digit * digit 后才能加到 sum。\n\nSet<Integer> seen = new HashSet<>(); 创建集合对象；seen 保存该对象的引用值，泛型写 Integer 而不是 int。seen.contains(n) 查询，seen.add(n) 记录。`&&` 左边为 false 时右边不执行：n 已是 1 时不会调用 contains。初学可先复习 J1/J2/J3/J5。',
      relatedIds: ['J1', 'J2', 'J3', 'J5'],
    },
    {
      id: '202-step-understanding', kind: 'understanding', title: '理解任务 · 整轮数字决定成败',
      body: '手算 19：1²+9²=82；8²+2²=68；6²+8²=100；1²+0²+0²=1，所以返回 true。手算 2：2→4→16→37→58→89→145→42→20→4；4 曾出现过，此后轨迹会重复，返回 false。\n\nseen 要保存的是每轮开始时的完整数字，如 19、82，而不是数字的某个个位。起点 n=1 不需拆位，直接返回 true。',
      relatedIds: ['202-case-nineteen', '202-case-two', '202-case-one'],
    },
    {
      id: '202-step-derivation', kind: 'derivation', title: '推导 · 重复状态给出停止条件',
      body: '只不断计算平方和却不记历史，遇到 2 那样的轨迹会无限循环。循环开始时的不变量是：seen 恰好包含此前已经处理的整轮起点，当前 n 尚未加入。若 n==1，已成功；若 n 在 seen 中，确定进入非 1 循环；否则先把 n 加入，再逐位算出下一轮 n。\n\n本站 n 最多 10 位，首轮平方和不超过 10×9²=810，以后仍落在有限的正整数状态里，所以过程一定到 1 或重复。每轮逐位处理，集合空间随实际遇到的不同状态增长；几次小输入运行不能证明复杂度。',
      relatedIds: ['check-outer', 'record-current', 'read-digit', 'add-square', 'set-next'],
    },
    {
      id: '202-step-prediction', kind: 'prediction', title: '先预测 · 是否进入循环、最终怎样结束',
      body: '切换演示输入后，先预测外层 while 是否进入第一轮，再预测最终到 1 还是遇到非 1 环。答案从当前输入的不可变参考快照生成；n=1 的第一问应选“不进入循环”，第二问仍可选“到 1”。这些静态预测不会执行学生 Java。',
      relatedIds: ['202-predict-enter', '202-predict-result'],
    },
    {
      id: '202-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '看 n 在内层循环中怎样从原数逐次去掉个位、sum 怎样累加；set-next 才把 n 改为本轮平方和。seen 用键→true 表格表示 HashSet 成员，digits-read 只是帮助阅读个位顺序的教学辅助数组，不是 Java 代码创建的数组，也不描述 JVM 内存。变量、结构与高亮语句来自同一不可变快照，前进后退读取对应快照。此轨迹只属于参考解法；学生代码由独立的真实 Java runner 判定。',
      relatedIds: ['202-demo-happy', '202-demo-cycle', '202-demo-one'],
    },
    {
      id: '202-step-guided', kind: 'guided-code', title: '引导编写 · 先拆位，再补环检测',
      body: '第一支架把取个位、平方累加、去个位补齐；第二支架自行组织 seen 与外层循环；第三支架从方法骨架写完整代码。支架内容是练习提示，不通过字符串匹配判正确。最终必须提交完整 Solution.java 给真实 Java runner，通过本站测试才记录引导通过。',
      relatedIds: ['202-guided'],
    },
    {
      id: '202-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例修正',
      body: '独立草稿只给方法骨架，并与引导草稿分别保存。先运行 1、19、2、10、2147483647：19 错误多半是只算一轮；2 错误或超时要检查环终止；10 错误要检查 0 位与十进制拆位；最大 int 测试边界。修正后提交全部本站测试，阅读结构化失败反馈，不依赖打印 PASS。',
      relatedIds: ['202-case-one', '202-case-nineteen', '202-case-two', '202-case-ten', '202-case-max-int'],
    },
    {
      id: '202-step-summary', kind: 'summary', title: '复盘 · 说明两种终止',
      body: '说出 seen 在 while 开始时包含哪些数字，为什么必须先检查再加入，为什么非 1 状态重复可判定失败，以及 n=1 为什么不拆位。把 n 的数值复制与 seen 的引用值、集合对象分开描述。\n\n本站分别记录预测、提示、查看答案、引导通过和独立通过本站测试；参考动画不是学生代码轨迹，也不代表 LeetCode 官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'ddcd9598393743370389547c92d0ecf0c6be24fc2f336c59af329c0f0f87bbfb',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '202-hint-concept', level: 1, body: '每一轮都得到一个新的完整数字。要么到 1，要么某个非 1 数字会再次出现；只用 boolean 判断结束条件。' },
    { id: '202-hint-invariant', level: 2, body: '在外层 while 判断时，seen 只含过去轮次的起点。先判断 n != 1 和是否已见，再加入当前 n。内层用 n%10、n/=10 逐位计算平方和。' },
    { id: '202-hint-pseudocode', level: 3, body: 'seen 置空；当 n != 1 且 seen 不含 n：记录 n，sum=0，循环取 digit=n%10、sum+=digit*digit、n/=10，最后 n=sum；循环后返回 n==1。' },
  ],
  predictionChecks: [
    {
      id: '202-predict-enter',
      prompt: '演示输入 19：第一次判断外层 while 时，会进入循环计算吗？',
      answer: { kind: 'choice', optionId: 'enter' },
      options: [{ id: 'enter', label: '进入循环' }, { id: 'skip', label: '不进入循环' }],
      explanation: '19 不是 1，且刚创建的 seen 为空，所以第一轮会进入。切换输入后的答案由当前快照重新生成。',
      checkpointId: 'first-loop-decision',
    },
    {
      id: '202-predict-result',
      prompt: '演示输入 19：轨迹最终到 1，还是在非 1 数字处形成循环？',
      answer: { kind: 'choice', optionId: 'happy' },
      options: [{ id: 'happy', label: '到 1，返回 true' }, { id: 'cycle', label: '非 1 循环，返回 false' }],
      explanation: '19→82→68→100→1，所以返回 true。切换输入后的答案由当前快照重新生成。',
      checkpointId: 'final-result',
    },
  ],
  guided: {
    id: '202-guided', finalCheck: 'real-java-submit',
    stages: [
      {
        id: '202-guided-digits', instruction: '支架 1 / 3：补齐从末位取数字、累加平方、舍弃末位这三处表达式。', checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isHappy(int n) {
        Set<Integer> seen = new HashSet<>();
        while (n != 1 && !seen.contains(n)) {
            seen.add(n);
            int sum = 0;
            while (n > 0) {
                int digit = /* TODO：取末位 */;
                sum += /* TODO：当前位的平方 */;
                n = /* TODO：舍弃末位 */;
            }
            n = sum;
        }
        return n == 1;
    }
}
`,
      },
      {
        id: '202-guided-loop', instruction: '支架 2 / 3：自行写 seen、两层循环和两个停止条件。', checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean isHappy(int n) {
        // TODO：让 seen 记录已处理的整轮数字；每轮逐位计算平方和。
        throw new UnsupportedOperationException("请完成状态循环");
    }
}
`,
      },
      { id: '202-guided-whole', instruction: '支架 3 / 3：从方法骨架完成全部 Java 代码，再用真实 runner 提交本站测试。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '202-error-one-round', description: '只算一次各位平方和就判断是否等于 1。', counterexampleInputId: '202-case-nineteen', explanation: '19 第一次变为 82，还要继续经 68 和 100 才到 1；必须重复计算。' },
    { id: '202-error-cycle-success', description: '把再次遇到旧数字误判为 true。', counterexampleInputId: '202-case-two', explanation: '2 的轨迹在非 1 数字 4 重复；重复说明失败，只有 n==1 才成功。' },
    { id: '202-error-no-digit-advance', description: '只取 n%10 却没有用 n/=10 推进。', counterexampleInputId: '202-case-ten', explanation: 'n 不变就会永远读取同一个个位；每次取位后都要舍弃它，完成本轮再把 sum 赋给 n。' },
    { id: '202-error-add-first', description: '先加入当前 n，再查询 seen.contains(n)。', counterexampleInputId: '202-case-nineteen', explanation: '这样 19 会在首轮就被误判成重复，始终无法按预期计算；检查必须面对过去轮次。' },
  ],
  testSuite: {
    version: PROBLEM_META['202'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '202-wrong-one-round', source: WRONG_ONE_ROUND_SOURCE, targetedCaseIds: ['202-case-nineteen', '202-case-seven', '202-case-sixty-eight'] },
      { id: '202-wrong-cycle-success', source: WRONG_CYCLE_AS_SUCCESS_SOURCE, targetedCaseIds: ['202-case-two', '202-case-four', '202-case-sixteen'] },
    ],
  },
  visualization: {
    modelId: '202-seen-digit-squares', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson202;
