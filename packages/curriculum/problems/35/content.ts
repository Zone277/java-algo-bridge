import { PROBLEM_META, type Lesson, type SearchInsertInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type SearchInsertLesson = Extract<Lesson, { id: '35' }>;

export const demoInputs: { id: string; title: string; input: SearchInsertInput }[] = [
  { id: 'gap-middle-demo', title: '插在中间：寻找 4', input: { nums: [1, 3, 5, 7], target: 4 } },
  { id: 'before-all-demo', title: '插在开头：寻找 -4', input: { nums: [-2, 3, 8], target: -4 } },
  { id: 'after-all-demo', title: '插在末尾：寻找 10', input: { nums: [-2, 3, 8], target: 10 } },
  { id: 'existing-demo', title: '已有元素：寻找 5', input: { nums: [1, 3, 5, 7], target: 5 } },
];

const cases: SearchInsertLesson['testSuite']['cases'] = [
  { id: 'case-existing-middle', input: { nums: [1, 3, 5, 7], target: 5 }, expected: { kind: 'int', value: 2 }, coverage: '目标已存在于中间；lower_bound 应返回该元素下标。' },
  { id: 'case-gap-middle', input: { nums: [1, 3, 5, 7], target: 4 }, expected: { kind: 'int', value: 2 }, coverage: '目标位于相邻元素之间；返回第一个大于目标的下标。' },
  { id: 'case-before-all', input: { nums: [2, 5, 9], target: -1 }, expected: { kind: 'int', value: 0 }, coverage: '目标小于所有元素；合法插入位置是开头 0。' },
  { id: 'case-after-all', input: { nums: [2, 5, 9], target: 10 }, expected: { kind: 'int', value: 3 }, coverage: '目标大于所有元素；答案允许等于 nums.length。' },
  { id: 'case-singleton-before', input: { nums: [4], target: 3 }, expected: { kind: 'int', value: 0 }, coverage: '单元素且目标更小；第一次比较后 right 移到 0。' },
  { id: 'case-singleton-hit', input: { nums: [4], target: 4 }, expected: { kind: 'int', value: 0 }, coverage: '单元素命中；算法仍返回第一个不小于 target 的位置。' },
  { id: 'case-singleton-after', input: { nums: [4], target: 5 }, expected: { kind: 'int', value: 1 }, coverage: '单元素且目标更大；left 可移动到 length 哨兵。' },
  { id: 'case-two-gap', input: { nums: [1, 9], target: 8 }, expected: { kind: 'int', value: 1 }, coverage: '两个元素之间插入，检查区间必须严格收缩。' },
  { id: 'case-first-hit', input: { nums: [-5, 0, 4], target: -5 }, expected: { kind: 'int', value: 0 }, coverage: '命中首项，持续收缩右边界到 0。' },
  { id: 'case-last-hit', input: { nums: [-5, 0, 4], target: 4 }, expected: { kind: 'int', value: 2 }, coverage: '命中末项，检查不把最后一个下标漏掉。' },
  { id: 'case-negative-gap', input: { nums: [-9, -3, 2, 8], target: -4 }, expected: { kind: 'int', value: 1 }, coverage: '负数之间插入，避免把元素值误当成下标。' },
  { id: 'case-max-length', input: { nums: Array.from({ length: 10000 }, (_, index) => index - 5000), target: 3777 }, expected: { kind: 'int', value: 8777 }, coverage: '本站长度上限的真实判题用例；该用例不用于 30 项上限的动画。' },
];

export const WRONG_EXACT_SEARCH_SOURCE = `class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`;

export const WRONG_RIGHT_LAST_SOURCE = `class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }
}
`;

export const WRONG_SKIP_MID_SOURCE = `class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return left;
    }
}
`;

const guidedCondition = REFERENCE_SOURCE.replace(
  'while (left < right)',
  'while (false /* TODO：填入半开区间仍含待判定元素的条件 */)',
);

const guidedBranches = `class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            // TODO：根据 nums[mid] < target 更新 left 或 right。
            throw new UnsupportedOperationException("请补全边界更新");
        }
        return left;
    }
}
`;

export const lesson35 = {
  schemaVersion: 1,
  id: '35',
  slug: 'search-insert-position',
  title: '搜索插入位置',
  order: 11,
  lessonVersion: PROBLEM_META['35'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J8'],
  objectives: [
    '读懂 public int 方法、int[]、length、下标、while 与 return。',
    '用半开区间 [left,right) 推导第一个大于等于 target 的位置。',
    '区分“查找已有元素”与“返回保持升序的插入位置”，并用真实 Java 运行修正边界。',
  ],
  source: { platform: 'LeetCode', number: 35, url: 'https://leetcode.com/problems/search-insert-position/' },
  taskSemantics: '给定一个非空、严格升序且没有重复值的整数数组 nums 与整数 target。若 target 已存在，返回它从 0 开始的下标；否则返回把 target 插入后仍保持升序的位置。题意参考 LeetCode 35；本站题面、手算、推导、图形和代码均为原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接受长度 1—10000 的严格升序无重复 int 数组，元素与 target 范围为 -9999—9999。参考演示最多显示 30 项、2000 个快照；更长合法输入仍可真实运行。', inputSchemaId: 'SearchInsertInput' },
  steps: [
    { id: 'step35-syntax-method', kind: 'syntax', title: 'Java 必要语法 · 方法、参数与返回值', body: '方法签名 public int searchInsert(int[] nums, int target) 表示：方法接收一个 int 数组引用值和一个 int 基本值，最终交回一个 int 下标。Java 方法参数按值传递：target 的整数值被复制，nums 的引用值被复制；本题只读取数组，不修改数组对象。调用器负责创建 Solution 并调用方法，你不写 main，也不能靠打印 PASS 通过判题。return left; 会立即结束方法并把下标交给可信调用器。', relatedIds: ['J1', 'J2'] },
    { id: 'step35-syntax-array', kind: 'syntax', title: 'Java 必要语法 · int[]、length 与 while', body: 'nums.length 是数组长度，没有括号；合法元素下标是 0 到 nums.length-1。插入位置还允许等于 nums.length，例如 [2,5,9] 插入 10 的位置是 3，但 nums[3] 仍然越界。while (left < right) 要求 boolean 条件；每轮条件为真才计算 mid。mid = left + (right-left)/2 使用 Java 整数除法取整，并保证 mid < right，所以只在区间非空时读取 nums[mid]。== 是比较，= 是赋值。', relatedIds: ['J2', 'J8'] },
    { id: 'step35-understanding', kind: 'understanding', title: '理解问题 · 找到或留出一个位置', body: '把数组看作从小到大摆放的卡片。target 已有卡片时返回它的位置；没有时，返回应把新卡片放在哪个缝隙。输入 nums=[1,3,5,7]、target=4，输出 2，因为 4 应放在 3 和 5 之间，原下标 2 的 5 会向后移动。若 target=5，仍返回 2。若 target=0 返回 0；若 target=9 返回 4。输出是位置，不是元素值，也不要求真的修改 nums。', relatedIds: ['case-gap-middle', 'case-after-all'] },
    { id: 'step35-manual', kind: 'understanding', title: '手工模拟 · 在 [1,3,5,7] 中为 4 定位', body: '初始搜索半开区间 [0,4)，包含下标 0、1、2、3。mid=2，nums[2]=5 不小于 4，所以第一个不小于 4 的位置不会在 2 的右边，把 right 移到 2，得到 [0,2)。再取 mid=1，nums[1]=3<4，下标 0 和 1 都太小，把 left 移到 2。此时 [2,2) 为空，left==right==2；这个汇合位置就是插入下标。', relatedIds: ['gap-middle-demo'] },
    { id: 'step35-derivation', kind: 'derivation', title: '算法推导 · lower_bound 与半开区间不变量', body: '目标统一成 lower_bound：寻找第一个满足 nums[index] >= target 的位置；若没有这样的元素，答案就是 length。维护 0<=left<=right<=length。所有下标小于 left 的元素都已证明 < target；所有下标大于等于 right 的元素都已证明 >= target；真正答案始终在位置范围 [left,right] 内，而本轮尚需读取比较的数组元素位于半开区间 [left,right)。初始 left=0、right=length，两侧已排除集合为空，不变量成立。\n当 nums[mid]<target 时，mid 及其左侧都太小，令 left=mid+1。否则 mid 自己可能正是答案，不能跳过，令 right=mid。两种更新都严格缩短 right-left。left==right 时没有未判定元素，不变量说明汇合点正是第一个不小于 target 的位置。时间 O(log n)，额外空间 O(1)；这是由循环结构得出，不由少量运行耗时猜测。', relatedIds: [] },
    { id: 'step35-prediction', kind: 'prediction', title: '先预测，再揭示 · 中点与边界', body: '默认输入 [1,3,5,7]、target=4。先预测第一次 mid，再预测比较后哪个边界变成多少。切换输入时，答案从新轨迹的实际快照动态生成；提交后才揭示。预测属于参考模型教学检查，不会编译或执行学生 Java，也不会记录通过本站测试。', relatedIds: ['prediction35-first-mid', 'prediction35-first-boundary'] },
    { id: 'step35-reference', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、数组、半开区间、说明与代码高亮全部读取同一份不可变快照。下一步、上一步、播放、暂停、重置和输入切换只选择或重建参考快照；上一步可精确恢复旧 left/right/mid。学生源码走单独的真实 runner，编辑代码不会改变演示，也不会把参考轨迹伪装成学生代码执行。', relatedIds: ['gap-middle-demo', 'before-all-demo', 'after-all-demo', 'existing-demo'] },
    { id: 'step35-guided', kind: 'guided-code', title: '引导编写 · 三段撤去支架', body: '第一段保留完整逻辑，只补 while 的半开区间条件；第二段给出端点与 mid，自己补两个边界更新；第三段只保留方法骨架，完整写出初始化、循环、分支和返回。静态练习用于组织思路，最终必须提交完整 Solution 到真实 Java runner；系统按返回值和测试输入判定，不比较源码字符串。', relatedIds: ['guided35'] },
    { id: 'step35-independent', kind: 'independent-code', title: '独立模式 · 从方法骨架开始', body: '独立模式不会预填完整解法。先手算并真实运行开头、中间、末尾三类位置，再提交全部本站测试。编译错误看 javac 行号；运行异常检查是否读取 nums[length]；错误答案检查半开区间是否混入闭区间规则；超时检查每轮是否严格缩短区间。只有当前源码真实完整提交通过才记录独立通过。', relatedIds: [] },
    { id: 'step35-summary', kind: 'summary', title: '复盘 · 一套循环覆盖命中与未命中', body: '请解释：为什么 right 从 length 开始却不会读取 nums[length]？为什么 nums[mid]>=target 时保留 mid？为什么循环结束可直接 return left？返回 length 在什么情况下合法？本站分别保存预测、提示、查看答案、引导通过和独立通过记录；访问页面或播放演示不等于掌握，通过本站测试也不是 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '3067e776d167640ca42b2d4db1dfd83b8d4520ea9770dd58ab6e8aded3856f44',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: 'hint35-concept', level: 1, body: '先把“命中”和“未命中”统一：答案是第一个大于等于 target 的位置；若不存在，它就在数组末尾之后。' },
    { id: 'hint35-invariant', level: 2, body: '用 [left,right) 表示尚需比较的元素范围：left 左侧都小于 target，right 及右侧都大于等于 target。nums[mid] >= target 时 mid 仍可能是答案。' },
    { id: 'hint35-pseudocode', level: 3, body: 'left=0，right=length；当 left<right：取 mid；若 nums[mid]<target，left=mid+1，否则 right=mid；循环后返回 left。' },
  ],
  predictionChecks: [
    { id: 'prediction35-first-mid', prompt: '默认数组 [1,3,5,7] 的初始区间是 [0,4)。第一次 mid 下标是多少？', answer: { kind: 'int', value: 2 }, explanation: 'mid=0+(4-0)/2=2，对应元素值 5。', checkpointId: 'first-mid' },
    { id: 'prediction35-first-boundary', prompt: 'target=4，第一次 nums[mid]=5 不小于 target。更新后 right 是多少？', answer: { kind: 'int', value: 2 }, explanation: 'mid 可能是第一个不小于 target 的位置，因此保留它并令 right=mid=2。', checkpointId: 'first-boundary' },
  ],
  guided: {
    id: 'guided35',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided35-condition', instruction: '支架 1 / 3：只补 while 条件。想清楚 [left,right) 何时还有可读取的元素，并保留 right=length。', scaffoldSource: guidedCondition, checkKind: 'static-practice' },
      { id: 'guided35-branches', instruction: '支架 2 / 3：条件和 mid 已给出。补 nums[mid] 与 target 的比较以及两个边界更新；注意大于等于分支不能排除 mid。', scaffoldSource: guidedBranches, checkKind: 'static-practice' },
      { id: 'guided35-whole', instruction: '支架 3 / 3：从方法骨架完整实现 lower_bound。最终提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error35-return-minus-one', description: '照搬“找不到返回 -1”的二分查找，忘记本题要返回插入位置。', counterexampleInputId: 'case-gap-middle', explanation: '[1,3,5,7] 中没有 4，但正确答案是插在下标 2；返回 -1 只回答了不存在，没有回答放在哪里。' },
    { id: 'error35-right-last', description: '半开区间仍把 right 初始化为 length-1，丢失末尾插入位置。', counterexampleInputId: 'case-after-all', explanation: '[2,5,9] 插入 10 的答案是 3。right 若从 2 开始，汇合点永远无法到 length。' },
    { id: 'error35-skip-mid', description: 'nums[mid]>=target 时写 right=mid-1，把可能的答案 mid 排除。', counterexampleInputId: 'case-gap-middle', explanation: '第一次 mid=2、nums[mid]=5>=4，位置 2 正是答案。半开区间右端应移动到 mid，保留这个候选位置。' },
    { id: 'error35-read-sentinel', description: '把 right=length 误解为可访问元素，直接读取 nums[right]。', counterexampleInputId: 'case-singleton-after', explanation: '长度 1 时 right=1 是合法的插入位置哨兵，却不是数组下标。只在 left<right 后读取 mid，mid 会严格小于 right。' },
  ],
  testSuite: {
    version: PROBLEM_META['35'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture35-exact-search', source: WRONG_EXACT_SEARCH_SOURCE, targetedCaseIds: ['case-gap-middle', 'case-before-all', 'case-after-all'] },
      { id: 'fixture35-right-last', source: WRONG_RIGHT_LAST_SOURCE, targetedCaseIds: ['case-after-all', 'case-singleton-after'] },
      { id: 'fixture35-skip-mid', source: WRONG_SKIP_MID_SOURCE, targetedCaseIds: ['case-gap-middle', 'case-singleton-before', 'case-first-hit'] },
    ],
  },
  visualization: { modelId: '35-half-open-lower-bound', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
