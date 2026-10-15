import { PROBLEM_META, ValidAnagramInputSchema, expectedOutput, type Lesson, type ValidAnagramInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_DISTINCT_LETTERS_SOURCE,
  WRONG_LENGTH_ONLY_SOURCE,
  WRONG_SAME_POSITION_SOURCE,
} from './reference.js';

type Lesson242 = Extract<Lesson, { id: '242' }>;
type Case242 = Lesson242['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: ValidAnagramInput }[] = [
  { id: 'reordered-repeats', title: '重复字母重新排列：aab / aba', input: { s: 'aab', t: 'aba' } },
  { id: 'different-counts', title: '字母种类相同但次数不同：aab / abb', input: { s: 'aab', t: 'abb' } },
  { id: 'different-length', title: '长度不同：ab / abc', input: { s: 'ab', t: 'abc' } },
];

function testCase(id: string, input: ValidAnagramInput, coverage: string): Case242 {
  const parsed = ValidAnagramInputSchema.parse(input);
  const expected = expectedOutput('242', parsed);
  if (expected.kind !== 'boolean') throw new Error('242 expected output must be boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case242[] = [
  testCase('same-single', { s: 'a', t: 'a' }, '最短等长且相同，单个计数先加再减后归零。'),
  testCase('different-single', { s: 'a', t: 'b' }, '最短等长但字母不同，不可仅检查长度。'),
  testCase('reordered-pair', { s: 'ab', t: 'ba' }, '位置不同仍是异位词，不可逐位比较。'),
  testCase('same-word', { s: 'algorithm', t: 'algorithm' }, '完全相同的字符串也满足每种字符次数相同。'),
  testCase('reordered-repeats', { s: 'aab', t: 'aba' }, '重复字母且顺序改变，应接受相同频次。'),
  testCase('different-counts', { s: 'aab', t: 'abb' }, '相同字母种类但频次不同，排除仅比较字符集合的错误。'),
  testCase('different-length', { s: 'ab', t: 'abc' }, '长度不等可立即返回 false。'),
  testCase('same-sum', { s: 'ad', t: 'bc' }, '字符整数和同为 197，但频次不同，不能以字符码求和判定。'),
  testCase('reversed-word', { s: 'listen', t: 'silent' }, '六个不同字符重排，覆盖多个计数槽。'),
  testCase('late-difference', { s: 'abcdefghijklmnopqrstuvwxyz', t: 'abcdefghijklmnopqrstuvwxyy' }, '末尾 z 换成 y，检测扫描末尾的频次差。'),
  testCase('all-same', { s: 'zzzz', t: 'zzzz' }, '重复 z 的大于 1 的计数归零，覆盖最后一个字母槽。'),
  testCase('site-limit-reorder', { s: 'a'.repeat(9999) + 'b', t: 'b' + 'a'.repeat(9999) }, '本站 10000 字符上限；最后的 b 被移到开头，真实 runner 必须完整处理输入。'),
];

export const lesson242 = {
  schemaVersion: 1,
  id: '242',
  slug: 'valid-anagram',
  title: '有效的字母异位词',
  order: 16,
  lessonVersion: PROBLEM_META['242'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J4', 'J8'],
  objectives: [
    '正确使用 String.length()、charAt(i)、char 与 int[]，分清 String 引用和 char 基本值。',
    '用 26 个计数槽说明“每个字母的出现次数相同”，而不是只比较长度或字母种类。',
    '手工跟踪一加一减的频次变化，并解释长度提前判定和最终全零检查。',
    '用真实 Java 提交验证重排、重复字母、长度不同和最大输入等反例。',
  ],
  source: { platform: 'LeetCode', number: 242, url: 'https://leetcode.com/problems/valid-anagram/' },
  taskSemantics: '给定两个只含小写英文字母的非空字符串 s 和 t。若可以只调整 s 中字符的顺序，使它与 t 完全相同，就返回 true；否则返回 false。字母不能增加或丢弃。题面、例子与讲解为本站原创表达。',
  siteLimits: { description: '本站真实判题接受每串 1 到 10000 个小写英文字母 a-z；参考状态演示每串最多 30 个字符。', inputSchemaId: 'ValidAnagramInputSchema' },
  steps: [
    {
      id: '242-syntax', kind: 'syntax', title: 'Java 前置 · String、charAt 与 int[26]',
      body: '方法签名是 public boolean isAnagram(String s, String t)。String 是引用类型，方法接收的是引用值的副本；s.length() 是方法调用，与数组的 count.length 不同。s.charAt(i) 返回一个 char 基本值，不能写成 s[i]。本题输入只含小写 ASCII 字母，所以 char 减去 \'a\' 可得到整数下标 0 到 25；这不是任意 Unicode 文本的通用字符算法。int[] count = new int[26] 创建数组对象，26 个 int 元素自动初始化为 0。',
      relatedIds: ['J1', 'J2', 'J3', 'J4'],
    },
    {
      id: '242-understanding', kind: 'understanding', title: '理解任务 · 次数比位置重要',
      body: '例如 s="aab"、t="aba"，两个 a 和一个 b 都保留，只是顺序换了，所以输出 true。s="aab"、t="abb" 虽然都只使用 a、b 两种字母，前者有两个 a，后者有两个 b，应输出 false。输出是 boolean，不返回重排后的字符串。\n\n手工模拟 aab / aba：初始所有计数为 0；读第 0 对 a/a 后 a 槽回到 0；读第 1 对 a/b 后 a=1、b=-1；读第 2 对 b/a 后 a=0、b=0。全部 26 槽最终为零，所以 true。',
      relatedIds: ['reordered-repeats', 'different-counts'],
    },
    {
      id: '242-derivation', kind: 'derivation', title: '推导 · 一加一减抵消频次',
      body: '可以把两个字符串分别排序再比较，但排序做了额外工作。本站限定 a-z，使用固定 26 槽更直接：长度不同立刻 false；扫描每个 i，把 s.charAt(i) 对应槽加一，把 t.charAt(i) 对应槽减一。处理前 i 对字符后，每个槽的值恰是 s 的已读前缀出现次数减去 t 的已读前缀出现次数。最后 26 槽全零当且仅当每个字母总次数相同。\n\n时间 O(n+26)，额外计数空间 O(26)，其中 n 为字符串长度。演示中计数槽编号 0..25 对应 a..z；小用例执行时间本身不能证明渐进复杂度。',
      relatedIds: ['init-count', 'increase-s', 'decrease-t', 'check-count'],
    },
    {
      id: '242-prediction', kind: 'prediction', title: '先预测 · 长度、局部计数与结论',
      body: '先判断当前输入的两个长度是否相同。若等长，再预测第一对字符处理后，s 首字母对应计数槽的值；最后预测返回 true 还是 false。问题与答案由本次输入的参考模型快照生成，作答后才揭示。预测是教学互动，不是对学生 Java 的真实执行。',
      relatedIds: ['242-length', '242-first-net', '242-result'],
    },
    {
      id: '242-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '演示中的 count 数组按 a..z 显示 26 个频次差。高亮的 s、t 文本是便于阅读的字符串值，不承诺 String 对象的 JVM 存储布局或对象身份。count 是单独数组对象；charAt(i) 的结果是 char 基本值。变量表、计数槽、解释和代码高亮来自同一份不可变快照，上一步恢复原快照。学生源码需另行经过真实 runner。',
      relatedIds: demoInputs.map(item => item.id),
    },
    {
      id: '242-guided', kind: 'guided-code', title: '引导编写 · 从字母槽到完整方法',
      body: '第一段补出字符到槽号的运算及增减；第二段自行完成长度守卫、扫描和全零检查；第三段只从方法骨架编写。练习支架是静态帮助，最终需提交完整 Java 到真实 runner，通过本站测试才记录引导通过。',
      relatedIds: ['242-guided-code'],
    },
    {
      id: '242-independent', kind: 'independent-code', title: '独立挑战 · 先找反例再修正',
      body: '独立草稿从方法骨架开始并单独保存。先尝试 aab/abb、ab/ba、ab/abc、ad/bc；若 aab/abb 错判 true，检查是否只比较字母种类；若 ab/ba 错判 false，检查是否误用 equals；若 ab/abc 错判 true，检查是否缺少长度判定。运行失败后修正，再提交本站全部用例。',
      relatedIds: ['different-counts', 'reordered-pair', 'different-length', 'same-sum'],
    },
    {
      id: '242-summary', kind: 'summary', title: '复盘 · 写出每个槽的含义',
      body: '请解释：String.length() 与数组 length 形式为何不同？charAt 返回什么？为什么这里减去 \'a\' 有效？处理前 i 对字符后 count[k] 表示什么？为什么全部为零才返回 true？\n\n本站分别记录预测、提示使用、查看答案、引导通过和独立通过本站测试。参考演示不会播放学生代码，本站通过也不是官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '052625ffe88bd969bfe603b215bc4cdce0238c2d310c53c814de53c7dc17ae70',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '242-hint-concept', level: 1, body: '位置顺序可以变；对每个字母，要比较的是出现次数。长度不同已经足以判 false。' },
    { id: '242-hint-invariant', level: 2, body: 'count[k] 记录已读 s 前缀中第 k 个字母次数减去已读 t 前缀中该字母次数。本站只有 a-z，可以使用 26 槽。' },
    { id: '242-hint-pseudocode', level: 3, body: '若长度不同返回 false；新建 int[26]；对每个 i 做 count[s.charAt(i)-\'a\']++ 和 count[t.charAt(i)-\'a\']--；遍历 26 槽，只要非零就返回 false；否则返回 true。' },
  ],
  predictionChecks: [
    { id: '242-predict-length', prompt: 'aab / aba：两个字符串长度相同吗？', answer: { kind: 'choice', optionId: 'same' }, options: [{ id: 'same', label: '相同' }, { id: 'different', label: '不同' }], explanation: '两个长度都是 3，因此继续建立计数数组。', checkpointId: '242-length' },
    { id: '242-predict-first-net', prompt: 'aab / aba：第一对 a/a 都处理后，a 槽是多少？', answer: { kind: 'int', value: 0 }, explanation: '同一槽先 +1 再 -1，回到 0。', checkpointId: '242-first-net' },
    { id: '242-predict-result', prompt: 'aab / aba：最终返回 true 还是 false？', answer: { kind: 'choice', optionId: 'anagram' }, options: [{ id: 'anagram', label: 'true' }, { id: 'different', label: 'false' }], explanation: '每个字母的出现次数相同，全部计数归零。', checkpointId: '242-result' },
  ],
  guided: {
    id: '242-guided-code', finalCheck: 'real-java-submit', stages: [
      { id: '242-guided-slots', instruction: '支架 1 / 3：补出 s、t 字符到 0..25 的槽号，以及加一和减一。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[/* TODO：s.charAt(i) 对应的槽 */]++;
            count[/* TODO：t.charAt(i) 对应的槽 */]--;
        }
        for (int value : count) if (value != 0) return false;
        return true;
    }
}
` },
      { id: '242-guided-check', instruction: '支架 2 / 3：自行完成长度守卫、计数循环和最终全零判定。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isAnagram(String s, String t) {
        // TODO：长度不同立即返回；使用 26 槽抵消两个字符串的频次。
        throw new UnsupportedOperationException("请完成频次比较");
    }
}
` },
      { id: '242-guided-whole', instruction: '支架 3 / 3：从方法骨架完成整个算法，最终提交完整 Java 源码。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '242-error-length-only', description: '两个字符串等长就返回 true。', counterexampleInputId: 'different-single', explanation: 'a 与 b 都只有一个字符，但字母不同。长度相同只是继续检查的必要条件。' },
    { id: '242-error-distinct-only', description: '只比较两个字符串中出现过哪些字母，忽略每个字母的次数。', counterexampleInputId: 'different-counts', explanation: 'aab 与 abb 都含 a、b，但计数分别是 2/1 和 1/2。' },
    { id: '242-error-position', description: '逐位置比较或直接使用 s.equals(t)。', counterexampleInputId: 'reordered-pair', explanation: 'ab 与 ba 的顺序不同，但各含一个 a 和一个 b，应为 true。' },
    { id: '242-error-sum', description: '只比较所有字符编码之和。', counterexampleInputId: 'same-sum', explanation: 'ad 与 bc 的字符码总和相同，但四个字母频次完全不同。' },
  ],
  testSuite: {
    version: PROBLEM_META['242'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '242-wrong-length-only', source: WRONG_LENGTH_ONLY_SOURCE, targetedCaseIds: ['different-single', 'different-counts', 'same-sum'] },
      { id: '242-wrong-distinct-letters', source: WRONG_DISTINCT_LETTERS_SOURCE, targetedCaseIds: ['different-counts'] },
      { id: '242-wrong-same-position', source: WRONG_SAME_POSITION_SOURCE, targetedCaseIds: ['reordered-pair', 'reordered-repeats', 'reversed-word'] },
    ],
  },
  visualization: { modelId: '242-frequency-count', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson242;
