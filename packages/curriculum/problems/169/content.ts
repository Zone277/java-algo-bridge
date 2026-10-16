import {
  MajorityElementInputSchema,
  PROBLEM_META,
  expectedOutput,
  type Lesson,
  type MajorityElementInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_FIRST_VALUE_SOURCE,
  WRONG_MIDDLE_INDEX_SOURCE,
} from './reference.js';

type Lesson169 = Extract<Lesson, { id: '169' }>;
type Case169 = Lesson169['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: MajorityElementInput }[] = [
  { id: 'demo-change', title: '候选切换：[1, 2, 2]', input: { nums: [1, 2, 2] } },
  { id: 'demo-cancel', title: '多次抵消：[2, 1, 2, 1, 2]', input: { nums: [2, 1, 2, 1, 2] } },
  { id: 'demo-negative', title: '负数多数：[-2, -1, -2, -2]', input: { nums: [-2, -1, -2, -2] } },
];

function testCase(id: string, input: MajorityElementInput, coverage: string): Case169 {
  const parsed = MajorityElementInputSchema.parse(input);
  const expected = expectedOutput('169', parsed);
  if (expected.kind !== 'int') throw new Error('169 expected output must be int');
  return { id, input: parsed, expected, coverage };
}

const cases: Case169[] = [
  testCase('case-single', { nums: [7] }, '单元素必为严格多数；覆盖初始化与一次循环。'),
  testCase('case-all-same', { nums: [5, 5, 5, 5] }, '全相同值，只增加票数而不切换候选。'),
  testCase('case-first-minority', { nums: [1, 2, 2] }, '首项不是多数；抵消至零后必须改选候选。'),
  testCase('case-middle-minority', { nums: [1, 1, 2, 1, 1] }, '数组未承诺有序，中间位置也可能不是多数。'),
  testCase('case-odd-cancellation', { nums: [2, 1, 2, 1, 2] }, '交错抵消后仍剩一张多数票。'),
  testCase('case-even-cancellation', { nums: [3, 4, 3, 4, 3, 3] }, '偶数长度下严格过半是超过 n/2，而非等于。'),
  testCase('case-negative', { nums: [-2, -1, -2, -2] }, '负数参与相等比较，不能把值当数组下标。'),
  testCase('case-zero', { nums: [0, 1, 0, 2, 0] }, '零是普通元素，不等于“还没有候选”的标记。'),
  testCase('case-late-majority', { nums: [7, 8, 9, 9, 9, 9, 9] }, '多数值直到后缀才出现，检验重新选候选。'),
  testCase('case-alternating', { nums: [4, 5, 4, 5, 4, 5, 4] }, '相邻抵消反复出现，不能在 votes=0 时提前返回。'),
  testCase('case-int-range', { nums: [1000000000, -1000000000, -1000000000, -1000000000] }, '本站数值边界与负数多数。'),
  testCase('case-tail-minority', { nums: [-3, 8, 8, 8, -3, 8] }, '尾部有少数项，最终仍返回累计多数。'),
];

export const lesson169 = {
  schemaVersion: 1,
  id: '169',
  slug: 'majority-element',
  title: '多数元素',
  order: 19,
  lessonVersion: PROBLEM_META['169'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '能写出 public int majorityElement(int[] nums)，区分 int 值、int[] 对象与方法参数中的引用值。',
    '用“不相等的两个值成对抵消”推导 candidate/votes 更新，解释为什么必须有严格过半保证。',
    '根据真实中间状态预测候选切换，并用未排序反例排除首项或中间项捷径。',
    '从方法骨架写完整 Java 解法，经真实编译执行和本站用例检验。',
  ],
  source: { platform: 'LeetCode', number: 169, url: 'https://leetcode.com/problems/majority-element/' },
  taskSemantics: '给定非空 Java int 数组，保证恰有一个数出现次数严格大于数组长度的一半，返回这个数。输入没有排序保证；方法返回一个 int，不要求改写数组。题面、例子和讲解均为本站原创表达。',
  siteLimits: { description: '本站真实判题接受 1 到 10000 个元素，元素值在 -1000000000 到 1000000000 之间，且必须确实存在严格过半的值；参考演示最多 30 项。', inputSchemaId: 'MajorityElementInputSchema' },
  steps: [
    {
      id: '169-step-syntax', kind: 'syntax', title: 'Java 前置 · int[]、length、for 与局部 int',
      body: `目标方法是 public int majorityElement(int[] nums)。和 C 数组遍历相似，Java 用 nums.length 读取数组长度，不加括号；for (int i = 0; i < nums.length; i++) 只在范围内访问 nums[i]。candidate 和 votes 都是 int 基本类型局部变量，赋值会复制数值；nums 则保存数组对象的引用值。调用方法时 Java 按值复制这个引用值，不复制整份数组。比较两个 int 值用 ==。

本题保证输入非空，所以参考解法可以先读 nums[0]；若没有这个保证，先读首项会引发运行异常。局部变量必须明确初始化，不能把数组元素默认值的规则误套到局部变量上。`,
      relatedIds: ['J1', 'J2', 'J3'],
    },
    {
      id: '169-step-understanding', kind: 'understanding', title: '理解任务 · 严格过半不是“出现最多”',
      body: `长度为 5 时，至少出现 3 次才叫多数；长度为 6 时，至少出现 4 次。题目保证这样的数存在，所以无需处理“没有多数”的输入。[1,2,2] 中 2 出现两次，返回 2；[1,1,2,1,1] 中中间位置是 2，却必须返回 1。数组没有排序要求，不能直接取中间值。

手工模拟 [1,2,2]：起始 candidate=1、votes=0；读 1 时重新选 1，票数到 1；读 2 时用不同值抵消，票数到 0；读最后的 2 时改选 2，票数到 1；返回 2。`,
      relatedIds: ['case-first-minority', 'case-middle-minority'],
    },
    {
      id: '169-step-derivation', kind: 'derivation', title: '算法推导 · 不同值两两抵消',
      body: `直接统计每个值出现次数可用 Map 做到线性时间，但还要随不同值数量增加额外空间。因为真正的多数值超过一半，即使把每个非多数值都与它配成一对抵消，它仍会剩下。于是只保存一个 candidate 和尚未抵消的 votes：票数为 0 时选当前值；当前值相同则加一，不同则减一。

每处理完一个前缀，都可把已读值分成若干对“不相等的值”和 votes 个尚未配对的 candidate。前缀候选本身不一定已过半；只在完整输入有严格多数这个前提下，最终 candidate 必为答案。参考方法一次扫描，时间 O(n)、额外空间 O(1)；小样本实测不能证明渐进复杂度。`,
      relatedIds: ['check-empty', 'choose-candidate', 'compare-value', 'add-vote', 'remove-vote'],
    },
    {
      id: '169-step-prediction', kind: 'prediction', title: '先预测 · 候选如何改变',
      body: '切换演示输入后先预测两处状态：第一次在零票时选出的 candidate，以及完整扫描后返回的 candidate。对 [1,2,2]，第一次是 1，最后是 2；对 [-2,-1,-2,-2]，两处均为 -2。检查读取当前输入的参考模型快照；预测题不是 Java 编译或判题。',
      relatedIds: ['169-predict-first', '169-predict-final'],
    },
    {
      id: '169-step-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '数组位置、candidate、votes、比较结果、说明与参考代码高亮均读取同一不可变快照。先看“票数是否为零”，再看是否改选，最后看相等比较后的加票或抵消。前进和后退只选择快照，既不重新运行 Java，也不解释学生源码；学生代码必须单独提交给真实 runner。',
      relatedIds: ['demo-change', 'demo-cancel', 'demo-negative'],
    },
    {
      id: '169-step-guided', kind: 'guided-code', title: '引导编写 · 补齐抵消规则',
      body: '第一段补 candidate 重新赋值及加减票；第二段自己写完整循环；第三段只留下方法骨架。支架用于练习，不以填入的字符串是否等于参考源码判通过。最终提交完整 Solution.java 到真实 Java runner，全部本站用例通过才记录引导通过。',
      relatedIds: ['169-guided'],
    },
    {
      id: '169-step-independent', kind: 'independent-code', title: '独立挑战 · 找首项和中间项反例',
      body: '独立草稿与引导草稿分别保存，起始没有参考实现。先用 [1,2,2] 排除“直接返回首项”，再用 [1,1,2,1,1] 排除“返回中间项”；交错输入检查 votes 为 0 后是否继续扫描。运行失败时看真实编译诊断或错误用例，修改后重新提交本站测试。',
      relatedIds: ['case-first-minority', 'case-middle-minority', 'case-alternating'],
    },
    {
      id: '169-step-summary', kind: 'summary', title: '复盘 · 说清多数保证的作用',
      body: `请解释：为什么票数归零时可以重新选候选？为什么“当前前缀的候选”不一定已经过半？为何最终返回值依赖输入存在严格多数的保证？Java 的 int candidate 与 int[] nums 各保存什么？

本站分别记录预测完成、提示使用、查看答案、引导通过与独立通过本站测试；播放演示不表示学生 Java 已执行，通过本站测试不表示通过 LeetCode 官方评测。`,
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '0d7f0512f469417efbd67060ca0fb14237d78e99b1575ce4b1454f022c476c61',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '169-hint-concept', level: 1, body: '想象把不同的两个数划成一对并一起删去。严格过半的值不可能被全部划掉。' },
    { id: '169-hint-invariant', level: 2, body: '处理一个前缀后，已读元素可以分为异值配对与 votes 个剩余 candidate。票数为零时，下一项就是新候选。' },
    { id: '169-hint-pseudocode', level: 3, body: 'candidate 先放 nums[0]，votes=0；遍历每个值：若 votes==0，candidate=当前值；若相等则 votes++，否则 votes--；最后返回 candidate。' },
  ],
  predictionChecks: [
    {
      id: '169-predict-first', prompt: '输入 [1,2,2]，处理第一项时 votes==0，选出的 candidate 是多少？',
      answer: { kind: 'int', value: 1 }, explanation: '首项为 1，零票时先把它选为候选；选中并不保证它最终获胜。', checkpointId: 'first-candidate',
    },
    {
      id: '169-predict-final', prompt: '输入 [1,2,2]，两个不同值抵消后，最终返回的 candidate 是多少？',
      answer: { kind: 'int', value: 2 }, explanation: '前两项抵消为零票，最后的 2 成为新候选并留下 1 票。', checkpointId: 'final-candidate',
    },
  ],
  guided: {
    id: '169-guided', finalCheck: 'real-java-submit',
    stages: [
      {
        id: '169-guided-update', instruction: '支架 1 / 3：补齐选候选、同值加票和异值减票。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int majorityElement(int[] nums) {
        int candidate = nums[0];
        int votes = 0;
        for (int i = 0; i < nums.length; i++) {
            if (votes == 0) candidate = /* TODO：当前值 */;
            if (nums[i] == candidate) {
                /* TODO：加一票 */
            } else {
                /* TODO：抵消一票 */
            }
        }
        return candidate;
    }
}
`,
      },
      {
        id: '169-guided-loop', instruction: '支架 2 / 3：保留初始化，自己写完整扫描和抵消规则。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int majorityElement(int[] nums) {
        int candidate = nums[0];
        int votes = 0;
        // TODO：扫描数组；零票改选，相同加票，不同抵消。
        throw new UnsupportedOperationException("请补全扫描与返回");
    }
}
`,
      },
      {
        id: '169-guided-whole', instruction: '支架 3 / 3：从方法骨架写完，再把完整 Java 提交给真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  commonErrors: [
    { id: '169-error-first', description: '直接把 nums[0] 当作多数元素。', counterexampleInputId: 'case-first-minority', explanation: '[1,2,2] 的首项 1 只出现一次；多数是 2。必须扫描并处理候选切换。' },
    { id: '169-error-middle', description: '把未排序数组的中间位置当作答案。', counterexampleInputId: 'case-middle-minority', explanation: '[1,1,2,1,1] 的中间值 2 不是多数；取中位位置需要排序前提。' },
    { id: '169-error-zero-votes', description: 'votes 刚降为 0 就提前返回或停止。', counterexampleInputId: 'case-first-minority', explanation: '[1,2,2] 前两项抵消后仍有下一项，应在下一轮重新选候选。' },
    { id: '169-error-majority-definition', description: '把出现 n/2 次当成严格多数。', counterexampleInputId: 'case-even-cancellation', explanation: 'n=6 必须至少出现 4 次；出现 3 次只占一半。本站只接受确实存在严格多数的输入。' },
  ],
  testSuite: {
    version: PROBLEM_META['169'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '169-wrong-first-value', source: WRONG_FIRST_VALUE_SOURCE, targetedCaseIds: ['case-first-minority', 'case-late-majority'] },
      { id: '169-wrong-middle-index', source: WRONG_MIDDLE_INDEX_SOURCE, targetedCaseIds: ['case-middle-minority', 'case-first-minority'] },
    ],
  },
  visualization: {
    modelId: '169-vote-cancellation', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson169;
