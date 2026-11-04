import {
  PROBLEM_META,
  RomanToIntegerInputSchema,
  expectedOutput,
  type Lesson,
  type RomanToIntegerInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_ALWAYS_ADD_SOURCE,
  WRONG_ONLY_I_SUBTRACTS_SOURCE,
} from './reference.js';

type Lesson13 = Extract<Lesson, { id: '13' }>;
type Case13 = Lesson13['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RomanToIntegerInput }[] = [
  { id: 'mixed-subtractions', title: '多处减法组合：MCMXCIV', input: { s: 'MCMXCIV' } },
  { id: 'all-additions', title: '全部直接相加：LVIII', input: { s: 'LVIII' } },
  { id: 'short-subtraction', title: '最短减法组合：IV', input: { s: 'IV' } },
];

function testCase(id: string, raw: RomanToIntegerInput, coverage: string): Case13 {
  const input = RomanToIntegerInputSchema.parse(raw);
  const expected = expectedOutput('13', input);
  if (expected.kind !== 'int') throw new Error('13 expected output must be int');
  return { id, input, expected, coverage };
}

const cases: Case13[] = [
  testCase('single-one', { s: 'I' }, '最短输入和最小值 1；末位必须直接相加。'),
  testCase('repeated-ones', { s: 'III' }, '相同符号连续出现；三次都直接相加。'),
  testCase('subtract-four', { s: 'IV' }, 'I 位于 V 前应减去 1，覆盖最短减法组合。'),
  testCase('subtract-nine', { s: 'IX' }, 'I 位于 X 前应减去 1，防止只特判 IV。'),
  testCase('all-additions', { s: 'LVIII' }, '50+5+1+1+1；覆盖无减法的混合符号。'),
  testCase('mixed-subtractions', { s: 'MCMXCIV' }, '1994；在同一输入中覆盖 CM、XC、IV 三类减法。'),
  testCase('subtract-forty', { s: 'XL' }, 'X 位于 L 前应减去 10，击败只处理 I 的错误。'),
  testCase('subtract-ninety', { s: 'XC' }, 'X 位于 C 前应减去 10。'),
  testCase('subtract-four-hundred', { s: 'CD' }, 'C 位于 D 前应减去 100。'),
  testCase('subtract-nine-hundred', { s: 'CM' }, 'C 位于 M 前应减去 100。'),
  testCase('modern-year', { s: 'MMXXVI' }, '2026；较长输入但全部使用直接相加。'),
  testCase('mixed-2444', { s: 'MMCDXLIV' }, '2444；同时覆盖千位相加和 CD、XL、IV。'),
  testCase('many-repetitions', { s: 'DCCCLXXXVIII' }, '888；规范允许的多组重复，所有符号都直接相加。'),
  testCase('maximum', { s: 'MMMCMXCIX' }, '本站最大值 3999，覆盖长度边界附近及 CM、XC、IX。'),
];

const guidedValueOf = `class Solution {
    public int romanToInt(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int current = valueOf(s.charAt(i));
            if (i + 1 < s.length() && current < valueOf(s.charAt(i + 1))) total -= current;
            else total += current;
        }
        return total;
    }

    private int valueOf(char symbol) {
        // TODO：用 switch 表达式返回 I、V、X、L、C、D、M 的数值。
        throw new UnsupportedOperationException("请完成符号换值");
    }
}
`;

const guidedDecision = `class Solution {
    public int romanToInt(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int current = valueOf(s.charAt(i));
            // TODO：若右侧紧邻符号更大则减 current，否则加 current；先检查右侧下标存在。
        }
        return total;
    }

    private int valueOf(char symbol) {
        return switch (symbol) {
            case 'I' -> 1; case 'V' -> 5; case 'X' -> 10; case 'L' -> 50;
            case 'C' -> 100; case 'D' -> 500; case 'M' -> 1000;
            default -> throw new IllegalArgumentException("invalid Roman symbol");
        };
    }
}
`;

export const lesson13 = {
  schemaVersion: 1,
  id: '13',
  slug: 'roman-to-integer',
  title: '罗马数字转整数',
  order: 56,
  lessonVersion: PROBLEM_META['13'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J8'],
  objectives: [
    '使用 String.length()、charAt(i)、for 循环、switch 表达式和 int 返回值完成字符串扫描。',
    '从罗马数字的局部加减规则推导左到右算法，并说明为何只需查看右侧紧邻符号。',
    '在参考状态中预测加减决策与累计和，再把完整 Java 交给真实 runner 验证。',
  ],
  source: { platform: 'LeetCode', number: 13, url: 'https://leetcode.com/problems/roman-to-integer/' },
  taskSemantics: '输入一个表示 1—3999 的规范罗马数字字符串 s。I、V、X、L、C、D、M 分别表示 1、5、10、50、100、500、1000；通常从左到右相加，但较小符号紧挨在较大符号左侧时，这个较小值应当减去。返回 s 表示的整数。题意参考 LeetCode 13；本站题面、示例、推导和代码均为原创表达，与原平台无官方合作。',
  siteLimits: { description: '本站真实判题只接收长度 1—15、表示 1—3999 的规范大写罗马数字；不要求学生处理空串、小写、非规范写法或非法符号。参考演示使用同一输入范围，最多 2000 个快照。', inputSchemaId: 'RomanToIntegerInputSchema' },
  steps: [
    {
      id: '13-syntax', kind: 'syntax', title: 'Java 必要语法 · String、charAt、循环与返回值',
      body: '方法签名是 public int romanToInt(String s)。String 是引用类型，调用方法时传入的引用值按值复制；算法只读取字符串对象。s.length() 调用方法取得字符数量，s.charAt(i) 取得下标 i 的 char 基本值，不能写成 s[i]。for (int i=0; i<s.length(); i++) 逐位前进；return total 返回 int 基本值并结束方法。本站输入短且结果不超过 3999，不会发生 int 溢出。',
      relatedIds: ['J1', 'J2', 'J4'],
    },
    {
      id: '13-symbol-values', kind: 'syntax', title: 'Java 必要语法 · 用 switch 把符号换成数值',
      body: "辅助方法 valueOf(char symbol) 可以使用 switch 表达式：case 'I' -> 1，依次覆盖七个符号。单引号表示 char，双引号表示 String。valueOf 只把一个符号换成 int，不负责决定加还是减；这种分工让主循环只讨论算法规则。契约已保证输入合法，default 仍抛异常以防未来误用。",
      relatedIds: ['J1', 'J8'],
    },
    {
      id: '13-understanding', kind: 'understanding', title: '理解题意 · 大多数相加，六种组合包含减法',
      body: 'III 是 1+1+1=3，LVIII 是 50+5+1+1+1=58。规范输入中的减法组合是 IV、IX、XL、XC、CD、CM：例如 IV 不能算成 1+5，而是 -1+5=4。输出是一个整数，不需要改动 s，也不需要打印或编写 main。只处理规范输入很关键：算法无须猜测 IIV 等非规范写法的含义。',
      relatedIds: ['repeated-ones', 'all-additions', 'subtract-four'],
    },
    {
      id: '13-manual', kind: 'understanding', title: '手工模拟 · MCMXCIV',
      body: '从左到右看 M C M X C I V：M 的右边 C 更小，加 1000，total=1000；C 的右边 M 更大，减 100，total=900；M 加 1000 得 1900；X 在 C 前减 10 得 1890；C 加 100 得 1990；I 在 V 前减 1 得 1989；末位 V 没有右邻，直接加 5，最终 1994。每个符号恰好处理一次。',
      relatedIds: ['mixed-subtractions'],
    },
    {
      id: '13-derivation', kind: 'derivation', title: '推导 · 为什么比较当前值与右侧紧邻值',
      body: '处理下标 i 前，不变量是 total 已等于前 i 个符号按照局部规则产生的贡献之和。规范罗马数字保证：当前值小于下一值时，当前符号正是减法组合的左半，应贡献 -current；否则贡献 +current。末位没有下一符号，必然相加。更新后不变量扩展到前 i+1 个符号。每轮只做常数次读取，时间 O(n)，除几个 int/char 局部值外额外空间 O(1)；这些结论来自循环结构，不靠一次运行耗时证明。',
      relatedIds: ['check-subtract', 'subtract-current', 'add-current'],
    },
    {
      id: '13-prediction', kind: 'prediction', title: '先预测，再揭示 · 当前贡献与最终总和',
      body: '默认输入 MCMXCIV 先在第一个减法位置预测 C 应加还是减，再预测最终返回值。切换到 LVIII 或 IV 后，检查点会绑定新输入的真实参考快照。预测只检查对参考算法的理解，不代表学生 Java 已被编译或执行。',
      relatedIds: ['first-decision', 'final-total'],
    },
    {
      id: '13-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '字符位置、current、next、加减决策、贡献和 total 都来自同一份不可变状态快照；代码高亮、解释、下一步、上一步、播放、暂停、重置和输入切换读取这份快照，后退会恢复旧 total。这里展示预置参考算法，不解释或跟踪学生源码。学生代码只能通过独立真实 runner 通道得到编译、运行和判题反馈。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '13-guided', kind: 'guided-code', title: '引导编写 · 换值、加减判断、完整方法',
      body: '支架 1 完成七个符号的 valueOf；支架 2 写出“先检查右邻存在，再比较大小”的加减判断；支架 3 只保留方法骨架。静态支架帮助分步思考，最终仍要提交完整 Solution 到真实 Java runner，按实际返回整数判定，不比较源码文本。',
      relatedIds: ['13-guided-code'],
    },
    {
      id: '13-independent', kind: 'independent-code', title: '独立模式 · 从方法骨架修正真实失败',
      body: '独立草稿初始只有方法签名。先用 III 和 LVIII 检查普通相加，再用 IV、XL、CM 检查不同数量级的减法，最后用 MCMXCIV 检查混合情况。编译失败时看 char 单引号、switch 语法和分号；运行异常时检查 i+1 是否越界；答案偏大时检查是否遗漏减法。每次修改源码后重新运行，旧结果不属于新源码。',
      relatedIds: ['repeated-ones', 'subtract-four', 'subtract-forty', 'subtract-nine-hundred', 'mixed-subtractions'],
    },
    {
      id: '13-summary', kind: 'summary', title: '复盘 · 用不变量解释每一次加减',
      body: '请说明 char 与 String 的区别、为什么先检查 i+1<s.length()、何时减 current、处理前 i 个符号时 total 表示什么，以及末位为什么总是相加。本站分别记录预测、提示、查看答案、引导通过和独立通过本站测试；刷新可恢复草稿与进度。通过本站测试不代表通过 LeetCode 官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '6a79fc06e711b5c3ea320e2021095ec570ddf20e6445c391e0b8d7052fc7e616',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(item => ({ ...item })),
  },
  hints: [
    { id: '13-hint-concept', level: 1, body: '先把每个符号换成数值。当前值若比右侧紧邻值小，它是减法组合的左半；其他位置都相加。' },
    { id: '13-hint-invariant', level: 2, body: '处理 i 前，total 是前 i 个符号贡献的总和。先确认 i+1 仍在范围内，再决定当前贡献为 -current 或 +current。' },
    { id: '13-hint-pseudocode', level: 3, body: 'total=0；逐位取 current；若存在 next 且 current<next，就 total-=current，否则 total+=current；循环结束 return total。用 switch 把七个 char 映射为整数。完整参考 Java 另行折叠。' },
  ],
  predictionChecks: [
    {
      id: '13-predict-decision', checkpointId: 'first-decision',
      prompt: '默认演示 MCMXCIV：下标 1 的 C 位于 M 前，当前贡献应该怎样计算？',
      answer: { kind: 'choice', optionId: 'subtract' },
      options: [{ id: 'subtract', label: '减去 100' }, { id: 'add', label: '加上 100' }],
      explanation: 'C=100 小于右侧 M=1000，所以 C 是 CM 的左半，贡献 -100。',
    },
    {
      id: '13-predict-total', checkpointId: 'final-total',
      prompt: '默认演示 MCMXCIV 最终返回多少？',
      answer: { kind: 'int', value: 1994 },
      explanation: '1000-100+1000-10+100-1+5=1994。',
    },
  ],
  guided: {
    id: '13-guided-code', finalCheck: 'real-java-submit', stages: [
      { id: '13-guided-values', instruction: '支架 1 / 3：用 switch 表达式补全七个罗马符号到 int 的换值。', scaffoldSource: guidedValueOf, checkKind: 'static-practice' },
      { id: '13-guided-decision', instruction: '支架 2 / 3：先保护右侧下标，再按当前值与下一值的大小更新 total。', scaffoldSource: guidedDecision, checkKind: 'static-practice' },
      { id: '13-guided-whole', instruction: '支架 3 / 3：从方法骨架写出完整解法并提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  commonErrors: [
    { id: '13-error-always-add', description: '把所有符号都相加，忽略较小符号位于较大符号左侧时要减。', counterexampleInputId: 'subtract-four', explanation: 'IV 应为 -1+5=4；全部相加会错误得到 6。' },
    { id: '13-error-only-i', description: '只处理 IV、IX，认为只有 I 可能参与减法。', counterexampleInputId: 'subtract-forty', explanation: 'XL、XC、CD、CM 同样合法；XL 应为 -10+50=40。' },
    { id: '13-error-look-left', description: '看到当前值比左侧大时又回头减两倍，容易重复处理或写错首位分支。', counterexampleInputId: 'mixed-subtractions', explanation: '统一让每个位置只贡献一次：当前值小于下一值就减，否则加，循环不需回退。' },
    { id: '13-error-boundary', description: '不检查 i+1 是否存在就读取 s.charAt(i+1)。', counterexampleInputId: 'single-one', explanation: '最短输入 I 在 i=0 已是末位；直接读取下标 1 会抛 StringIndexOutOfBoundsException。' },
  ],
  testSuite: {
    version: PROBLEM_META['13'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '13-wrong-always-add', source: WRONG_ALWAYS_ADD_SOURCE, targetedCaseIds: ['subtract-four', 'subtract-nine', 'mixed-subtractions'] },
      { id: '13-wrong-only-i-subtracts', source: WRONG_ONLY_I_SUBTRACTS_SOURCE, targetedCaseIds: ['subtract-forty', 'subtract-ninety', 'subtract-four-hundred', 'subtract-nine-hundred'] },
    ],
  },
  visualization: {
    modelId: '13-left-to-right-lookahead', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson13;
