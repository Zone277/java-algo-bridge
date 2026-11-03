import {
  PROBLEM_META,
  IsomorphicStringsInputSchema,
  expectedOutput,
  type IsomorphicStringsInput,
  type Lesson,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_DISTINCT_COUNT_SOURCE,
  WRONG_ONE_WAY_SOURCE,
} from './reference.js';

type Lesson205 = Extract<Lesson, { id: '205' }>;
type Case205 = Lesson205['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: IsomorphicStringsInput }[] = [
  { id: 'repeat-pair', title: '重复模式一致：egg / add', input: { s: 'egg', t: 'add' } },
  { id: 'source-conflict', title: '同一来源字符指向两个字符：foo / bar', input: { s: 'foo', t: 'bar' } },
  { id: 'reverse-conflict', title: '两个来源字符挤到同一目标：ab / aa', input: { s: 'ab', t: 'aa' } },
];

function testCase(id: string, input: IsomorphicStringsInput, coverage: string): Case205 {
  const parsed = IsomorphicStringsInputSchema.parse(input);
  const expected = expectedOutput('205', parsed);
  if (expected.kind !== 'boolean') throw new Error('205 expected output must be boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case205[] = [
  testCase('single-renamed', { s: 'a', t: 'z' }, '最短输入；不同字符仍可建立一对一映射。'),
  testCase('repeat-pair', { s: 'egg', t: 'add' }, '相同重复模式，e→a、g→d，应返回 true。'),
  testCase('source-conflict', { s: 'foo', t: 'bar' }, '同一个 o 先后对应 a 和 r，检测正向一致性。'),
  testCase('reverse-conflict', { s: 'ab', t: 'aa' }, 'a、b 都想对应目标 a，检测反向唯一性。'),
  testCase('classic-true', { s: 'paper', t: 'title' }, '多组重复字符保持相同出现位置模式。'),
  testCase('same-count-wrong-pattern', { s: 'aabb', t: 'abab' }, '两边不同字符数量相同，但重复位置不同，击败只数不同字符的错误。'),
  testCase('source-repeat-target-unique', { s: 'aba', t: 'xyz' }, '来源字符重复而目标对应位置不重复，必须 false。'),
  testCase('target-repeat-source-unique', { s: 'xyz', t: 'aba' }, '目标字符重复而来源对应位置不重复，必须 false。'),
  testCase('same-text', { s: 'bridge', t: 'bridge' }, '字符与位置完全相同当然同构，但不是唯一的 true 情形。'),
  testCase('space-pattern', { s: '12 1', t: 'ab a' }, '空格是普通的可打印 ASCII 字符，并参与映射。'),
  testCase('punctuation-pattern', { s: '!@!', t: '#$#' }, '标点字符的重复模式一致，验证不是只支持字母。'),
  testCase('late-repeat', { s: 'abca', t: 'zbxz' }, '末位回到首字符映射，覆盖较晚重复。'),
  testCase('mirror-pattern', { s: 'abba', t: 'cddc' }, '两组字符交错重复，验证双向映射可复用。'),
  testCase('site-limit-pattern', { s: 'ab'.repeat(5000), t: 'XY'.repeat(5000) }, '本站 10000 字符上限；长重复模式应完整扫描并返回 true。'),
];

const guidedCompare = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        int[] seenS = new int[128];
        int[] seenT = new int[128];
        for (int i = 0; i < s.length(); i++) {
            char a = s.charAt(i);
            char b = t.charAt(i);
            // TODO：若 a 与 b 的最近位置标记不同，立即返回 false。
            seenS[a] = i + 1;
            seenT[b] = i + 1;
        }
        return true;
    }
}
`;

const guidedArrays = `class Solution {
    public boolean isIsomorphic(String s, String t) {
        // TODO：创建两个长度为 128 的 int 数组。
        // TODO：逐位读取 char；先比较两个最近位置标记，再都写成 i + 1。
        throw new UnsupportedOperationException("请完成最近位置模式检查");
    }
}
`;

export const lesson205 = {
  schemaVersion: 1,
  id: '205',
  slug: 'isomorphic-strings',
  title: '同构字符串',
  order: 55,
  lessonVersion: PROBLEM_META['205'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J4', 'J8'],
  objectives: [
    '使用 String.length()、charAt(i)、char 与 int[128] 编写可打印 ASCII 字符串算法。',
    '说明同构需要双向一一映射，识别“一个来源对应多个目标”和“多个来源挤到一个目标”两类冲突。',
    '用最近出现位置加一的不变量逐步预测重复模式，并区分数组对象、数组引用与 char/int 基本值。',
    '把完整 Java 提交到真实 runner，利用空格、标点、重复模式与长输入定位错误。',
  ],
  source: { platform: 'LeetCode', number: 205, url: 'https://leetcode.com/problems/isomorphic-strings/' },
  taskSemantics: '给定两个等长字符串 s 和 t。可以为 s 中每一种字符选择一个目标字符，并把它的每次出现都替换成该目标；不同的来源字符不能选择同一个目标字符。若经过这种一致且一一对应的改名能得到 t，返回 true，否则返回 false。字符的先后位置不改变。题意参考 LeetCode 205；题面、示例与讲解为本站原创表达，无官方合作。',
  siteLimits: { description: '本站真实判题接受两个等长、非空、长度 1—10000 的可打印 ASCII 字符串（U+0020—U+007E，包含空格和标点）；参考状态演示每串最多 30 个字符。', inputSchemaId: 'IsomorphicStringsInputSchema' },
  steps: [
    {
      id: '205-syntax', kind: 'syntax', title: 'Java 前置 · String、char 与 int[128]',
      body: '方法签名是 public boolean isIsomorphic(String s, String t)。String 是引用类型，参数接收引用值的副本；char a = s.charAt(i) 得到 char 基本值，不能写成 s[i]。s.length() 是方法，seenS.length 才是数组字段。int[] seenS = new int[128] 创建数组对象，元素自动初始化为 0；局部变量仍需先赋值。本站只允许 U+0020—U+007E，因此 char 的数值可安全作为 0..127 数组下标；这不是对任意 Unicode 文本的通用承诺。',
      relatedIds: ['J1', 'J2', 'J3', 'J4'],
    },
    {
      id: '205-understanding', kind: 'understanding', title: '理解任务 · 对应必须一致且双向唯一',
      body: 'egg / add 是同构：e 每次换成 a，g 每次换成 d。foo / bar 不是：第一个 o 想换成 a，第二个 o 又想换成 r，同一个来源不一致。ab / aa 也不是：虽然 a→a、b→a 各自看似固定，但两个不同来源挤到了同一个目标。字符可以相同，也可以整体改名；输出只回答 boolean，不返回替换后的字符串。',
      relatedIds: ['repeat-pair', 'source-conflict', 'reverse-conflict'],
    },
    {
      id: '205-manual', kind: 'understanding', title: '手工模拟 · egg / add',
      body: '两个 int[128] 起初全是 0。i=0 比较 e 与 a：标记都是 0，于是分别写 1。i=1 比较 g 与 d：也都是 0，于是写 2。i=2 再比较 g 与 d：两边最近标记都是 2，相同，再写 3。扫描结束返回 true。若 t 改为 bar，i=2 时 seenS[o]=2，而 seenT[r]=0，模式不同，立即 false。标记保存 i+1，是为了让 0 专门表示“从未出现”。',
      relatedIds: ['repeat-pair', 'source-conflict', 'pattern-check'],
    },
    {
      id: '205-derivation', kind: 'derivation', title: '推导 · 比较两串的出现位置模式',
      body: '也可以维护 s→t 和 t→s 两张映射表。固定为可打印 ASCII 后，两个最近位置数组更紧凑：处理下标 i 前，seenS[c] 与 seenT[d] 分别是字符 c、d 在各自已读前缀中的最近出现位置加一，未出现为 0。当前 a、b 只有在这两个标记相等时才能继续对应；若一侧重复而另一侧没有在同一位置重复，正向一致性或反向唯一性必有一个被破坏。比较通过后，两边都写 i+1。时间 O(n)，额外空间 O(128)，其中 n 为字符串长度；小用例运行时间不能证明复杂度。',
      relatedIds: ['check-pattern', 'record-s', 'record-t'],
    },
    {
      id: '205-prediction', kind: 'prediction', title: '先预测，再揭示 · 最近位置与最终答案',
      body: '在当前输入的第二对字符处（长度为 1 时使用第一对），先预测两个最近位置标记是否相同；再预测最终是否同构。答案由当前参考状态快照生成，切换输入会改变结论。此互动检查理解，不是学生 Java 的编译或执行结果。',
      relatedIds: ['pattern-check', 'final-result'],
    },
    {
      id: '205-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '变量表、两个最近位置数组的非零槽、解释和代码步骤高亮读取同一份不可变快照。为遵守 30 项演示上限，128 个槽中值为 0 的槽不逐个绘制；这是 int[128] 的稀疏显示，不是把参考 Java 改成 Map。下一步、上一步、播放、暂停、重置与输入切换复用公共播放器；后退会恢复原快照。数组槽表达参考算法状态，不是 JVM 内存地址。学生编辑的源码走独立的真实 runner 通道，本演示不会把参考动画包装成学生执行轨迹。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '205-guided', kind: 'guided-code', title: '引导编写 · 比较、记录、完整方法',
      body: '支架 1 补出最近位置不同时的返回；支架 2 自行创建数组并写完整循环；支架 3 从方法骨架独立实现。支架是静态练习，最终必须把完整 Java 交给真实 runner，通过本站测试才记录引导通过，不按填入字符串是否等于参考答案判定。',
      relatedIds: ['205-guided-code'],
    },
    {
      id: '205-independent', kind: 'independent-code', title: '独立挑战 · 用两类冲突修正代码',
      body: '独立草稿从方法骨架开始，并与引导草稿分开保存。先用 foo/bar 检查同一来源是否保持一致，再用 ab/aa 检查反向唯一性，用空格和标点确认 ASCII 下标处理。若编译失败，检查 charAt、数组声明和分号；若运行异常，检查数组长度；若结果错误，用 aabb/abab 检查是否只数不同字符。源码改变后必须重新请求真实执行，旧结果只属于旧源码哈希。',
      relatedIds: ['source-conflict', 'reverse-conflict', 'same-count-wrong-pattern', 'space-pattern', 'J8'],
    },
    {
      id: '205-summary', kind: 'summary', title: '复盘 · 说清双向一一映射',
      body: '请解释：为什么只保存 s→t 不够？0 与 i+1 各表示什么？处理前 i 对字符时两个数组的不变量是什么？为什么比较最近位置相等同时约束正向和反向？本站分别记录预测、提示、查看答案、引导通过和独立通过本站测试；刷新可恢复草稿与进度，动画播放不等于掌握，本站通过也不等于官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'f424d0e83e1827cc05fda98c6b6b12ada4a1ce29d070380fbb71e73a0d2df02e',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '205-hint-concept', level: 1, body: '比较的不是字符本身，而是重复模式。每个来源只能对应一个目标，每个目标也只能来自一个来源。' },
    { id: '205-hint-invariant', level: 2, body: '用两个数组分别记录字符在已读前缀中的最近位置加一。当前两个标记必须相等：要么都没见过，要么上次就在同一个下标配对。' },
    { id: '205-hint-pseudocode', level: 3, body: '创建 seenS[128]、seenT[128]；对每个 i 取 a=s.charAt(i)、b=t.charAt(i)；若 seenS[a] != seenT[b] 返回 false；否则两槽都写 i+1；循环结束 true。完整参考 Java 另行折叠。' },
  ],
  predictionChecks: [
    {
      id: '205-predict-pattern', checkpointId: 'pattern-check',
      prompt: '默认演示 egg / add：第二对字符的更新前最近位置标记相同吗？',
      answer: { kind: 'choice', optionId: 'same' },
      options: [{ id: 'same', label: '相同，可以继续' }, { id: 'different', label: '不同，应返回 false' }],
      explanation: '第二对是首次出现的 g 与 d，两个槽都还是 0，所以可以建立对应。',
    },
    {
      id: '205-predict-result', checkpointId: 'final-result',
      prompt: '默认演示 egg / add：最终是否同构？',
      answer: { kind: 'choice', optionId: 'yes' },
      options: [{ id: 'yes', label: '是（true）' }, { id: 'no', label: '否（false）' }],
      explanation: '每次重复都发生在配对的相同位置，最终返回 true。',
    },
  ],
  guided: {
    id: '205-guided-code', finalCheck: 'real-java-submit', stages: [
      { id: '205-guided-compare', instruction: '支架 1 / 3：补出最近位置标记不同时立即返回 false 的条件。', scaffoldSource: guidedCompare, checkKind: 'static-practice' },
      { id: '205-guided-arrays', instruction: '支架 2 / 3：创建两个 128 槽数组，逐位先比较再记录 i+1。', scaffoldSource: guidedArrays, checkKind: 'static-practice' },
      { id: '205-guided-whole', instruction: '支架 3 / 3：只从方法骨架完成完整算法，并提交完整源码到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  commonErrors: [
    { id: '205-error-one-way', description: '只保存 s→t，允许两个不同来源字符对应同一个目标。', counterexampleInputId: 'reverse-conflict', explanation: 'ab/aa 中 a→a、b→a 的正向记录各自不冲突，但目标 a 被复用，必须 false。' },
    { id: '205-error-distinct-count', description: '只比较两边不同字符的数量。', counterexampleInputId: 'same-count-wrong-pattern', explanation: 'aabb 与 abab 都只有两种字符，但重复位置模式不同，不同字符数量相同并不足够。' },
    { id: '205-error-equals', description: '要求对应位置字符本身相等，拒绝合法改名。', counterexampleInputId: 'repeat-pair', explanation: 'egg 与 add 文本不同，却能由 e→a、g→d 的一致改名得到，应为 true。' },
    { id: '205-error-zero-index', description: '直接保存下标 i，使“第一次出现在下标 0”和“从未出现”都等于 0。', counterexampleInputId: 'source-conflict', explanation: '保存 i+1 才能让 0 保留为未见哨兵；混淆后可能漏掉从首位开始的重复冲突。' },
  ],
  testSuite: {
    version: PROBLEM_META['205'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '205-wrong-one-way', source: WRONG_ONE_WAY_SOURCE, targetedCaseIds: ['reverse-conflict', 'target-repeat-source-unique'] },
      { id: '205-wrong-distinct-count', source: WRONG_DISTINCT_COUNT_SOURCE, targetedCaseIds: ['same-count-wrong-pattern'] },
    ],
  },
  visualization: {
    modelId: '205-last-seen-pattern', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson205;
