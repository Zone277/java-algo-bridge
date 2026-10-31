import { PalindromeNumberInputSchema, PROBLEM_META, expectedOutput, type Lesson, type PalindromeNumberInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, GUARDED_SCAFFOLD_SOURCE, HALF_SCAFFOLD_SOURCE,
  REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_EVEN_ONLY_SOURCE, WRONG_IGNORE_SIGN_SOURCE,
} from './reference.js';

type Lesson9 = Extract<Lesson, { id: '9' }>;
type Case9 = Lesson9['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: PalindromeNumberInput }[] = [
  { id: '9-demo-odd', title: '奇数位回文：12321', input: { x: 12321 } },
  { id: '9-demo-even', title: '偶数位回文：1221', input: { x: 1221 } },
  { id: '9-demo-negative', title: '负数：-121', input: { x: -121 } },
  { id: '9-demo-trailing-zero', title: '非零末位 0：10', input: { x: 10 } },
  { id: '9-demo-zero', title: '边界：0', input: { x: 0 } },
  { id: '9-demo-nonpalindrome', title: '左右不相同：123', input: { x: 123 } },
];

function testCase(id: string, x: number, coverage: string): Case9 {
  const input = PalindromeNumberInputSchema.parse({ x });
  const expected = expectedOutput('9', input);
  if (expected.kind !== 'boolean') throw new Error('9 可信期望必须是 boolean');
  return { id, input, expected, coverage };
}

const cases: Case9[] = [
  testCase('9-case-min', -2147483648, 'Java int 最小值；先排除负数，不能对它直接取绝对值为 int。'),
  testCase('9-case-negative-symmetric', -121, '负数数字部分对称，但负号使整个数不是回文；抓忽略符号的错解。'),
  testCase('9-case-negative-one', -1, '单个负数也必须返回 false。'),
  testCase('9-case-zero', 0, '0 是一位回文，末位 0 守卫必须排除这个例外。'),
  testCase('9-case-one', 1, '普通一位正数，不进入反转循环时仍返回 true。'),
  testCase('9-case-ten', 10, '非零且末位为 0，首位不可能为 0，应提前返回 false。'),
  testCase('9-case-eleven', 11, '最小的两位重复数字，左右半段直接相等。'),
  testCase('9-case-one-oh-one', 101, '奇数位回文，中间 0 必须在比较前从 reversed 中去掉。'),
  testCase('9-case-one-twenty-one', 121, '奇数位回文，抓只比较两个半段完全相等的错解。'),
  testCase('9-case-one-twenty-three', 123, '奇数位非回文，去掉中间位后左右仍不相等。'),
  testCase('9-case-thousand-one', 1001, '偶数位且中间有两个 0，检查十进制位处理。'),
  testCase('9-case-twelve-twenty-one', 1221, '常规偶数位回文，停在 x==reversed 分支。'),
  testCase('9-case-twelve-three-two-one', 12321, '常规奇数位回文，停在 x==reversed/10 分支。'),
  testCase('9-case-ten-thousand-one', 10001, '中间连续 0 的奇数位回文，不能把 0 位省略。'),
  testCase('9-case-large-palindrome', 2147447412, '接近 int 上界的十位回文，反转后半段仍安全。'),
  testCase('9-case-max', 2147483647, 'Java int 最大值不是回文；检查大数下的半段比较。'),
];

export const lesson9 = {
  schemaVersion: 1, id: '9', slug: 'palindrome-number', title: '回文数', order: 44,
  lessonVersion: PROBLEM_META['9'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J8'],
  objectives: [
    '读懂 public boolean isPalindrome(int x)、int 基本值、% 取个位、/ 10 舍弃个位和 boolean 返回值。',
    '说明负数与非零末位 0 为什么能先排除，0 为什么是例外。',
    '维护 x 是未处理左半段、reversed 是已取右半段反序的不变量，正确处理奇偶位数。',
    '先预测当前参考快照，再从骨架编写 Java 并用真实 runner 验证边界反例。',
  ],
  source: { platform: 'LeetCode', number: 9, url: 'https://leetcode.com/problems/palindrome-number/' },
  taskSemantics: '给定一个 Java int 整数 x，判断它的十进制写法是否从左向右和从右向左读都一样。负号也属于写法的一部分，因此 -121 返回 false；0、121、1221 返回 true，10 返回 false。方法直接返回 boolean，不打印文字。本题题面和示例由本站原创表述。',
  siteLimits: { description: '本站真实判题接受完整 Java int 范围 -2147483648—2147483647。参考位条最多展示十个十进制位，是教学辅助视图，不表示代码创建数组或 JVM 内存。', inputSchemaId: 'PalindromeNumberInputSchema' },
  steps: [
    {
      id: '9-step-syntax', kind: 'syntax', title: 'Java 前置 · 方法、int、% 与整数除法',
      body: 'public boolean isPalindrome(int x) 是一个接收 int、返回 boolean 的方法。调用方法时复制 x 的数值，不会创建数字对象；本题的 x、reversed、digit 都是 int 基本值变量。return true 或 return false 才把结果交回调用处；打印 PASS 不算返回结果。Java int 是有符号 32 位，范围 -2147483648…2147483647。\n\n对于非负数，x % 10 得到个位，x /= 10 丢弃个位：123 % 10 是 3，123 / 10 是 12。reversed * 10 + digit 把新取到的个位接到反序数末端。&& 表示“且”，|| 表示“或”，两者遇到足以确定结果时短路。while (x > reversed) 会反复执行，直到右半段的反序数赶上左半段。',
      relatedIds: ['J1', 'J2', '9-case-zero', '9-case-min'],
    },
    {
      id: '9-step-understanding', kind: 'understanding', title: '理解问题 · 写出几个数的左右读法',
      body: '12321 从两侧读都依次是 1、2、3、2、1，应返回 {"kind":"boolean","value":true}；123 的反向读法为 321，应返回 false。-121 的负号只在左边，所以返回 false。10 的末位 0 无法与非零首位匹配；0 只有一位，仍是回文。\n\n手工模拟 12321：起始 x=12321、reversed=0。取 1 后变为 x=1232、reversed=1；取 2 后为 123 与 12；取 3 后为 12 与 123。此时停止，去掉 reversed 中间的 3，123/10=12，与 x 相等。对于 1221，取两位后 x=12、reversed=12，直接相等。',
      relatedIds: ['9-case-twelve-three-two-one', '9-case-twelve-twenty-one', '9-case-one-twenty-three', '9-case-negative-symmetric', '9-case-ten'],
    },
    {
      id: '9-step-derivation', kind: 'derivation', title: '推导 · 只反转后半段',
      body: '先排除负数；再排除非零且以 0 结尾的数，因为普通正整数的首位不能是 0。随后令 reversed=0。循环不变量：x 保留尚未取出的左侧十进制位，reversed 是已经从原数右侧取出的位的反序；两者合起来仍对应原数的各位。每轮先用 x%10 取个位，把它接到 reversed 末端，再用 x/=10 删去 x 的这一位。每轮减少一位，所以循环终止。\n\n当 x<=reversed，右侧已经包含至少一半位数。若原数位数为偶数，要求 x==reversed；若为奇数，reversed 多包含中间位，要求 x==reversed/10。两个条件由 || 合并。反转的只有半段；对于十位 Java int，循环最多取约六位，因此 reversed 仍远小于 int 上限，不会像反转完整十位 int 那样有溢出风险。按位数 d 计时间 O(d)、额外空间 O(1)；固定 Java int 的 d 有常数上界，本站短时测试不证明复杂度。',
      relatedIds: ['check-negative', 'check-trailing-zero', 'check-half', 'read-digit', 'append-digit', 'drop-digit', 'return-result'],
    },
    {
      id: '9-step-prediction', kind: 'prediction', title: '先预测 · 负数守卫和最终返回',
      body: '在揭示快照前，先判断当前 x 是否因负数直接返回，再判断最终 boolean。切换到 -121、10、0、12321 时检查两问的差别；预测答案随所选输入生成，预测正确不等于学生 Java 已运行。',
      relatedIds: ['9-predict-negative', '9-predict-result'],
    },
    {
      id: '9-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。逐步看 x、reversed、digit、循环条件和十进制位条：位条只是原始输入的辅助视图，不是 Java 代码中的数组。所有变量与位条由同一不可变快照渲染，回退时恢复旧快照。代码高亮对应固定参考解法；学生编辑的 Java 走独立的真实 runner，演示不解释学生源码。',
      relatedIds: demoInputs.map(demo => demo.id),
    },
    {
      id: '9-step-guided', kind: 'guided-code', title: '引导编写 · 守卫、半段反转、完整方法',
      body: '先补负数和末位 0 守卫，再补逐位取数与奇偶位比较，最后从方法骨架重写。支架是可编辑练习，不能靠填入字符是否等于参考答案判定通过；最终需把完整 Solution.java 交给受限 Docker 的真实 Java runner，通过本站测试才记录引导通过。',
      relatedIds: ['9-guided', '9-case-ten', '9-case-one-twenty-one'],
    },
    {
      id: '9-step-independent', kind: 'independent-code', title: '独立挑战 · 从骨架修正边界错误',
      body: '独立模式只给方法骨架，草稿与引导模式分开保存。先用 -121、0、10、121 测试自己的方案；若真实运行失败，从结构化反馈找到反例，修改源码并重跑。旧源码的通过记录不能套在新草稿上。',
      relatedIds: ['9-case-negative-symmetric', '9-case-zero', '9-case-ten', '9-case-one-twenty-one'],
    },
    {
      id: '9-step-summary', kind: 'summary', title: '复盘 · 奇偶两种终止形态',
      body: '能解释为什么 0 不被末位 0 守卫排除、为何负数不能忽略符号、为何奇数位需要去掉中间位、为何只反转一半可避免 int 溢出吗？x 和 reversed 都是 int 基本值，不是对象引用。预测、提示、查看答案、引导通过、独立通过本站测试分别记录；本站结果不是 LeetCode 官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'f7848bed3d0293c88b6f06ee3f022b9800c02a3b923d34243cae4ce8913c4111', algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '9-hint-concept', level: 1, body: '先问负数能否对称，再看非零末位 0。无需把整个数反转；只比较左右两半。' },
    { id: '9-hint-invariant', level: 2, body: '让 x 保存未处理的左半段，reversed 保存已取右半段的反序。每轮用 x%10 取一位，reversed*10+digit 接一位，x/=10 丢一位，直到 x<=reversed。' },
    { id: '9-hint-pseudocode', level: 3, body: '若 x<0 或 (x!=0 且 x%10==0)，返回 false；reversed 从 0 开始，while(x>reversed) 取个位、接到 reversed、x/=10；最后返回 x==reversed || x==reversed/10。' },
  ],
  predictionChecks: [
    { id: '9-predict-negative', prompt: '默认 x=12321 会因为 x<0 直接返回吗？', answer: { kind: 'choice', optionId: 'continue' }, options: [{ id: 'early', label: '直接返回 false' }, { id: 'continue', label: '继续检查和反转' }], explanation: '12321 是非负数，继续执行。输入切换后答案由当前快照重算。', checkpointId: 'negative-guard' },
    { id: '9-predict-result', prompt: '默认 x=12321 最终返回 true 还是 false？', answer: { kind: 'choice', optionId: 'true' }, options: [{ id: 'true', label: 'true：回文数' }, { id: 'false', label: 'false：不是回文数' }], explanation: '停止时 x=12、reversed=123；去掉中间位后相等。输入切换后答案由当前快照重算。', checkpointId: 'final-result' },
  ],
  guided: { id: '9-guided', finalCheck: 'real-java-submit', stages: [
    { id: '9-guided-guards', instruction: '支架 1 / 3：补上负数守卫和非零末位 0 守卫，半段反转已经给出。', checkKind: 'static-practice', scaffoldSource: GUARDED_SCAFFOLD_SOURCE },
    { id: '9-guided-half', instruction: '支架 2 / 3：守卫已给出，自己写逐位取数、半段反转与奇偶位比较。', checkKind: 'static-practice', scaffoldSource: HALF_SCAFFOLD_SOURCE },
    { id: '9-guided-whole', instruction: '支架 3 / 3：从方法骨架完成全部 Java，提交真实 runner 的本站测试。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '9-error-ignore-sign', description: '把负号删除后只检查数字部分。', counterexampleInputId: '9-case-negative-symmetric', explanation: '-121 的数字部分虽对称，但负号只出现在左边，应返回 false。' },
    { id: '9-error-zero', description: '把所有末位为 0 的数都直接判为 false。', counterexampleInputId: '9-case-zero', explanation: '0 只有一位，反向读仍是 0；守卫必须加 x!=0。' },
    { id: '9-error-middle', description: '停止循环后只检查 x==reversed，不考虑奇数位的中间数字。', counterexampleInputId: '9-case-one-twenty-one', explanation: '121 停止时 x=1、reversed=12；去掉 reversed 的中间 2，1==12/10 才成立。' },
    { id: '9-error-full-reverse', description: '用 int 反转所有十位数，可能在中途超过 int 上限。', counterexampleInputId: '9-case-max', explanation: '2147483647 的完整反序为 7463847412，超过 int 最大值；只反转约一半即可避开这一风险。' },
  ],
  testSuite: { version: PROBLEM_META['9'].testSuiteVersion, cases, wrongFixtures: [
    { id: '9-wrong-ignore-sign', source: WRONG_IGNORE_SIGN_SOURCE, targetedCaseIds: ['9-case-negative-symmetric', '9-case-negative-one'] },
    { id: '9-wrong-even-only', source: WRONG_EVEN_ONLY_SOURCE, targetedCaseIds: ['9-case-one-oh-one', '9-case-one-twenty-one', '9-case-twelve-three-two-one'] },
  ] },
  visualization: { modelId: '9-reverse-half-decimal-digits', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson9;

export { WRONG_EVEN_ONLY_SOURCE, WRONG_IGNORE_SIGN_SOURCE } from './reference.js';
