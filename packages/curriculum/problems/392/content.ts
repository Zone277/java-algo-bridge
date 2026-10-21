import { IsSubsequenceInputSchema, PROBLEM_META, expectedOutput, type IsSubsequenceInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_REUSE_SOURCE, WRONG_SUBSTRING_SOURCE } from './reference.js';

type Lesson392 = Extract<Lesson, { id: '392' }>;
export const demoInputs: { id: string; title: string; input: IsSubsequenceInput }[] = [
  { id: 'gaps', title: '允许跳过：ace / abcde', input: { s: 'ace', t: 'abcde' } },
  { id: 'order', title: '不能换序：ca / abc', input: { s: 'ca', t: 'abc' } },
  { id: 'reuse', title: '不能复用：aa / ab', input: { s: 'aa', t: 'ab' } },
  { id: 'empty-s', title: '空串也是子序列', input: { s: '', t: 'abc' } },
];
function testCase(id: string, input: IsSubsequenceInput, coverage: string): Lesson392['testSuite']['cases'][number] {
  const parsed = IsSubsequenceInputSchema.parse(input);
  const expected = expectedOutput('392', parsed);
  if (expected.kind !== 'boolean') throw new Error('392 必须返回 boolean');
  return { id, input: parsed, expected, coverage };
}
const cases = [
  testCase('gaps', demoInputs[0]!.input, '匹配下标 0、2、4，不连续也合法；排除 contains 写法。'),
  testCase('order', demoInputs[1]!.input, '每种字符都存在，但相对次序错误。'),
  testCase('reuse', demoInputs[2]!.input, '两个 a 必须选不同位置；不能复用首个 a。'),
  testCase('empty-s', demoInputs[3]!.input, '空 s 不需任何字符，循环短路并返回 true。'),
  testCase('both-empty', { s: '', t: '' }, '两个空串合法，不能调用 charAt(0)。'),
  testCase('empty-t', { s: 'a', t: '' }, '非空 s 与空 t 返回 false。'),
  testCase('equal', { s: 'abc', t: 'abc' }, '完整相等，所有下标都选中。'),
  testCase('missing', { s: 'z', t: 'abc' }, '字符从未出现，扫描完整 t 后失败。'),
  testCase('duplicates', { s: 'aaa', t: 'abaca' }, '重复字符在不同位置按顺序匹配。'),
  testCase('longer-s', { s: 'abcd', t: 'abc' }, 's 比 t 长，前缀匹配不等于全部匹配。'),
  testCase('early-success', { s: 'ab', t: 'abzzzz' }, '匹配完成立即结束；不需要扫描 t 的后缀。'),
  testCase('last-position', { s: 'az', t: 'aaaaaz' }, '首次可用 a 应尽早选，最后一个 z 才完成。'),
  testCase('site-limit', { s: 'a'.repeat(99) + 'z', t: 'a'.repeat(9999) + 'z' }, 's 100 与 t 10000 的本站边界，真实 Java 处理全量输入。'),
  testCase('site-limit-false', { s: 'a'.repeat(100), t: 'a'.repeat(99) + 'b'.repeat(9901) }, '长输入只有 99 个 a，不能按字符存在性判断 100 次匹配。'),
];

export const lesson392 = {
  schemaVersion: 1, id: '392', slug: 'is-subsequence', title: '判断子序列', order: 27,
  lessonVersion: PROBLEM_META['392'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J8'],
  objectives: [
    '使用 String.length()、charAt()、char 比较、&& 短路与 boolean 返回值。',
    '区分保持相对顺序的子序列与第 3 题要求连续的子串。',
    '解释尽早匹配的贪心选择与双指针前缀不变量，防止复用字符位置。',
    '从独立骨架编写 Java，用乱序、重复和空串反例检查真实执行。',
  ],
  source: { platform: 'LeetCode', number: 392, url: 'https://leetcode.com/problems/is-subsequence/' },
  taskSemantics: '给出两个小写字母字符串 s、t。你可以从 t 删除零个或多个字符，但不能改变留下字符的顺序。能否使留下的字符串恰好等于 s？能则返回 true，否则 false。每个 t 位置最多使用一次，空 s 总能选出。题意参考 LeetCode 392；本站题面、例子、推导和代码原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题：s 长度 0—100、t 长度 0—10000，仅小写英文字母 a—z；空串合法。参考演示要求两串各最多 30 字符，超限不会截断。', inputSchemaId: 'IsSubsequenceInputSchema' },
  steps: [
    { id: '392-syntax', kind: 'syntax', title: 'Java 前置 · 两个 String 与布尔条件', body: 'public boolean isSubsequence(String s, String t) 接收两个 String 引用值的副本，返回 boolean 基本值；i、j 是 int 基本值。Java 参数总按值传递。s.length() 是方法调用，数组才写 nums.length；s.charAt(i) 得到 char，不能写 s[i]。char 是 UTF-16 代码单元，本站限定 a—z，所以一个输入字符对应一个 char。两个 char 用 == 比较，比较 String 内容则应使用 equals。&& 先算左边；左边 false 时不求右边。循环先保证 i、j 有效，再访问 charAt；空串和匹配完成后都不能越界读取。', relatedIds: ['J1', 'J2', 'J4'] },
    { id: '392-understanding', kind: 'understanding', title: '原创题面 · 保持顺序，可以有间隔', body: '把 t 看成按顺序摆放的字母卡片。s="ace"、t="abcde" 时保留下标 0、2、4，删除 b、d，输出 true。s="ca"、t="abc" 时无法先选 c 再向右选 a，输出 false。s="aa"、t="ab" 时只有一张 a 卡片，不可拿同一张两次，也为 false。输出只有 boolean；不需要修改输入。第 3 题的子串必须连续，本题子序列可以跳过字符，不能直接使用 contains。', relatedIds: ['gaps', 'order', 'reuse'] },
    { id: '392-manual', kind: 'understanding', title: '手算 · ace 与 abcde', body: '开始 i=0、j=0。a 对 a 相同，i=1，随后 j=1；c 对 b 不同，仅 j=2；c 对 c 相同，i=2、j=3；e 对 d 不同，仅 j=4；e 对 e 相同，i=3、j=5。此时 i 等于 s 长度，循环结束并返回 true。实际选择的 t 下标是 [0,2,4]，已扫描前缀 abcde 不是“全部都被选中”的子串。', relatedIds: ['gaps'] },
    { id: '392-derivation', kind: 'derivation', title: '推导 · 为什么用最早可用字符', body: '为 s 的下一个字符找 t 中尚未扫描部分的第一次出现。任何可行解若选了更晚的同字符，换成这个更早位置后，其后续选择仍在它右侧，所以不会失去解。循环边界不变量：i 是 t[0..j) 能匹配的最长 s 前缀长度，已选位置严格递增，s[0..i) 与这些位置逐一相等。相等时增加 i，表示接受当前 t 位置；无论相等与否都增加 j，避免重复使用。结束时只有 i==s.length() 才是成功；仅有字符都出现过并不足够。时间 O(|s|+|t|)，更紧地说扫描 t 至多 |t| 次；参考算法额外空间 O(1)，教学位置表不属于 Java 解法的额外存储。少量运行时间不证明复杂度。', relatedIds: ['check-loop', 'match', 'advance-j'] },
    { id: '392-prediction', kind: 'prediction', title: '先预测 · 能进入循环吗，最后能匹配吗', body: '第一个检查点判断 while 条件，第二个检查点判断最终返回值；都根据当前演示输入的快照计算。切换到空 s 观察 && 短路：第一次条件就是 false，但最终返回 true。切换到乱序或重复输入预测失败原因。预测是静态教学互动，不是执行学生 Java。', relatedIds: ['392-predict-first', '392-predict-final'] },
    { id: '392-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '变量表、两条前缀高亮、实际匹配位置表与代码高亮读取同一不可变快照。s 高亮是已匹配前缀；t 高亮是已比较前缀，包含跳过的字符，不能当作实际选择的连续窗口。位置表用 s 下标映射 t 下标展示非连续选择；字符集合仅显示前缀出现过的不同字符。两条字符串是逻辑教学视图，不承诺 JVM 对象身份或布局。下一步、上一步、播放、暂停和重置复用同一播放器；后退直接恢复旧快照。这里不跟踪学生编辑代码，真实 Java 反馈在执行区单独显示。', relatedIds: demoInputs.map(item => item.id) },
    { id: '392-guided', kind: 'guided-code', title: '引导编写 · 不等时谁前进', body: '先补循环边界、匹配条件和返回表达式；再组织两指针更新顺序；最后从骨架写完整方法。支架检查属于静态练习，最终提交完整 Java 到真实 runner；通过本站测试才记录引导通过，不以填入字符串等于参考答案代替执行。', relatedIds: ['392-guided-code'] },
    { id: '392-independent', kind: 'independent-code', title: '独立编码 · 用反例修正', body: '独立模式从空方法骨架开始，与引导草稿分别保存。先尝试 t.contains(s)，在 ace/abcde 上观察真实错误；修正后再用 ca/abc 检查次序，用 aa/ab 检查位置复用，用空 s 检查越界。运行自己的源码，修正后提交全部本站测试，再刷新检查草稿和通过记录。', relatedIds: ['gaps', 'order', 'reuse', 'empty-s'] },
    { id: '392-summary', kind: 'summary', title: '复盘 · 前缀不变量与真实反馈', body: '说明为什么 i 只在相等时增加、j 每轮都增加；为什么选最早匹配不丢解；为什么空 s 返回 true；为什么 contains 和“字符出现过”都不能解决本题。本站分别保存预测、提示、答案查看、引导通过、独立通过本站测试和草稿。参考动画不是学生运行轨迹，通过本站测试也不代表 LeetCode 官方评测。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' }, independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'aa462c8005e427b5350203fc8472e183fe5e868416fd9e4f342473760a21d3b4', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: '392-hint-concept', level: 1, body: '从左往右扫描 t。需要的 s 字符没遇到，就跳过 t 当前字符，不改变需要的字符。' },
    { id: '392-hint-invariant', level: 2, body: 'i 是已匹配 s 前缀长度，j 是下一待扫描 t 下标。匹配相等才 i++，每次都 j++，位置只向右移动。' },
    { id: '392-hint-pseudocode', level: 3, body: 'i=0、j=0；当 i<s.length() 且 j<t.length()：若 charAt(i)==charAt(j) 则 i++，之后总是 j++。最后返回 i==s.length()。' },
  ],
  predictionChecks: [
    { id: '392-predict-first', prompt: 's=ace、t=abcde，第一次 while 条件是什么？', answer: { kind: 'text', value: 'true' }, explanation: '两串均非空，i=j=0 都在有效范围。', checkpointId: 'first-condition' },
    { id: '392-predict-final', prompt: 's=ace、t=abcde，最终返回什么？', answer: { kind: 'text', value: 'true' }, explanation: '选取 t 的 0、2、4 号位置即可得到整个 s。', checkpointId: 'final-result' },
  ],
  guided: { id: '392-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '392-guided-conditions', instruction: '支架 1 / 3：补循环边界、字符比较与最终返回；思考相等时才移动哪一个指针。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0, j = 0;
        while (/* TODO：两个下标都能访问 */) {
            if (/* TODO：当前字符相同 */) i++;
            j++;
        }
        return /* TODO：是否匹配了整个 s */;
    }
}
` },
    { id: '392-guided-loop', instruction: '支架 2 / 3：自己组织循环与更新。空串不能越界，j 每轮前进，不可复用下标。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0, j = 0;
        // TODO：匹配最长 s 前缀，最终返回是否匹配完整。
        throw new UnsupportedOperationException("请补充双指针");
    }
}
` },
    { id: '392-guided-whole', instruction: '支架 3 / 3：从方法骨架写完整 Java，再提交真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '392-error-contiguous', description: '把子序列当成连续子串，调用 t.contains(s)。', counterexampleInputId: 'gaps', explanation: 'ace 在 abcde 中不连续但顺序正确，因此仍返回 true。' },
    { id: '392-error-order', description: '只检查每个字符是否存在，忽略顺序。', counterexampleInputId: 'order', explanation: 'c 后面没有 a；不能回头选更早的位置。' },
    { id: '392-error-reuse', description: '每次从 t 开头找字符，复用同一个匹配位置。', counterexampleInputId: 'reuse', explanation: 'aa 需要两个不同的 a 位置，ab 只有一个。' },
    { id: '392-error-empty', description: '先读取 charAt，再检查字符串是否结束。', counterexampleInputId: 'both-empty', explanation: '空串没有下标 0，应先检查边界；正确答案 true。' },
    { id: '392-error-prefix', description: '扫描完 t 就返回 true，不检查 s 是否全部匹配。', counterexampleInputId: 'longer-s', explanation: 'abcd 与 abc 只匹配前三字符，还缺 d，所以必须 false。' },
  ],
  testSuite: { version: PROBLEM_META['392'].testSuiteVersion, cases, wrongFixtures: [
    { id: '392-wrong-substring', source: WRONG_SUBSTRING_SOURCE, targetedCaseIds: ['gaps', 'duplicates'] },
    { id: '392-wrong-reuse', source: WRONG_REUSE_SOURCE, targetedCaseIds: ['reuse', 'order', 'site-limit-false'] },
  ] },
  visualization: { modelId: '392-greedy-prefix', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson392;
