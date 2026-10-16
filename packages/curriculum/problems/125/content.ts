import { PROBLEM_META, ValidPalindromeInputSchema, expectedOutput, type Lesson, type ValidPalindromeInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_LETTERS_ONLY_SOURCE, WRONG_RAW_COMPARE_SOURCE, WRONG_REMOVE_ONLY_SOURCE,
} from './reference.js';

type Lesson125 = Extract<Lesson, { id: '125' }>;
type Case125 = Lesson125['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: ValidPalindromeInput }[] = [
  { id: 'skip-both-sides', title: '跳过标点并忽略大小写：A,b,a!', input: { s: 'A,b,a!' } },
  { id: 'digits-matter', title: '数字也要比较：1a2', input: { s: '1a2' } },
  { id: 'only-symbols', title: '只含空格和标点： . ', input: { s: ' . ' } },
];

function testCase(id: string, input: ValidPalindromeInput, coverage: string): Case125 {
  const parsed = ValidPalindromeInputSchema.parse(input);
  const expected = expectedOutput('125', parsed);
  if (expected.kind !== 'boolean') throw new Error('125 expected output must be boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case125[] = [
  testCase('single', { s: 'Z' }, '单字符没有配对比较；仍为回文。'),
  testCase('matching-pair', { s: 'aa' }, '两端相同的最短配对。'),
  testCase('different-pair', { s: 'ab' }, '两端字母不同应返回 false。'),
  testCase('case-fold', { s: 'Aa' }, '忽略 ASCII 英文字母大小写。'),
  testCase('skip-both-sides', demoInputs[0]!.input, '右端感叹号与中间两个逗号须跳过；A/a 忽略大小写。'),
  testCase('digits-matter', demoInputs[1]!.input, '数字也是有效字符：1 与 2 不相等；排除只保留字母的错误。'),
  testCase('matching-digits', { s: '1a1' }, '数字相等时与中间字母共同构成回文。'),
  testCase('only-symbols', demoInputs[2]!.input, '过滤后没有字母数字的非空输入应为 true。'),
  testCase('spaces-mixed', { s: '  Ab bA  ' }, '左右空格、内部空格与大小写一起处理。'),
  testCase('late-mismatch', { s: 'abca' }, '首尾 a 匹配后，内部 b/c 不匹配。'),
  testCase('punctuation-is-not-equality', { s: 'a!b?a' }, '标点不参与比较，但内部 a/b 不同。'),
  testCase('site-limit', { s: 'a'.repeat(9999) + 'A' }, '本站 10000 字符上限；真实 runner 必须处理完整输入。'),
];

export const lesson125 = {
  schemaVersion: 1,
  id: '125', slug: 'valid-palindrome', title: '验证回文串', order: 18,
  lessonVersion: PROBLEM_META['125'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J8'],
  objectives: [
    '正确使用 String.length()、charAt()、char、boolean 与返回值，区分 String 引用值和 char 基本值。',
    '只比较 ASCII 字母和数字，跳过其余字符，并忽略字母大小写。',
    '维护尚未核对的左右区间，解释为什么两端已确认相等后可以同时收缩。',
    '通过标点、大小写、数字和内部失配反例，使用真实 Java 修正错误解法。',
  ],
  source: { platform: 'LeetCode', number: 125, url: 'https://leetcode.com/problems/valid-palindrome/' },
  taskSemantics: '给定字符串 s，只保留英文字母与数字，比较时忽略英文字母大小写。若保留字符从左到右和从右到左读起来相同，返回 true，否则返回 false。删除后为空也满足回文定义。题意参考 LeetCode 125；本站题面、示例、推导与代码为原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接收 1—10000 个 U+0020—U+007E 可打印 ASCII 字符；不接收空原串或 Unicode 非 ASCII 字符。参考演示最多 30 字符，不缩小真实判题输入范围。', inputSchemaId: 'ValidPalindromeInputSchema' },
  steps: [
    { id: '125-syntax', kind: 'syntax', title: 'Java 前置 · String、char 与布尔方法', body: '方法头 public boolean isPalindrome(String s) 表示接收 String 引用值的副本，返回 boolean 基本值。字符串长度写 s.length()，第 i 个 UTF-16 代码单元写 s.charAt(i)，不能像 C 字符数组一样写 s[i]；本站只接收 ASCII，所以每个输入字符恰由一个 char 表示。Character.isLetterOrDigit(c) 检查字母或数字；Character.toLowerCase(c) 用于两端英文字母不分大小写的比较。两个 Character 调用得到或返回 char 基本值，并不会修改原 String 对象。', relatedIds: ['J1', 'J2', 'J4'] },
    { id: '125-understanding', kind: 'understanding', title: '原创题面 · 保留什么，忽略什么', body: '输入 "A,b,a!"：保留 A、b、a，按大小写不敏感得到 aba，从两端读都一样，所以输出 true。输入 "1a2"：保留 1、a、2，首尾数字不同，输出 false。只含空格和标点的非空输入 " . " 保留后为空，也输出 true。输出是布尔值；原字符串不需要被修改。', relatedIds: ['skip-both-sides', 'digits-matter', 'only-symbols'] },
    { id: '125-manual', kind: 'understanding', title: '手工模拟 · A,b,a!', body: 'left=0 指向 A，right=5 指向 !。先跳过右边 !，right=4 指向 a；比较小写后的 a/a，相同，left=1、right=3。左边逗号跳过到 2，右边逗号也跳过到 2；两指针相遇，所有真正需要配对的字符都已经确认相等，返回 true。区间高亮是尚未核对的原文本范围，并不表示其中每个标点都要比较。', relatedIds: ['skip-both-sides'] },
    { id: '125-derivation', kind: 'derivation', title: '推导 · 双指针保持未核对区间', body: '一种办法是先构建过滤且统一小写的新字符串，再反转比较；需要 O(n) 额外字符空间。双指针从原串两端向中间移动：每一侧先越过非字母数字；两端均有有效字符时，比较转成小写后的 char，不等立即 false，相同就同时前进。循环不变量：位于 [left,right] 之外的有效字符已经按镜像配对且相等，或者本来就应跳过；因此只需检查尚未处理的中间区间。指针相遇后返回 true。每个指针最多走 n 次，时间 O(n)，额外空间 O(1)。本站演示和少量计时不能证明复杂度。', relatedIds: ['skip-left', 'skip-right', 'compare'] },
    { id: '125-prediction', kind: 'prediction', title: '先预测 · 指针与比较', body: '先预测 right 从哪一个下标开始，再预测第一次有效字符配对是否相同，最后预测最终布尔返回值。检查点根据当前演示输入的不可变快照生成；切换输入会重新计算答案。预测只帮助思考参考算法，不是学生 Java 的运行结果。', relatedIds: ['125-start-right', '125-first-pair', '125-result'] },
    { id: '125-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '变量表显示 left、right 和比较结论；文本区间显示原字符串中尚未核对的范围，标点仍可见。每次跳过、比较和移动都与右侧参考 Java 代码高亮对应。所有显示读取同一不可变状态快照；后退只是选取旧快照，不逆向推断算法。这里不是学生代码的 JVM 单步调试；学生完整源码要另经真实 runner。', relatedIds: demoInputs.map(item => item.id) },
    { id: '125-guided', kind: 'guided-code', title: '引导编写 · 先跳过，再比较', body: '先在支架中补齐跳过条件与大小写比较；再自己组织两侧循环和返回；最后只保留方法骨架。中间填空属于静态练习，最终必须提交完整 Java 源码给真实 runner，通过本站测试才记录引导通过，不靠与参考源码字符串相同来判定。', relatedIds: ['125-guided-code'] },
    { id: '125-independent', kind: 'independent-code', title: '独立挑战 · 从反例修正', body: '独立草稿从未填答案的方法骨架开始，且与引导草稿分开保存。可以先写一个会失败的版本：直接比较原字符会错判 A,b,a!；只保留字母会错判 1a2；只去标点不忽略大小写会错判 Aa。逐一运行、查看真实 Java 反馈、修复后再提交本站全部测试。', relatedIds: ['skip-both-sides', 'digits-matter', 'case-fold'] },
    { id: '125-summary', kind: 'summary', title: '复盘 · 写出区间不变量', body: '请用自己的话说明：为什么 String.length() 带括号？charAt 返回什么？为什么数字不能略过？跳过标点与确认两端相等分别改变了什么状态？什么时候可以直接返回 false，什么时候返回 true？本站分别记录预测、提示、答案查看、引导通过与独立通过本站测试；通过本站测试不等于官方评测。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '628b70740dfa127d64e7f020d116d851ed7f2368daf86e44f7f6849904ea9f28', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: '125-hint-concept', level: 1, body: '先决定哪些字符参与判断。数字要保留；空格、标点跳过。有效字符才需要从两端成对比较。' },
    { id: '125-hint-invariant', level: 2, body: 'left/right 之外的有效字符已经镜像匹配。每次先分别跳过两端无效字符，再比较两个有效 char 的小写形式。' },
    { id: '125-hint-pseudocode', level: 3, body: 'left=0，right=s.length()-1；当 left<right，分别在 left<right 时跳过两侧非字母数字；若相遇就结束；若转小写后不等则 false；否则 left++、right--。循环结束返回 true。' },
  ],
  predictionChecks: [
    { id: '125-predict-right', prompt: 'A,b,a! 中 right 最初指向哪个下标？', answer: { kind: 'int', value: 5 }, explanation: '长度 6，末尾下标是 6-1=5，即感叹号。', checkpointId: '125-start-right' },
    { id: '125-predict-pair', prompt: 'A,b,a! 跳过右端感叹号后，A 与 a 忽略大小写是否相同？', answer: { kind: 'choice', optionId: 'same' }, options: [{ id: 'same', label: '相同' }, { id: 'different', label: '不同' }, { id: 'none', label: '没有可比字符' }], explanation: 'Character.toLowerCase 后两侧都是 a。', checkpointId: '125-first-pair' },
    { id: '125-predict-result', prompt: 'A,b,a! 最终返回什么？', answer: { kind: 'choice', optionId: 'palindrome' }, options: [{ id: 'palindrome', label: 'true' }, { id: 'different', label: 'false' }], explanation: '有效字符依次为 A、b、a，忽略大小写后为 aba。', checkpointId: '125-result' },
  ],
  guided: { id: '125-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '125-guided-conditions', instruction: '支架 1 / 3：补齐两侧跳过非字母数字的条件，并比较大小写归一后的有效字符。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && /* TODO：左侧不是字母数字 */) left++;
            while (left < right && /* TODO：右侧不是字母数字 */) right--;
            if (left >= right) break;
            if (/* TODO：两侧忽略大小写后不同 */) return false;
            left++;
            right--;
        }
        return true;
    }
}
` },
    { id: '125-guided-two-pointers', instruction: '支架 2 / 3：自己写出跳过、比较、移动和最终返回；注意数字也需要比较。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public boolean isPalindrome(String s) {
        // TODO：维护尚未核对的左右区间。
        throw new UnsupportedOperationException("请完成双指针");
    }
}
` },
    { id: '125-guided-whole', instruction: '支架 3 / 3：从方法骨架完成完整算法，提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '125-error-raw', description: '原样比较字符，既没有跳过标点，也没有忽略大小写。', counterexampleInputId: 'skip-both-sides', explanation: 'A,b,a! 的有效字符忽略大小写是 aba，必须返回 true。' },
    { id: '125-error-digits', description: '只保留英文字母，把数字也丢弃。', counterexampleInputId: 'digits-matter', explanation: '1a2 的数字 1 与 2 不相等，应返回 false，不能只剩下 a。' },
    { id: '125-error-case', description: '跳过标点后仍按原始大小写比较。', counterexampleInputId: 'case-fold', explanation: 'Aa 应视为 aa，因此应返回 true。' },
    { id: '125-error-inner', description: '只比较第一次首尾就返回 true。', counterexampleInputId: 'late-mismatch', explanation: 'abca 的首尾 a 相同，但中间 b 与 c 不同。' },
  ],
  testSuite: { version: PROBLEM_META['125'].testSuiteVersion, cases, wrongFixtures: [
    { id: '125-wrong-raw-compare', source: WRONG_RAW_COMPARE_SOURCE, targetedCaseIds: ['skip-both-sides', 'case-fold'] },
    { id: '125-wrong-letters-only', source: WRONG_LETTERS_ONLY_SOURCE, targetedCaseIds: ['digits-matter'] },
    { id: '125-wrong-remove-only', source: WRONG_REMOVE_ONLY_SOURCE, targetedCaseIds: ['case-fold', 'skip-both-sides'] },
  ] },
  visualization: { modelId: '125-ascii-two-pointers', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson125;
