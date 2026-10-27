import { PROBLEM_META, type Lesson, type SearchRangeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type SearchRangeLesson = Extract<Lesson, { id: '34' }>;

export const demoInputs: { id: string; title: string; input: SearchRangeInput }[] = [
  { id: '34-demo-repeated-middle', title: '重复值在中间：寻找 2', input: { nums: [1, 2, 2, 2, 4], target: 2 } },
  { id: '34-demo-absent-gap', title: '落在缝隙：寻找 3', input: { nums: [-3, 0, 0, 5], target: 3 } },
  { id: '34-demo-empty', title: '空数组：寻找 8', input: { nums: [], target: 8 } },
];

const cases: SearchRangeLesson['testSuite']['cases'] = [
  { id: '34-empty', input: { nums: [], target: 8 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '空数组合法；不能读取 nums[0] 或 nums[length]。' },
  { id: '34-single-hit', input: { nums: [7], target: 7 }, expected: { kind: 'int-array', values: [0, 0] }, coverage: '只有一个命中位置，上下界相邻。' },
  { id: '34-single-miss', input: { nums: [7], target: 6 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '单项不命中，不能把插入点直接当成出现位置。' },
  { id: '34-all-repeat-hit', input: { nums: [4, 4, 4, 4], target: 4 }, expected: { kind: 'int-array', values: [0, 3] }, coverage: '全为目标；既要找最左也要找最右。' },
  { id: '34-all-repeat-miss', input: { nums: [4, 4, 4, 4], target: 5 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '全相同但目标缺失；下界可以等于 length。' },
  { id: '34-first-run', input: { nums: [1, 1, 2, 3], target: 1 }, expected: { kind: 'int-array', values: [0, 1] }, coverage: '目标在数组开头连续出现。' },
  { id: '34-last-run', input: { nums: [1, 2, 3, 3], target: 3 }, expected: { kind: 'int-array', values: [2, 3] }, coverage: '目标在数组结尾连续出现，上界可为 length。' },
  { id: '34-middle-run', input: { nums: [1, 2, 2, 2, 4], target: 2 }, expected: { kind: 'int-array', values: [1, 3] }, coverage: '中间有三个重复目标，命中一个中点不足以确定整个区段。' },
  { id: '34-absent-gap', input: { nums: [1, 2, 2, 4], target: 3 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '下界停在较大值 4 上，但 target 并不存在。' },
  { id: '34-absent-before', input: { nums: [0, 2, 2], target: -1 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '目标小于所有值，不能把位置 0 误报为命中。' },
  { id: '34-absent-after', input: { nums: [0, 2, 2], target: 3 }, expected: { kind: 'int-array', values: [-1, -1] }, coverage: '目标大于所有值，短路检查防止读 nums[length]。' },
  { id: '34-negative-run', input: { nums: [-9, -4, -4, -4, 0, 5], target: -4 }, expected: { kind: 'int-array', values: [1, 3] }, coverage: '负数重复值；边界与元素符号无关。' },
  { id: '34-extreme-hit', input: { nums: [-1000000000, -1000000000, 1000000000], target: -1000000000 }, expected: { kind: 'int-array', values: [0, 1] }, coverage: '最小许可 target；参考上界不使用 target-1 或 target+1。' },
  { id: '34-extreme-max', input: { nums: [-1000000000, 1000000000, 1000000000], target: 1000000000 }, expected: { kind: 'int-array', values: [1, 2] }, coverage: '最大许可 target；检验边界比较不借助加一。' },
  { id: '34-adjacent-runs', input: { nums: [0, 0, 1, 1], target: 1 }, expected: { kind: 'int-array', values: [2, 3] }, coverage: '相邻的两个重复区段不能混成一个。' },
  { id: '34-site-max-length', input: { nums: Array.from({ length: 10000 }, (_, index) => index < 4500 ? -1 : index < 5500 ? 2 : 3), target: 2 }, expected: { kind: 'int-array', values: [4500, 5499] }, coverage: '本站真实判题长度上限；该数组不进入 30 项参考演示。' },
];

export const WRONG_SINGLE_MATCH_SOURCE = `class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return new int[] {mid, mid};
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return new int[] {-1, -1};
    }
}
`;

export const WRONG_UPPER_COMPARISON_SOURCE = `class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        int first = left;
        if (first == nums.length || nums[first] != target) return new int[] {-1, -1};
        left = first;
        right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return new int[] {first, left - 1};
    }
}
`;

const guidedCondition = REFERENCE_SOURCE.replace('while (left < right)', 'while (false /* TODO：第一轮的半开区间何时仍含候选元素？ */)');
const guidedUpper = REFERENCE_SOURCE.replace(
  `            if (nums[mid] <= target) {
                left = mid + 1;
            } else {
                right = mid;
            }`,
  `            // TODO：补全第二轮比较和 left/right 更新；相等值应向哪边排除？
            throw new UnsupportedOperationException("请补全上界循环");`,
);

export const lesson34 = {
  schemaVersion: 1,
  id: '34',
  slug: 'find-first-and-last-position',
  title: '在排序数组中查找元素的第一个和最后一个位置',
  order: 32,
  lessonVersion: PROBLEM_META['34'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '读懂 int[] 返回值、new int[]、length、while 和 || 的短路行为。',
    '从 35 题的下界扩展到两次半开区间二分，解释相等时两轮如何向相反方向收缩。',
    '区分“下界是候选位置”和“目标确实存在”，并在真实 Java 判定中修正重复值边界。',
  ],
  source: { platform: 'LeetCode', number: 34, url: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/' },
  taskSemantics: '给定一个可以为空、元素按非降序排列且允许重复的整数数组 nums，以及整数 target。若 target 出现，返回其最左与最右的 0 起始下标组成的长度为 2 的数组；若未出现，返回 [-1,-1]。题意参考 LeetCode 34，本站题面、例子、推导和代码为原创表达，与原平台无官方合作。',
  siteLimits: { description: '本站真实判题接受长度 0—10000 的非降序 int 数组，元素及 target 均在 -10^9—10^9。参考演示最多 30 项、2000 快照；更长的合法输入仍可提交真实 Java。', inputSchemaId: 'SearchRangeInput' },
  steps: [
    { id: '34-syntax-method', kind: 'syntax', title: 'Java 桥接 · 返回两个下标', body: 'public int[] searchRange(int[] nums, int target) 的返回类型是 int[]，不是 int。方法收到 nums 数组的引用值副本与 target 基本整数值副本；Java 参数都按值传递，不复制整个数组。return new int[] {first, last}; 创建一份新的两项数组并把引用值交给调用器，打印文字不会作为答案。无需编写 main。', relatedIds: ['J1', 'J3'] },
    { id: '34-syntax-boundary', kind: 'syntax', title: 'Java 桥接 · length、while 与安全短路', body: '数组长度写 nums.length，没有括号。合法元素下标为 0 到 length-1；半开区间右边界可等于 length，但 nums[length] 不可读。while (left < right) 只在区间非空时计算 mid，mid 始终小于 right。表达式 first == nums.length || nums[first] != target 从左向右短路：空数组或下界在末尾时，右侧不会求值，因此没有越界访问。整数除法 (right-left)/2 取整。', relatedIds: ['J2', 'J8', '34-empty'] },
    { id: '34-understanding', kind: 'understanding', title: '理解问题 · 一个值可能占一整段', body: '例如 nums=[1,2,2,2,4]、target=2，2 占据下标 1、2、3，结果是 [1,3]，不是 [2,2]。若 target=3，则虽然它应该插入在下标 4，但没有实际出现，应返回 [-1,-1]。空数组也返回 [-1,-1]。输入数组不需要修改；输出是一份新数组。', relatedIds: ['34-middle-run', '34-absent-gap', '34-empty'] },
    { id: '34-manual', kind: 'understanding', title: '手工模拟 · 两个不同的边界', body: '在 [1,2,2,2,4] 中找 2：下界从 [0,5) 开始，mid=2 的值为 2，right=2；再取 mid=1 的值为 2，right=1；再取 mid=0 的值为 1，left=1，所以 first=1。确认 nums[1]==2。上界从 [1,5) 开始，mid=3 的值为 2，left=4；mid=4 的值为 4，right=4。第一个 >2 的位置是 4，最后一个等于 2 的位置是 4-1=3，返回 [1,3]。', relatedIds: ['34-demo-repeated-middle'] },
    { id: '34-derivation', kind: 'derivation', title: '推导 · 下界、上界与缺席检查', body: '先用半开区间 [left,right) 寻找第一个 >= target 的位置 first。下界循环不变量：left 左侧全部 < target，right 及右侧全部 >= target。若 nums[mid]<target，移动 left=mid+1；否则 mid 仍可能是答案，移动 right=mid。收敛后若 first==length 或 nums[first]!=target，就没有命中。若存在，第二轮从 [first,length) 寻找第一个 > target 的位置 upper。上界循环不变量：left 左侧全部 <= target，right 及右侧全部 > target；相等时应移动 left=mid+1，不能再移动 right。每轮区间长度严格缩小。最后答案是 [first,upper-1]。两轮各 O(log n)，额外工作空间 O(1)，另有固定两项的返回数组；复杂度由循环推导，不由本站少量计时猜测。直接比较 <=，无需构造 target+1。', relatedIds: [] },
    { id: '34-prediction', kind: 'prediction', title: '先预测，再揭示 · 边界与最终返回', body: '先手算下界 first，再预测上界第一轮 mid，最后填写返回的 [首,尾]。预测答案从当前演示输入的不可变快照生成；切换到缺席或空数组时第二轮不会运行，但仍有 first 与最终结果两个检查点。预测只是静态教学检查，不等于学生 Java 已编译或通过本站测试。', relatedIds: ['34-predict-first', '34-predict-upper-mid', '34-predict-return'] },
    { id: '34-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '下一步、上一步、播放、暂停、重置与输入切换只浏览预置参考解法的快照；变量表、区间指针、数组和值、解释和参考代码高亮取自同一快照。阶段标记是教学标签，并非 Java 局部变量。第一轮找 >=，第二轮找 >；学生编辑器中的源码不驱动这些画面，真实编译和执行有单独通道。', relatedIds: ['34-demo-repeated-middle', '34-demo-absent-gap', '34-demo-empty'] },
    { id: '34-guided', kind: 'guided-code', title: '引导编写 · 三段撤去支架', body: '第一段补第一轮 while 的非空条件；第二段补第二轮比较和边界移动，注意相等元素要继续向右；第三段只剩方法骨架，自己写完整两轮和缺席检查。支架检查用于练习，最后要把完整 Java 提交到真实 runner，以结构化返回值和测试用例判定，绝不按填入字符串与参考答案相同与否给通过。', relatedIds: ['34-guided-exercise'] },
    { id: '34-independent', kind: 'independent-code', title: '独立挑战 · 从骨架开始', body: '独立编辑器不预填完整算法。先以空数组、全重复、缺席值和两端命中测试，再提交所有本站用例。编译错误看 javac 行号；数组越界看 length 哨兵和短路；结果错误检查是否只记录了某个 mid，或把上界直接当作末下标。修正后重新真实运行，独立通过记录只绑定当前源码的测试结果。', relatedIds: [] },
    { id: '34-summary', kind: 'summary', title: '复盘 · 比较符号决定边界', body: '请说出：第一轮相等为何保留 mid？第二轮相等为何排除 mid？为什么空数组不会读取 nums[0]？为什么最后使用 upper-1？本站分别记录预测、提示、查看答案、引导通过和独立通过，播放参考演示并不代表掌握；“通过本站测试”也不是 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'fa8977c1976eaae0e6ab81797785b9094fd1cfcb7414b2540f6eefeb9838ef40',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '34-hint-concept', level: 1, body: '一个命中的中点只证明“找到了一个”，无法确定重复值区段的两端。把答案看成“第一个 >= target”和“第一个 > target”两个边界。' },
    { id: '34-hint-invariant', level: 2, body: '两轮都用 [left,right)。第一轮把 < target 的位置丢到左边；第二轮把 <= target 的位置丢到左边。先检查第一轮位置是否真的等于 target。' },
    { id: '34-hint-pseudocode', level: 3, body: '第一轮 left=0/right=n，比较 <；汇合后保存 first，若 first==n 或 nums[first]!=target 返回 [-1,-1]。第二轮 left=first/right=n，比较 <=；汇合后返回 [first,left-1]。' },
  ],
  predictionChecks: [
    { id: '34-predict-first', prompt: '默认输入 [1,2,2,2,4] 找 2，下界循环结束时 first 是多少？', answer: { kind: 'int', value: 1 }, explanation: '第一轮寻找首个 >=2 的位置，下标 1 的值是 2。', checkpointId: 'first-bound' },
    { id: '34-predict-upper-mid', prompt: '上界从 [1,5) 开始，第一次取到的 mid 是多少？', answer: { kind: 'int', value: 3 }, explanation: 'mid=1+(5-1)/2=3；该处仍为 2，所以接下来 left=4。', checkpointId: 'upper-first-mid' },
    { id: '34-predict-return', prompt: '默认输入最终返回哪两个下标？按 [first,last] 填写。', answer: { kind: 'text', value: '[1,3]' }, explanation: '第一个 >=2 的下标为 1，第一个 >2 的下标为 4，因此末下标为 3。', checkpointId: 'final-range' },
  ],
  guided: {
    id: '34-guided-exercise', finalCheck: 'real-java-submit',
    stages: [
      { id: '34-guided-condition', instruction: '支架 1/3：补第一轮 while 条件，保证只在半开候选区间非空时读取 nums[mid]。', scaffoldSource: guidedCondition, checkKind: 'static-practice' },
      { id: '34-guided-upper', instruction: '支架 2/3：下界和缺席检查已给出；补上界循环中的 <= 判断及左右边界更新。', scaffoldSource: guidedUpper, checkKind: 'static-practice' },
      { id: '34-guided-whole', instruction: '支架 3/3：从方法骨架完整实现两轮二分，最终提交完整 Solution 到真实 Java runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '34-error-one-mid', description: '找到一个 target 就返回 [mid,mid]，没继续寻找重复段的边界。', counterexampleInputId: '34-middle-run', explanation: '[1,2,2,2,4] 中间值 2 的下标 2 只是其中一个，正确范围是 [1,3]。' },
    { id: '34-error-upper-less', description: '第二轮继续用 < target 而不是 <= target。', counterexampleInputId: '34-all-repeat-hit', explanation: '上界应寻找第一个大于 target 的位置；相等时必须推进 left，否则会停在最左端。' },
    { id: '34-error-sentinel', description: '当 first==length 时仍读取 nums[first]，引发数组越界。', counterexampleInputId: '34-empty', explanation: '空数组的 first 是 0，同时 length 也是 0；用 || 的左项短路保护右项。' },
    { id: '34-error-last-minus-one', description: '将第二轮汇合点 upper 直接作为末下标。', counterexampleInputId: '34-last-run', explanation: '最后一段 target 到下标 3，上界为 length=4；返回末下标应为 upper-1=3。' },
    { id: '34-error-gap-as-hit', description: '只检查 first 小于 length，就当作已经找到 target。', counterexampleInputId: '34-absent-gap', explanation: '[1,2,2,4] 找 3 时 first=3，但 nums[3]=4；必须确认 nums[first]==target。' },
  ],
  testSuite: { version: PROBLEM_META['34'].testSuiteVersion, cases, wrongFixtures: [
    { id: '34-wrong-single-match', source: WRONG_SINGLE_MATCH_SOURCE, targetedCaseIds: ['34-all-repeat-hit', '34-middle-run', '34-negative-run'] },
    { id: '34-wrong-upper-comparison', source: WRONG_UPPER_COMPARISON_SOURCE, targetedCaseIds: ['34-single-hit', '34-first-run', '34-last-run'] },
  ] },
  visualization: { modelId: '34-two-half-open-bounds', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
