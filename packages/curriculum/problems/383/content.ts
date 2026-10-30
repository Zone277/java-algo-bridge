import { PROBLEM_META, RansomNoteInputSchema, expectedOutput, type Lesson, type RansomNoteInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_DISTINCT_ONLY_SOURCE, WRONG_SUBSTRING_SOURCE,
} from './reference.js';

type Lesson383 = Extract<Lesson, { id: '383' }>;
type Case383 = Lesson383['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RansomNoteInput }[] = [
  { id: 'enough-repeats', title: '杂志有两张 a：aa / aab', input: { ransomNote: 'aa', magazine: 'aab' } },
  { id: 'one-a-short', title: '第二张 a 不够：aa / ab', input: { ransomNote: 'aa', magazine: 'ab' } },
  { id: 'different-letter', title: '连第一张卡都没有：b / a', input: { ransomNote: 'b', magazine: 'a' } },
];

function testCase(id: string, input: RansomNoteInput, coverage: string): Case383 {
  const parsed = RansomNoteInputSchema.parse(input);
  const expected = expectedOutput('383', parsed);
  if (expected.kind !== 'boolean') throw new Error('383 期望输出应为 boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case383[] = [
  testCase('single-yes', { ransomNote: 'a', magazine: 'a' }, '最短输入，一张相同字母卡可使用一次。'),
  testCase('single-no', { ransomNote: 'a', magazine: 'b' }, '最短输入，所需字母完全缺失。'),
  testCase('magazine-extra', { ransomNote: 'a', magazine: 'ab' }, '杂志可有多余字母，无须把杂志全部用完。'),
  testCase('enough-repeats', { ransomNote: 'aa', magazine: 'aab' }, '重复所需字母恰有两份，使用后计数归零。'),
  testCase('one-a-short', { ransomNote: 'aa', magazine: 'ab' }, '只出现一种 a，但需求有两张，排除只比较字母集合的错解。'),
  testCase('reordered', { ransomNote: 'abc', magazine: 'cba' }, '字母可以重排，不要求所需串是杂志的连续子串。'),
  testCase('interleaved', { ransomNote: 'abc', magazine: 'axbxc' }, '允许跳过多余字母并以任意顺序选字母卡。'),
  testCase('last-letter-missing', { ransomNote: 'abz', magazine: 'abc' }, '前缀消耗成功，最后一个所需字母缺失时返回 false。'),
  testCase('after-consumption-missing', { ransomNote: 'aba', magazine: 'ab' }, '第二次索取 a 时库存已用尽，不能重复使用同一张卡。'),
  testCase('all-z', { ransomNote: 'zzzz', magazine: 'zzzz' }, '最高字母槽 25 及多次扣减，防止数组下标越界或漏掉末槽。'),
  testCase('site-limit-true', { ransomNote: 'a'.repeat(10000), magazine: 'a'.repeat(10000) }, '本站双串各 10000 字符上限，完整计数与消耗。'),
  testCase('site-limit-short-one', { ransomNote: 'a'.repeat(10000), magazine: 'a'.repeat(9999) + 'b' }, '本站上限，所需 a 恰缺一张，不能只比较总长度。'),
];

const guidedSlot = `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        int[] available = new int[26];
        for (int i = 0; i < magazine.length(); i++) {
            available[/* TODO：magazine.charAt(i) 对应的 0..25 槽号 */]++;
        }
        for (int i = 0; i < ransomNote.length(); i++) {
            int slot = ransomNote.charAt(i) - 'a';
            if (available[slot] == 0) return false;
            available[slot]--;
        }
        return true;
    }
}
`;

const guidedConsume = `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        int[] available = new int[26];
        for (int i = 0; i < magazine.length(); i++) {
            available[magazine.charAt(i) - 'a']++;
        }
        // TODO：逐个索取 ransomNote 的字母；先判断库存，足够再扣一张。
        // TODO：一旦缺货返回 false；全部索取成功返回 true。
        throw new UnsupportedOperationException("请完成消耗阶段");
    }
}
`;

export const lesson383 = {
  schemaVersion: 1, id: '383', slug: 'ransom-note', title: '赎金信', order: 43,
  lessonVersion: PROBLEM_META['383'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J4', 'J8'],
  objectives: [
    '用 String.length()、charAt(i)、char 与 int[26] 正确表示小写字母频次，并区分 String 引用值与 char/int 基本值。',
    '解释“每张字母卡只能用一次”的消耗不变量，拒绝只比较字母种类或子串位置。',
    '先预测库存和结论，再用真实 Java 验证重复、重排、缺货与本站上限。',
  ],
  source: { platform: 'LeetCode', number: 383, url: 'https://leetcode.com/problems/ransom-note/' },
  taskSemantics: '给定只含小写英文字母的 ransomNote（需要拼出的文本）和 magazine（可剪取字母的文本）。magazine 每个位置上的字母最多取用一次，可以任意重排，也可以留下多余字母。若能拼出全部 ransomNote，返回 true；只要有一种字母数量不足，就返回 false。题意参考 LeetCode 383；题面、例子和讲解为本站原创表达，无官方合作。',
  siteLimits: { description: '本站真实判题接受每串 1—10000 个小写 ASCII 字母 a—z；一般 Unicode、大写、数字和空串不属于本站本题输入。参考状态演示每串最多 30 个字符，真实 Java 判题仍支持完整上限。', inputSchemaId: 'RansomNoteInputSchema' },
  steps: [
    { id: '383-syntax', kind: 'syntax', title: 'Java 前置 · String、charAt 与 int[26]', body: '签名 public boolean canConstruct(String ransomNote, String magazine) 返回 boolean 基本值。两个参数各接收 String 引用值的副本；Java 方法参数按值传递，没有复制 String 对象。ransomNote.length() 是字符串的方法，数组 available.length 才是字段；字符使用 charAt(i)，不能写 ransomNote[i]。charAt 返回 char 基本值。本站只允许小写 ASCII a—z，因此 char 减去 \'a\' 得到整数 0..25，不能直接套用于一般 Unicode。int[] available = new int[26] 新建数组对象，其 int 元素自动为 0；局部 int 变量仍须显式赋值。', relatedIds: ['J1', 'J2', 'J3', 'J4'] },
    { id: '383-understand', kind: 'understanding', title: '理解任务 · 数量和顺序分开', body: 'ransomNote="aa"、magazine="aab"：杂志提供两张 a，拼完后还剩 b，返回 true。改成 magazine="ab"：字母 a 虽出现过，但只有一张，第二个 a 无法拼出，返回 false。ransomNote="abc"、magazine="cba" 仍是 true，因为选出的卡片可重新排列，不能要求连续子串。输出是 boolean，不返回拼出的文本。', relatedIds: ['enough-repeats', 'one-a-short', 'reordered'] },
    { id: '383-manual', kind: 'understanding', title: '手工模拟 · aa / aab', body: '先令 26 个可用槽为 0。读杂志 a、a、b 后：a=2、b=1。再逐个读需求：第一个 a 检查库存 2>0，然后扣成 1；第二个 a 检查库存 1>0，再扣成 0。需求已全部满足，返回 true。若杂志改成 ab，第二个 a 检查时库存为 0，应立刻返回 false，不能把原来那张 a 再用一次。', relatedIds: ['enough-repeats', 'one-a-short', 'first-stock', 'final-result'] },
    { id: '383-derive', kind: 'derivation', title: '推导 · 建库存，再逐张取用', body: '第一趟扫描 magazine：处理前 i 个字符后，available[k] 等于杂志前缀中第 k 个字母的出现次数。第二趟扫描 ransomNote：处理前 i 个需求字符后，available[k] 等于整个杂志中该字母的次数减去已成功取用的次数，且不会为负。每次先看对应槽是否为 0，若是便知道无法拼出，直接 false；否则减一。全部取用完成即 true。两趟时间 O(|magazine|+|ransomNote|)，额外计数空间 O(26)。本站固定 a—z，26 是常数；少量运行时间并不能证明复杂度。', relatedIds: ['add-magazine-char', 'check-available', 'consume-char'] },
    { id: '383-predict', kind: 'prediction', title: '先预测，再揭示 · 首张库存与最后结果', body: '根据当前演示输入，先预测第一张所需字母在完整杂志里有几张，再预测最终能否拼出。默认 aa/aab 的首张 a 库存是 2，结论 true；切到 aa/ab 时首张库存 1，结论 false。答案取自当前输入的状态快照；预测是教学互动，不是学生 Java 的运行结果。', relatedIds: ['first-stock', 'final-result'] },
    { id: '383-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '杂志已计数前缀、需求已消耗前缀、available[26]、变量表、解释与参考代码高亮都读取同一份不可变快照。下一步、上一步、播放、暂停、重置及输入切换使用公共播放器；后退恢复原先库存。文本窗口是教学视图，不代表 String 被修改或 JVM 物理布局；available 是独立数组对象。学生源码另交真实 runner 编译执行，这里不会播放学生代码。', relatedIds: demoInputs.map(item => item.id) },
    { id: '383-guided', kind: 'guided-code', title: '引导编写 · 字符槽、消耗、完整方法', body: '支架 1 补杂志字符的 0..25 槽号，支架 2 自行写检查与消耗，支架 3 从方法骨架实现全部算法。支架仅提供静态帮助；最终提交完整 Java 至真实 runner，通过本站测试才记录引导通过，不比较填空字符串与参考答案。', relatedIds: ['383-guided-code'] },
    { id: '383-independent', kind: 'independent-code', title: '独立挑战 · 失败后用反例定位', body: '独立草稿从方法骨架开始，与引导草稿分开保存。先用 aa/ab 检查是否误用 Set，用 abc/cba 检查是否误用 contains，用 a/ab 检查是否错误地要求用完杂志。若编译失败，检查 charAt、引号和分号；若运行异常，检查槽号范围；若超时，检查循环下标是否前进。源码更改后旧结果只对应旧源码哈希，须重新提交真实 Java。', relatedIds: ['one-a-short', 'reordered', 'magazine-extra', 'J8'] },
    { id: '383-summary', kind: 'summary', title: '复盘 · 解释两段前缀不变量', body: '请解释 available 在杂志扫描时和需求扫描时各表示什么，以及为什么每次必须先检查、再减一。哪个例子能击败“只看字母种类”？哪个例子能击败“必须是连续子串”？本站分别记录提示、答案查看、引导通过和独立通过本站测试；刷新恢复草稿与进度。动画播放不等于掌握，本站通过不等于官方评测。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'c100c6d427e9810b40310614a5c98c7af9db6586b98b13eb382b4e9500141015',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '383-hint-concept', level: 1, body: '题目问每个所需字母有足够的张数。顺序可以调整，多余字母可以不取。' },
    { id: '383-hint-invariant', level: 2, body: '先把杂志所有字母计入 26 个槽。处理 i 个需求字符后，槽中只剩未使用的张数；库存为 0 时不能再取。' },
    { id: '383-hint-pseudocode', level: 3, body: 'new int[26]；遍历 magazine，对 available[magazine.charAt(i)-\'a\']++；遍历 ransomNote，令 slot=charAt(i)-\'a\'，若 available[slot]==0 则 false，否则 available[slot]--；结束返回 true。参考 Java 答案另行折叠。' },
  ],
  predictionChecks: [
    { id: '383-predict-stock', checkpointId: 'first-stock', prompt: '默认演示 aa / aab：取第一张 a 之前，可用 a 有几张？', answer: { kind: 'int', value: 2 }, explanation: '完整杂志 aab 中 a 出现两次，所以第一张需求卡取用前库存为 2。' },
    { id: '383-predict-result', checkpointId: 'final-result', prompt: '默认演示 aa / aab：最终能拼出全部需求吗？', answer: { kind: 'choice', optionId: 'yes' }, options: [{ id: 'yes', label: '可以（true）' }, { id: 'no', label: '不可以（false）' }], explanation: '两张 a 都成功取用，方法返回 true。' },
  ],
  guided: { id: '383-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '383-guided-slot', instruction: '支架 1 / 3：把 magazine.charAt(i) 映射到 0..25，再计入库存。', checkKind: 'static-practice', scaffoldSource: guidedSlot },
    { id: '383-guided-consume', instruction: '支架 2 / 3：每个需求字符先查库存；缺货 false，足够则扣一张；全部完成 true。', checkKind: 'static-practice', scaffoldSource: guidedConsume },
    { id: '383-guided-whole', instruction: '支架 3 / 3：仅从方法骨架完成两趟算法，并提交完整源码到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '383-error-distinct', description: '只比较出现过哪些字母，忽略重复字符需要多张卡。', counterexampleInputId: 'one-a-short', explanation: 'aa/ab 的两串都出现 a，但杂志只有一张 a，必须 false。' },
    { id: '383-error-substring', description: '把需求误当成杂志的连续子串。', counterexampleInputId: 'reordered', explanation: 'abc/cba 可重排字母卡，应该 true；magazine.contains(ransomNote) 会错。' },
    { id: '383-error-no-extra', description: '要求杂志所有字母都恰好用完。', counterexampleInputId: 'magazine-extra', explanation: 'a/ab 可以只用 a 而留下 b，应该 true。' },
    { id: '383-error-negative', description: '库存扣到负数后仍继续，或只看字符是否出现过。', counterexampleInputId: 'after-consumption-missing', explanation: 'aba/ab 中第二次取 a 时库存为 0，应立即 false。' },
  ],
  testSuite: { version: PROBLEM_META['383'].testSuiteVersion, cases, wrongFixtures: [
    { id: '383-wrong-substring', source: WRONG_SUBSTRING_SOURCE, targetedCaseIds: ['reordered', 'interleaved'] },
    { id: '383-wrong-distinct-only', source: WRONG_DISTINCT_ONLY_SOURCE, targetedCaseIds: ['one-a-short', 'after-consumption-missing', 'site-limit-short-one'] },
  ] },
  visualization: { modelId: '383-consume-counts', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson383;
