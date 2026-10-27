import { FirstUniqueCharInputSchema, PROBLEM_META, expectedOutput, type FirstUniqueCharInput, type Lesson } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_FIRST_APPEARANCE_SOURCE, WRONG_RIGHTMOST_SOURCE,
} from './reference.js';

type Lesson387 = Extract<Lesson, { id: '387' }>;
type Case387 = Lesson387['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: FirstUniqueCharInput }[] = [
  { id: 'later-unique', title: '前两种字母重复，v 才唯一：level', input: { s: 'level' } },
  { id: 'all-repeated', title: '每种字母都重复：aabb', input: { s: 'aabb' } },
  { id: 'single-letter', title: '只有一个字符：z', input: { s: 'z' } },
];

function testCase(id: string, input: FirstUniqueCharInput, coverage: string): Case387 {
  const parsed = FirstUniqueCharInputSchema.parse(input);
  const expected = expectedOutput('387', parsed);
  if (expected.kind !== 'int') throw new Error('387 期望输出应为 int');
  return { id, input: parsed, expected, coverage };
}

const cases: Case387[] = [
  testCase('single', { s: 'z' }, '最短合法输入；唯一字符在下标 0，不能把下标和字母槽号 25 混淆。'),
  testCase('same-only', { s: 'aaaaa' }, '只含一种重复字符，不存在唯一字符，须返回 -1。'),
  testCase('all-pairs', { s: 'aabbcc' }, '多种字母各两次，不能因第一次看到某字符就认定它唯一。'),
  testCase('default-level', { s: 'level' }, 'l 与 e 都出现两次，v 只出现一次，最左唯一下标为 2。'),
  testCase('first-unique', { s: 'zabbcc' }, '首字符 z 唯一，后续重复字符不应覆盖首个答案。'),
  testCase('last-unique', { s: 'aabbc' }, '直到末尾才出现唯一字符，第二趟必须完整扫描。'),
  testCase('multiple-unique', { s: 'aabbcd' }, 'c、d 都唯一，应返回更左的 c 下标 4，排除从右侧扫描的错解。'),
  testCase('many-distinct', { s: 'leetcode' }, 'l 在下标 0 只出现一次；e 重复，不能只看相邻字符。'),
  testCase('first-and-last', { s: 'zabccbaq' }, 'z 与 q 都唯一；首个答案是 0，末尾新增唯一字符不能覆盖。'),
  testCase('late-two-unique', { s: 'abcabcde' }, '前六个字符均重复，d/e 唯一，应选择下标 6 而非 7。'),
  testCase('site-limit-last', { s: 'a'.repeat(9999) + 'z' }, '本站 10000 字符上限，唯一字符在最后下标 9999；真实判题不受 30 字符演示上限影响。'),
  testCase('site-limit-first', { s: 'z' + 'a'.repeat(9999) }, '本站 10000 字符上限，首字符唯一；计数仍须考虑其后完整 9999 个字符。'),
  testCase('site-limit-no-solution', { s: 'a'.repeat(10000) }, '本站最大长度且无唯一字符，验证全串统计和 -1 分支。'),
];

const guidedCount = `class Solution {
    public int firstUniqChar(String s) {
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[/* TODO：s.charAt(i) 对应的 0..25 槽号 */]++;
        }
        for (int i = 0; i < s.length(); i++) {
            if (count[s.charAt(i) - 'a'] == 1) return i;
        }
        return -1;
    }
}
`;

const guidedScan = `class Solution {
    public int firstUniqChar(String s) {
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) count[s.charAt(i) - 'a']++;
        // TODO：第二趟从左到右检查全串频次为 1 的位置，立即返回它的下标。
        // TODO：如果全部失败，返回 -1。
        throw new UnsupportedOperationException("请完成第二趟扫描");
    }
}
`;

export const lesson387 = {
  schemaVersion: 1, id: '387', slug: 'first-unique-character-in-a-string', title: '字符串中的第一个唯一字符', order: 34,
  lessonVersion: PROBLEM_META['387'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J4', 'J8'],
  objectives: [
    '在本站小写 ASCII 范围内使用 String.length()、charAt(i)、char 差值与 int[26]，不把下标当作字母槽号。',
    '区分“第一次遇到”和“在全串只出现一次”；先统计全串，再从左到右寻找最左合法位置。',
    '核对两趟循环的不变量、无解的 -1 分支与 10000 字符本站边界，并用真实 Java 验证。',
  ],
  source: { platform: 'LeetCode', number: 387, url: 'https://leetcode.com/problems/first-unique-character-in-a-string/' },
  taskSemantics: '给定只含小写英文字母的非空字符串 s，寻找在整个 s 中恰好出现一次的字符。若有多个，返回位置最靠左的那个字符的 0 起始下标；若没有，返回 -1。返回的是位置，不是字符或它的字母编号。题意参考 LeetCode 387；本站文字、示例、推导和代码为原创表达，无官方合作。',
  siteLimits: { description: '本站真实判题接受长度 1—10000、仅由小写 ASCII 字母 a—z 组成的字符串。大写、数字、空串或一般 Unicode 文本不属于本题输入；超出时是输入错误，不当作学生算法错误。参考状态演示最多 30 字符，超过会明确拒绝，真实 Java 仍可运行到本站全长。', inputSchemaId: 'FirstUniqueCharInputSchema' },
  steps: [
    { id: '387-syntax', kind: 'syntax', title: 'Java 前置 · String、char、数组与返回值', body: '签名 public int firstUniqChar(String s) 要返回 int 下标。s 保存 String 引用值；Java 传入方法时按值复制这个引用值，并不复制字符串对象。i 和返回下标是 int 基本值；count 是 int[] 数组引用，new int[26] 创建数组对象且其元素自动为 0，局部 int 变量仍须明确赋值。字符串长度调用 s.length()，数组长度才写 count.length；字符用 s.charAt(i)，不能写 s[i]。char 是 UTF-16 代码单元，减去 \'a\' 只因本站输入严格限制为小写 ASCII a—z 才恰好得到 0..25；此做法不能直接推广到任意 Unicode 字符。', relatedIds: ['J1', 'J2', 'J3', 'J4'] },
    { id: '387-understand', kind: 'understanding', title: '读题 · 唯一要看完整字符串', body: '例如 s="level"，位置 0/4 的 l 各属于重复字符，位置 1/3 的 e 也重复；只有位置 2 的 v 在全串出现一次，所以返回整数 2。s="aabb" 每个字符都重复，返回 -1。即使某个字符是从左往右第一次被看到，后面还可能出现第二次，不能立即返回它。输出不是 char，也不是长度或出现次数。', relatedIds: ['default-level', 'all-pairs'] },
    { id: '387-manual', kind: 'understanding', title: '手算 · 两趟看 level', body: '第一趟从 i=0 读到 4：l 槽由 0→1→2，e 槽由 0→1→2，v 槽由 0→1；最终 l=2、e=2、v=1，其他槽=0。第二趟重新从左开始：i=0 读 l，计数 2，跳过；i=1 读 e，计数 2，跳过；i=2 读 v，计数 1，立即返回 2。所有计数都来自全串；第二趟不再改变 count。', relatedIds: ['later-unique', 'first-frequency', 'final-result'] },
    { id: '387-derive', kind: 'derivation', title: '推导 · 为什么要先统计再选最左', body: '逐个候选到全串中重新数一遍，最坏需要 O(n²) 次字符检查。本站输入仅 a—z，可用 26 槽保存频次：第一趟处理到 i 之前，count[c] 恰等于 s[0..i) 中 c 的出现次数；处理完后前缀扩至 i+1。第一趟结束时得到全串频次。第二趟检查 i 时，count 保持不变且 [0,i) 都已证实不是唯一字符；若当前槽为 1，i 必为最左答案，可以立即返回。扫完则没有答案，返回 -1。两趟共 O(n+26) 时间，固定 26 槽为 O(26) 额外空间；运行时间样本不能替代复杂度推导。', relatedIds: ['check-count-loop', 'increment-count', 'check-scan-loop', 'check-unique'] },
    { id: '387-predict', kind: 'prediction', title: '先预测，再揭示 · 全串频次与最终下标', body: '根据当前演示输入，先预测第二趟的第一个候选字符在整个字符串里出现几次，再预测方法最终返回的下标。切换到 aabb 可看到无解返回 -1，切换到 z 可看到单字符的两个检查点。每个答案从对应输入的不可变状态快照生成；预测是教学互动，不是学生 Java 的运行结果。', relatedIds: ['first-frequency', 'final-result'] },
    { id: '387-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '字符串已处理前缀、count[26]、变量表、说明和参考代码高亮取自同一不可变快照。第一趟高亮统计前缀，第二趟重新从左高亮候选前缀；高亮是教学标记，不表示原 String 被修改或 JVM 内存布局。count 的字母槽显示当前 Java 参考算法的计数。下一步、上一步、播放、暂停、重置和输入切换复用公共播放器，后退恢复原快照。学生自己编辑的源码由真实 runner 另行 javac/java 执行；这里没有解释学生代码。', relatedIds: demoInputs.map(item => item.id) },
    { id: '387-guided', kind: 'guided-code', title: '引导编写 · 字符槽、第二趟、完整方法', body: '阶段 1 补 char 到 0..25 槽号的表达式，阶段 2 自行写第二趟寻找最左唯一位置，阶段 3 从方法骨架写完整两趟算法。支架中的空格/注释是静态练习，不按字符串是否与参考答案一致判定；引导通过须把完整 Java 源码交给真实 runner，通过本站全部测试。', relatedIds: ['387-guided-code'] },
    { id: '387-independent', kind: 'independent-code', title: '独立挑战 · 失败后寻找反例', body: '独立草稿从方法骨架开始，与引导草稿分别保存。先用 level 检查是否把“首见”错当“唯一”，用 aabb 检查 -1，用 aabbcd 检查最左，用 z 检查下标与字母槽的区别，用上限用例检查完整扫描。编译错误先看 charAt、引号和分号；运行异常检查槽号/下标边界；超时检查循环递增。源码修改后旧请求的结果只属于旧源码 hash，修正后重新运行并提交本站测试。', relatedIds: ['J8', 'default-level', 'all-pairs', 'multiple-unique', 'single'] },
    { id: '387-summary', kind: 'summary', title: '复盘 · 两个不变量与反馈', body: '请口述第一趟 count 对哪一段前缀准确，第二趟为何 count 已是全串信息而不能继续修改；解释 return i 为什么给出最左而不是最右，以及无唯一时为何返回 -1。本站分别记录预测、提示、查看答案、引导通过和独立通过本站测试，刷新可恢复草稿与进度；动画播放不代表掌握，本站测试通过不等同官方评测。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'fc4e98593cacf0d248ee331e5d69060207df26054e994b59ff3348dee8d9c48c',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '387-hint-concept', level: 1, body: '先弄清“全串只出现一次”。在看到字符的当下，尚不知道它是否会在后面重复。' },
    { id: '387-hint-invariant', level: 2, body: '先完成全部 count[26]，再从 i=0 扫；第一趟 count 是已读前缀频次，第二趟 count 必须始终是全串频次。' },
    { id: '387-hint-pseudocode', level: 3, body: '建 int[26]；第一趟对每个 i 执行 count[s.charAt(i)-\'a\']++；第二趟从左到右遇 count[s.charAt(i)-\'a\']==1 就 return i；走完 return -1。完整参考 Java 答案另行折叠。' },
  ],
  predictionChecks: [
    { id: '387-predict-first-frequency', checkpointId: 'first-frequency', prompt: '默认演示 level：首候选 l 的全串频次是多少？', answer: { kind: 'int', value: 2 }, explanation: 'l 出现在 0 和 4；先统计完整字符串，再进入第二趟，count[l]=2。' },
    { id: '387-predict-final', checkpointId: 'final-result', prompt: '默认演示 level：方法最后返回哪个下标？', answer: { kind: 'int', value: 2 }, explanation: 'l/e 重复，v 在下标 2 唯一，因此返回 2。' },
  ],
  guided: { id: '387-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '387-guided-slot', instruction: '支架 1 / 3：把 s.charAt(i) 映射到 0..25，完成第一趟的计数。', checkKind: 'static-practice', scaffoldSource: guidedCount },
    { id: '387-guided-second-pass', instruction: '支架 2 / 3：自行写第二趟，从左边找全串频次为 1 的首个下标，并处理无解。', checkKind: 'static-practice', scaffoldSource: guidedScan },
    { id: '387-guided-whole', instruction: '支架 3 / 3：从独立方法骨架实现全部算法，再提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '387-error-first-seen', description: '第一次遇到 s[0] 就返回 0，忽略其后可能重复。', counterexampleInputId: 'default-level', explanation: 'level 的首字符 l 出现两次，正确答案是下标 2。' },
    { id: '387-error-rightmost', description: '从右向左找唯一，或每找到一个就覆盖旧答案。', counterexampleInputId: 'multiple-unique', explanation: 'aabbcd 的 c、d 都唯一，但应返回 c 的下标 4，不是 d 的下标 5。' },
    { id: '387-error-slot', description: '返回 c-\'a\' 的字母槽号，误把字母编号当字符串下标。', counterexampleInputId: 'single', explanation: '单字符 z 的下标是 0，字母槽号却是 25。' },
    { id: '387-error-no-answer', description: '全部字符重复时直接返回 0，漏掉 -1。', counterexampleInputId: 'all-pairs', explanation: 'aabbcc 没有全串频次为 1 的字符，应返回 -1。' },
    { id: '387-error-premature', description: '第二趟还在改变 count，拿前缀频次冒充全串频次。', counterexampleInputId: 'default-level', explanation: '只有先完成全串统计才能确认 l 和 e 后续还出现；扫描答案阶段不再更新数组。' },
  ],
  testSuite: { version: PROBLEM_META['387'].testSuiteVersion, cases, wrongFixtures: [
    { id: '387-wrong-first-appearance', source: WRONG_FIRST_APPEARANCE_SOURCE, targetedCaseIds: ['same-only', 'all-pairs', 'default-level', 'last-unique'] },
    { id: '387-wrong-rightmost', source: WRONG_RIGHTMOST_SOURCE, targetedCaseIds: ['multiple-unique', 'many-distinct', 'first-and-last', 'late-two-unique'] },
  ] },
  visualization: { modelId: '387-two-pass-frequency', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson387;
