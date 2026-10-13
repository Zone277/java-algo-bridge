import {
  ContainsDuplicateInputSchema,
  PROBLEM_META,
  expectedOutput,
  type ContainsDuplicateInput,
  type Lesson,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_ADD_BEFORE_CHECK_SOURCE,
  WRONG_ADJACENT_ONLY_SOURCE,
} from './reference.js';

type Lesson217 = Extract<Lesson, { id: '217' }>;
type Case217 = Lesson217['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: ContainsDuplicateInput }[] = [
  { id: 'demo-non-adjacent', title: '隔位重复：[4, 1, 4]', input: { nums: [4, 1, 4] } },
  { id: 'demo-all-unique', title: '全部不同：[2, 7, 9, 3]', input: { nums: [2, 7, 9, 3] } },
  { id: 'demo-negative-zero', title: '负数与零：[-1, 0, 2, -1]', input: { nums: [-1, 0, 2, -1] } },
];

function testCase(id: string, input: ContainsDuplicateInput, coverage: string): Case217 {
  const parsed = ContainsDuplicateInputSchema.parse(input);
  const expected = expectedOutput('217', parsed);
  if (expected.kind !== 'boolean') throw new Error('217 expected output must be boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case217[] = [
  testCase('case-single', { nums: [7] }, '最小长度；一个元素不可能与其他位置重复。'),
  testCase('case-two-unique', { nums: [7, -7] }, '两个不同元素，检查扫描结束后的 false。'),
  testCase('case-adjacent-duplicate', { nums: [5, 5] }, '相邻重复，第二次检查应立即返回 true。'),
  testCase('case-non-adjacent-duplicate', { nums: [4, 1, 4] }, '重复值不相邻，排除只比较相邻位置的错误。'),
  testCase('case-zero-duplicate', { nums: [0, 3, 0] }, '零和其他 int 一样参与 HashSet 判重。'),
  testCase('case-negative-duplicate', { nums: [-8, 2, 6, -8] }, '负数重复，排除把值当数组下标或只处理非负数。'),
  testCase('case-all-unique', { nums: [1, 2, 3, 4, 5, 6] }, '所有值不同，必须遍历完整数组并返回 false。'),
  testCase('case-late-duplicate', { nums: [9, 8, 7, 6, 5, 4, 9] }, '重复直到末尾才出现，防止循环少检查最后一项。'),
  testCase('case-many-repeats', { nums: [2, 2, 2, 2] }, '同一值多次出现；第一个重复点即可提前结束。'),
  testCase('case-int-boundaries', { nums: [-2147483648, 0, 2147483647] }, 'Java int 两端值且全部不同，验证不依赖窄值域。'),
  testCase('case-max-duplicate', { nums: [2147483647, -1, 2147483647] }, 'Integer.MAX_VALUE 非相邻重复，验证泛型装箱后的相等判定。'),
  testCase('case-duplicate-one', { nums: [1, 0, -1, 1] }, '重复值 1 与循环下标相同过，排除错误检查 seen.contains(i)。'),
];

export const lesson217 = {
  schemaVersion: 1,
  id: '217',
  slug: 'contains-duplicate',
  title: '存在重复元素',
  order: 13,
  lessonVersion: PROBLEM_META['217'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: [
    '能声明 Set<Integer> 与 HashSet<Integer>，并说明 int 放入泛型集合时会装箱为 Integer。',
    '用“seen 只保存已经扫描过的值”描述不变量，理解为什么必须先 contains 再 add。',
    '区分数组 nums 的引用、元素的 int 基本值和 HashSet 对象；方法参数按值接收 nums 的引用值。',
    '从反例识别相邻比较、检查下标、循环内过早返回 false 等错误，并用真实 Java runner 验证。',
  ],
  source: { platform: 'LeetCode', number: 217, url: 'https://leetcode.com/problems/contains-duplicate/' },
  taskSemantics: '给定一个至少含一个 Java int 的数组。只要存在两个不同下标 i、j 且 nums[i] 等于 nums[j]，返回 true；若所有值各不相同，返回 false。方法不需要修改输入数组。题面、示例与讲解为本站原创表达。',
  siteLimits: { description: '本站真实判题接受 1 到 10000 个 Java int；参考状态演示为了可读性最多展示 30 项。', inputSchemaId: 'ContainsDuplicateInputSchema' },
  steps: [
    {
      id: '217-step-syntax', kind: 'syntax', title: 'Java 前置 · int[]、length 与 HashSet',
      body: '方法签名是 public boolean containsDuplicate(int[] nums)。boolean 只能返回 true 或 false；数组长度读取 nums.length，没有括号。nums 是引用类型变量，数组元素是 int 基本值；调用方法时 Java 按值复制 nums 中的引用值，并没有复制整份数组。\n\n集合写作 Set<Integer> seen = new HashSet<>();。接口 Set 说明“只保留不同成员”，HashSet 提供实现。泛型不能写 Set<int>，放入 int 时 Java 自动装箱为 Integer。seen.contains(value) 只查询成员，seen.add(value) 才加入成员；本题不依赖 add 的返回值。',
      relatedIds: ['J1', 'J2', 'J3', 'J5'],
    },
    {
      id: '217-step-understanding', kind: 'understanding', title: '理解任务 · 找相同值，不找相邻值',
      body: '重复要求“值相同且位置不同”，两个位置不必相邻。例如 [4,1,4] 中下标 0 和 2 都是 4，所以答案为 true；[4,1,3] 每个值只出现一次，所以答案为 false。\n\n手工模拟 [4,1,4]：开始 seen={}；检查 4 未出现，加入后 seen={4}；检查 1 未出现，加入后 seen={4,1}；再检查 4 时已经出现，立即返回 true。输入只决定返回值，参考解法不会改写 nums。',
      relatedIds: ['case-non-adjacent-duplicate', 'case-all-unique'],
    },
    {
      id: '217-step-derivation', kind: 'derivation', title: '算法推导 · 只与过去比较一次',
      body: '直接办法是让每个位置与后面的所有位置比较，最坏要做平方级数量的比较。更直接的不变量是：准备检查下标 i 时，seen 恰好包含 nums[0..i-1] 的不同值。若 seen 已含 nums[i]，旧位置与 i 构成重复；否则加入当前值后，不变量对下一个 i 继续成立。\n\n在 HashSet 常见的平均常数时间查询假设下，总体期望时间 O(n)，额外空间 O(n)。真实运行的小用例只能验证结果，不能单凭耗时证明复杂度。',
      relatedIds: ['init-set', 'check-seen', 'add-current'],
    },
    {
      id: '217-step-prediction', kind: 'prediction', title: '先预测 · 查询发生在加入之前',
      body: '选择演示输入后，先回答两个动态检查：第一个元素检查时是否已经在 seen 中；算法结束点会返回 true 还是 false。答案由当前输入的不可变状态快照生成，静态预测不是 Java 编译或执行。对 [4,1,4]，第一次检查前集合为空；第三次检查 4 时才命中。',
      relatedIds: ['217-predict-membership', '217-predict-result'],
    },
    {
      id: '217-step-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '演示逐项呈现 nums、当前 i 和 seen。seen 使用键到 true 的表格表达集合成员：键存在表示值已经扫描过，true 只是成员标记。所有变量、数组指针、集合与高亮代码都读取同一份不可变快照；上一步恢复历史快照，不会反推逆操作。学生 Java 源码不会改变这条参考轨迹，它必须另走真实 runner。',
      relatedIds: ['demo-non-adjacent', 'demo-all-unique', 'demo-negative-zero'],
    },
    {
      id: '217-step-guided', kind: 'guided-code', title: '引导编写 · 从查询顺序到完整方法',
      body: '第一段补齐 contains 与 add 的对象；第二段自行组织 HashSet 和循环；第三段从方法骨架完成全部代码。支架检查只帮助组织语句，不通过源码字符串与参考答案比较来判定正确。最终提交完整 Solution.java 到真实 Java runner，通过本站测试后才记录引导通过。',
      relatedIds: ['217-guided'],
    },
    {
      id: '217-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例定位失败',
      body: '独立草稿从方法骨架开始并与引导草稿分别保存。先运行 [7]、[4,1,4]、[-8,2,6,-8] 和全不同数组；若单元素返回 true，检查是否先 add 再 contains；若隔位重复返回 false，检查是否只比较相邻元素；若所有输入都很早返回 false，检查 false 是否误写在循环里。修正后提交全部本站测试。',
      relatedIds: ['case-single', 'case-non-adjacent-duplicate', 'case-negative-duplicate'],
    },
    {
      id: '217-step-summary', kind: 'summary', title: '复盘 · 说清 seen 的时间边界',
      body: '请用自己的话回答：Set<Integer> 为什么不能写 Set<int>？检查下标 i 时 seen 包含哪些值？为什么当前值必须先查后加？为什么发现一个重复值就能提前返回 true？为什么 false 必须等扫描结束？\n\n本站分别记录预测完成、提示使用、查看答案、引导通过和独立通过本站测试。播放参考动画不表示学生代码执行过，通过本站测试也不代表 LeetCode 官方评测结果。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'f9eaa8c78c1ce1cc860e21d79203b79a6d3a76c1c7cb92e76cf3e7e37159eb61',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '217-hint-concept', level: 1, body: '扫描到当前值时，只需要知道它是否在更早的位置出现过。准备一个集合保存“已经看过”的值。' },
    { id: '217-hint-invariant', level: 2, body: '在检查 nums[i] 之前，seen 应恰好包含下标 0 到 i-1 的不同值。先查询；没命中才加入当前值。' },
    { id: '217-hint-pseudocode', level: 3, body: 'seen 置空；遍历 i：若 seen.contains(nums[i]) 返回 true，否则 seen.add(nums[i])；循环全部结束后返回 false。' },
  ],
  predictionChecks: [
    {
      id: '217-predict-membership',
      prompt: '输入 [4,1,4]：第一次检查 nums[0]=4 时，seen 已经包含 4 吗？',
      answer: { kind: 'choice', optionId: 'absent' },
      options: [{ id: 'present', label: '已经包含' }, { id: 'absent', label: '尚未包含' }],
      explanation: '第一次检查发生在第一次 add 之前，此时 seen 为空。',
      checkpointId: 'first-membership',
    },
    {
      id: '217-predict-result',
      prompt: '输入 [4,1,4]：扫描到最后一个 4 时，方法会返回什么？',
      answer: { kind: 'choice', optionId: 'duplicate' },
      options: [{ id: 'duplicate', label: 'true' }, { id: 'all-unique', label: 'false' }],
      explanation: '最后一个 4 检查时，seen 中已经有来自下标 0 的 4，所以立即返回 true。',
      checkpointId: 'final-result',
    },
  ],
  guided: {
    id: '217-guided',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: '217-guided-order',
        instruction: '支架 1 / 3：补查询与加入的对象，保持先 contains、后 add。',
        checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int i = 0; i < nums.length; i++) {
            if (/* TODO：集合 */.contains(/* TODO：当前值 */)) return true;
            /* TODO：集合 */.add(/* TODO：当前值 */);
        }
        return false;
    }
}
`,
      },
      {
        id: '217-guided-loop',
        instruction: '支架 2 / 3：自行声明 HashSet，写循环并维持“seen 只含过去值”的不变量。',
        checkKind: 'static-practice',
        scaffoldSource: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // TODO：创建 seen，逐项先查后加，最后返回 false。
        throw new UnsupportedOperationException("请完成 HashSet 判重");
    }
}
`,
      },
      {
        id: '217-guided-whole',
        instruction: '支架 3 / 3：从方法骨架独立实现，最终把完整 Java 源码提交到真实 runner。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  commonErrors: [
    { id: '217-error-add-first', description: '先 add 当前值，再用 contains 查询它。', counterexampleInputId: 'case-single', explanation: 'add 后集合当然包含当前值，单元素 [7] 就会错误返回 true。应让查询只面对更早元素。' },
    { id: '217-error-adjacent-only', description: '只比较 nums[i] 与 nums[i-1]。', counterexampleInputId: 'case-non-adjacent-duplicate', explanation: '[4,1,4] 的两个 4 不相邻；相邻比较会漏掉真正的重复。HashSet 保留所有过去的不同值。' },
    { id: '217-error-index-in-set', description: '查询 seen.contains(i)，把循环下标当成数组值。', counterexampleInputId: 'case-duplicate-one', explanation: '[1,0,-1,1] 中值 1 重复，但检查下标会查询 0、1、2、3，语义与 nums[i] 不同。' },
    { id: '217-error-early-false', description: '第一个没命中的元素就立即返回 false。', counterexampleInputId: 'case-late-duplicate', explanation: '[9,8,7,6,5,4,9] 的重复直到最后才出现；false 只有完整扫描后才能确定。' },
  ],
  testSuite: {
    version: PROBLEM_META['217'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '217-wrong-adjacent-only', source: WRONG_ADJACENT_ONLY_SOURCE, targetedCaseIds: ['case-non-adjacent-duplicate', 'case-late-duplicate'] },
      { id: '217-wrong-add-before-check', source: WRONG_ADD_BEFORE_CHECK_SOURCE, targetedCaseIds: ['case-single', 'case-two-unique', 'case-all-unique'] },
    ],
  },
  visualization: {
    modelId: '217-hash-set',
    modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id),
    maxItems: 30,
    maxSnapshots: 2000,
    maxTreeDepth: 8,
  },
} satisfies Lesson217;

