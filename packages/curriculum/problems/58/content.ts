import { LastWordInputSchema, PROBLEM_META, expectedOutput, type LastWordInput, type Lesson } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_FIRST_WORD_SOURCE, WRONG_NO_TRAILING_SKIP_SOURCE,
} from './reference.js';

type Lesson58 = Extract<Lesson, { id: '58' }>;
type Case58 = Lesson58['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: LastWordInput }[] = [
  { id: 'trailing-spaces', title: '跳过尾部空格：red blue  ', input: { s: 'red blue  ' } },
  { id: 'one-word', title: '一个单词：Solo', input: { s: 'Solo' } },
  { id: 'wide-gap', title: '中间连续空格：go     home', input: { s: 'go     home' } },
];

function testCase(id: string, input: LastWordInput, coverage: string): Case58 {
  const parsed = LastWordInputSchema.parse(input);
  const expected = expectedOutput('58', parsed);
  if (expected.kind !== 'int') throw new Error('58 期望输出必须是 int');
  return { id, input: parsed, expected, coverage };
}

const cases: Case58[] = [
  testCase('single-letter', { s: 'A' }, '最短合法输入，索引到 -1 后仍须返回 1。'),
  testCase('single-word', { s: 'compact' }, '整个输入就是一个单词，不能依赖空格终止计数。'),
  testCase('leading-spaces', { s: '   code' }, '前导空格不影响最后一个单词长度。'),
  testCase('trailing-spaces-case', { s: 'alpha   ' }, '尾部空格须先跳过，不能直接得到 0。'),
  testCase('two-words', { s: 'red blue' }, '返回最后的 blue 长度，而非首词 red 的长度。'),
  testCase('two-words-trailing', { s: 'red blue   ' }, '同时含多个单词和尾部空格，先定位末词再计数。'),
  testCase('last-single-letter', { s: 'Java C' }, '最后一词仅一字母，不能返回第一词长度。'),
  testCase('spaces-both-ends', { s: '   C java   ' }, '两端空格与不同长度单词同时存在。'),
  testCase('internal-multiple-spaces', { s: 'go     home' }, '单词之间多个空格不能使末词计数提前归零。'),
  testCase('mixed-case', { s: 'aB CdEf' }, '大写与小写均是单词字母，末词长度为 4。'),
  testCase('site-max-word', { s: 'z'.repeat(10000) }, '本站 10000 字符上限，全串为末词，检验完整扫描。'),
  testCase('site-max-with-spaces', { s: 'q'.repeat(9997) + '   ' }, '本站长度上限且有尾部空格，正确长度为 9997。'),
];

const guidedSkip = `class Solution {
    public int lengthOfLastWord(String s) {
        int i = s.length() - 1;
        while (/* TODO：i 未越过左边界且当前字符是空格 */) {
            i--;
        }
        int length = 0;
        while (i >= 0 && s.charAt(i) != ' ') {
            length++;
            i--;
        }
        return length;
    }
}
`;

const guidedCount = `class Solution {
    public int lengthOfLastWord(String s) {
        int i = s.length() - 1;
        while (i >= 0 && s.charAt(i) == ' ') i--;
        int length = 0;
        // TODO：从末词最后一个字母向左移动；每访问一个字母将 length 加一。
        // 停在空格或越过左边界时返回 length。
        throw new UnsupportedOperationException("请完成末词扫描");
    }
}
`;

export const lesson58 = {
  schemaVersion: 1, id: '58', slug: 'length-of-last-word', title: '最后一个单词的长度', order: 47,
  lessonVersion: PROBLEM_META['58'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J8'],
  objectives: [
    '正确区分 String.length() 与数组 length，用 charAt(i) 安全读取本站限定的 ASCII 字符。',
    '先跳过尾部空格，再从右往左数末词字符，维持下标与计数不变量。',
    '使用真实 Java 提交检验前后空格、单词长度不同和 10000 字符边界。',
  ],
  source: { platform: 'LeetCode', number: 58, url: 'https://leetcode.com/problems/length-of-last-word/' },
  taskSemantics: '给定由英文字母和空格组成、至少有一个单词的字符串 s。单词是没有空格的连续字母；返回最后一个单词的字母数。例如 "red blue  " 的末词是 blue，返回整数 4；右侧两个空格不是单词的一部分。题意参考 LeetCode 58；文字、示例、推导和代码均为本站原创，无官方合作。',
  siteLimits: { description: '本站真实判题输入长度 1—10000，仅 ASCII 英文字母 A—Z/a—z 与普通空格 U+0020，且至少有一个字母；超出范围是输入错误，不当作算法错误。参考演示最多 30 字符，真实 Java 仍可处理本站全部长度。', inputSchemaId: 'LastWordInputSchema' },
  steps: [
    { id: '58-syntax', kind: 'syntax', title: 'Java 前置 · String、charAt、while 与返回值', body: '方法签名 public int lengthOfLastWord(String s) 返回 int 基本值。s 是 String 引用变量；参数传递会复制引用值，不复制字符串对象。String 长度写 s.length()，与数组 nums.length 不同；s.charAt(i) 取得索引 i 处的 char（UTF-16 代码单元）。本站只允许 ASCII 英文字母与普通空格，因此每个字母恰占一个 char。while 条件写 i >= 0 && s.charAt(i) == \' \'：&& 短路，i 为 -1 时不再调用 charAt，避免越界。空格 char 用单引号，String 用双引号；局部 int length 必须明确初始化。', relatedIds: ['J1', 'J2', 'J4'] },
    { id: '58-understanding', kind: 'understanding', title: '理解输入输出 · 空格不计入末词', body: '手算 "red blue  "：索引 0..2 是 red，索引 3 是空格，4..7 是 blue，8..9 是尾部空格。结果是末词 blue 的长度 4，而不是末尾两个空格的长度 2、首词的长度 3，也不是末词起始下标 4。输入保证至少有一个字母，故跳过尾部空格后一定能找到末词。', relatedIds: ['trailing-spaces', 'two-words-trailing'] },
    { id: '58-manual', kind: 'understanding', title: '手工模拟 · 先定位，再数数', body: '对 "red blue  "，i 初始为 9。先看位置 9 和 8 都是空格，i 依次变 8、7；位置 7 是 e，跳空格阶段结束。length 初始 0；依次检查 i=7 的 e、6 的 u、5 的 l、4 的 b，每次 length 加一再让 i 左移，最终 i=3、length=4。位置 3 是空格，第二个 while 停止并返回 4。', relatedIds: ['trailing-spaces', 'after-trailing-skip', 'final-length'] },
    { id: '58-derivation', kind: 'derivation', title: '推导 · 双段逆向扫描的不变量', body: '可以先 trim 再 split，但会创建额外字符串/数组；直接逆向扫描只需一个下标与一个计数。第一段每次检查前，i 右侧已检查的字符全是尾部空格；遇到字母就停。第二段每次检查前，length 恰是 i 右侧已数的末词字符数，且末词尾端固定。遇空格或 i<0 时，该数字就是完整末词长度。两段至多检查每个字符一次，时间 O(n)，额外空间 O(1)；这是从循环推导的，不是由少量运行时间宣称。', relatedIds: ['check-trailing-space', 'skip-trailing-space', 'check-word-char', 'count-word-char'] },
    { id: '58-prediction', kind: 'prediction', title: '先预测，再揭示 · 下标与末词长度', body: '默认输入先预测跳过右侧全部空格后 i 指向哪个索引，再预测完整末词的长度。每次预测关联输入和不可变快照；可切换单词无空格及词间多空格的输入。预测是教学检查，不是学生代码的真实执行。', relatedIds: ['after-trailing-skip', 'final-length'] },
    { id: '58-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '下标、已数末词区间、变量表与代码高亮都来自同一个不可变状态快照，左移后的状态与此前快照分开保存。区间只是对原始 String 的教学标示，不代表 Java 修改了字符串或创建了数组。播放、暂停、前进、后退、重置和输入切换复用公共播放器；学生编辑的 Java 另由 Docker runner 真实编译执行，此演示从不解释任意学生源码。', relatedIds: demoInputs.map(item => item.id) },
    { id: '58-guided', kind: 'guided-code', title: '引导编写 · 补条件、补循环、独立写法', body: '先补尾部空格 while 的安全条件，再自行补末词计数循环，最后从方法骨架完成整个方法。阶段检查只是静态练习；引导通过必须提交完整 Java 到真实 runner 并通过本站测试，不比较填入代码与参考答案的文本。', relatedIds: ['58-guided-code'] },
    { id: '58-independent', kind: 'independent-code', title: '独立挑战 · 失败后复现并修正', body: '独立模式从方法骨架开始，草稿与引导阶段分别保存。先运行有尾部空格的输入，若结果为 0 检查第一段扫描；若只得到 red 的长度检查扫描方向；编译错误看 char 引号、括号和分号，异常看 i>=0 的短路边界，超时看每次循环是否移动 i。修改源码后旧请求结果只对应旧源码 hash，重新运行并提交本站测试。', relatedIds: ['J8', 'trailing-spaces-case', 'two-words', 'single-letter'] },
    { id: '58-summary', kind: 'summary', title: '复盘 · 两段扫描各保证什么', body: '口述“第一段 i 的右边全是尾部空格”“第二段 length 等于已扫描的末词字符数”，并解释为何 i=-1 时不访问 charAt。提示、查看答案、引导通过、独立通过分别记录；刷新可恢复草稿和进度。参考动画播放与本站测试通过都不能冒充掌握或官方评测。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '98fdc4eae47e488f371bff1d146823463312f592a398e5dea520b97ca669a896',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '58-hint-concept', level: 1, body: '从右侧开始看：尾部空格和末词字母是两段不同的连续区域，先越过前者。' },
    { id: '58-hint-invariant', level: 2, body: '让 i 从 s.length()-1 向左。第一段跳过空格，第二段每遇一字母就给 length 加一；两个条件都先检查 i>=0。' },
    { id: '58-hint-pseudocode', level: 3, body: 'i=末下标；while(i>=0 且 s.charAt(i) 为空格) i--；length=0；while(i>=0 且当前不是空格){length++; i--;}；return length。完整参考 Java 答案另行折叠。' },
  ],
  predictionChecks: [
    { id: '58-predict-index', checkpointId: 'after-trailing-skip', prompt: '默认演示 red blue  ：越过全部尾部空格后 i 指向哪个 0 起始索引？', answer: { kind: 'int', value: 7 }, explanation: '索引 9 和 8 是空格，i 从 9→8→7，索引 7 的 e 是末词最后一个字母。' },
    { id: '58-predict-result', checkpointId: 'final-length', prompt: '默认演示 red blue  ：最后返回的末词长度是多少？', answer: { kind: 'int', value: 4 }, explanation: 'blue 的四个字母依次被计数，red 和空格都不计入。' },
  ],
  guided: { id: '58-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '58-guided-skip', instruction: '支架 1 / 3：补全跳过尾部空格的 while 条件，并保留 i>=0 的短路保护。', checkKind: 'static-practice', scaffoldSource: guidedSkip },
    { id: '58-guided-count', instruction: '支架 2 / 3：自己写第二段 while，对末词字母逐个计数并左移。', checkKind: 'static-practice', scaffoldSource: guidedCount },
    { id: '58-guided-whole', instruction: '支架 3 / 3：只看方法骨架，从头完成两段扫描，再将完整 Java 交给真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '58-error-no-skip', description: '直接从 s.length()-1 数字母，把尾部空格误认成末词已结束。', counterexampleInputId: 'trailing-spaces-case', explanation: 'alpha 后有三个空格；未先跳过时会错误地返回 0，正确为 5。' },
    { id: '58-error-first-word', description: '从左到右数到第一个空格就返回，只得到首词长度。', counterexampleInputId: 'two-words', explanation: 'red blue 的首词长度 3，末词 blue 长度 4。' },
    { id: '58-error-boundary', description: '在 i>=0 之前调用 charAt(i)，单词延伸到索引 0 时越界。', counterexampleInputId: 'single-letter', explanation: '单字母 A 计数后 i=-1；&& 必须先判断下标再访问字符。' },
    { id: '58-error-spaces', description: '把中间连续空格也当作末词字符或直接当作结果长度。', counterexampleInputId: 'internal-multiple-spaces', explanation: 'go     home 的末词是 home，长度 4，与中间五个空格无关。' },
  ],
  testSuite: { version: PROBLEM_META['58'].testSuiteVersion, cases, wrongFixtures: [
    { id: '58-wrong-no-trailing-skip', source: WRONG_NO_TRAILING_SKIP_SOURCE, targetedCaseIds: ['trailing-spaces-case', 'two-words-trailing', 'spaces-both-ends', 'site-max-with-spaces'] },
    { id: '58-wrong-first-word', source: WRONG_FIRST_WORD_SOURCE, targetedCaseIds: ['two-words', 'two-words-trailing', 'last-single-letter', 'spaces-both-ends'] },
  ] },
  visualization: { modelId: '58-backward-scan', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson58;
