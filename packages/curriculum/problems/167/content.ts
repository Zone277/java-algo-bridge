import { PROBLEM_META, TwoSumSortedInputSchema, expectedOutput, type Lesson, type TwoSumSortedInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson167 = Extract<Lesson, { id: '167' }>;
type Case167 = Lesson167['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: TwoSumSortedInput }[] = [
  { id: 'middle-pair', title: '两端交替移动：[2,3,4,9,14]，目标 7', input: { numbers: [2, 3, 4, 9, 14], target: 7 } },
  { id: 'basic-pair', title: '右端先移动：[2,7,11,15]，目标 9', input: { numbers: [2, 7, 11, 15], target: 9 } },
  { id: 'same-values', title: '重复值在不同位置：[3,3]，目标 6', input: { numbers: [3, 3], target: 6 } },
];

function testCase(id: string, raw: TwoSumSortedInput, coverage: string): Case167 {
  const input = TwoSumSortedInputSchema.parse(raw);
  const expected = expectedOutput('167', input);
  if (expected.kind !== 'int-array') throw new Error('167 expected output must be int-array');
  return { id, input, expected, coverage };
}

const cases: Case167[] = [
  testCase('167-basic', demoInputs[1]!.input, '标准升序数组；右指针连续左移后命中，返回 [1,2] 而非 0 起始下标。'),
  testCase('167-middle', demoInputs[0]!.input, '先两次右移再左移，答案在内部两个相邻位置。'),
  testCase('167-two', { numbers: [2, 7], target: 9 }, '最短合法输入；两端直接构成答案，循环必须允许 left=0、right=1。'),
  testCase('167-duplicate-values', demoInputs[2]!.input, '相同值在两个不同下标；可用两个 3，但不能复用单个下标。'),
  testCase('167-one-half-not-pair', { numbers: [-1, 0, 1, 3], target: 2 }, '中间元素 1 的两倍虽为 2，却只有一个 1；必须返回首尾两个位置。'),
  testCase('167-zero-pair', { numbers: [0, 0, 1], target: 0 }, '两个零来自不同位置；检查等值重复和正确下标。'),
  testCase('167-negative', { numbers: [-8, -5, -2, 1], target: -10 }, '负目标；正确组合为 -8 与 -2，-5 不能与自己配对。'),
  testCase('167-left-moves', { numbers: [-7, -4, -1, 5, 10], target: 6 }, '左指针先移动后命中；算法不能只会缩小右端。'),
  testCase('167-extremes', { numbers: [-1000, -2, 4, 1000], target: 0 }, '本站元素和目标值域边界；首尾成对且 Java int 加法安全。'),
  testCase('167-all-negative', { numbers: [-8, -7, -3, -1], target: -11 }, '全负数数组；排序条件仍支持左右双指针。'),
  testCase('167-last-pair', { numbers: [-9, -4, 0, 8], target: 8 }, '答案包含最后元素，首个指针逐步推进到中间。'),
  testCase('167-max-length', { numbers: [...Array<number>(9998).fill(-1000), -999, 1000], target: 1 }, '真实判题上限 10000 项；只有末尾 -999 与 1000 一对有效下标，不用于参考演示。'),
];

export const WRONG_ZERO_BASED_SOURCE = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0, right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[]{left, right};
            if (sum < target) left++; else right--;
        }
        throw new IllegalStateException("no pair");
    }
}
`;

export const WRONG_REUSE_INDEX_SOURCE = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        for (int i = 0; i < numbers.length; i++) {
            if (numbers[i] * 2 == target) return new int[]{i + 1, i + 1};
        }
        int left = 0, right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[]{left + 1, right + 1};
            if (sum < target) left++; else right--;
        }
        throw new IllegalStateException("no pair");
    }
}
`;

export const WRONG_MOVE_DIRECTION_SOURCE = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0, right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[]{left + 1, right + 1};
            if (sum < target) right--; else left++;
        }
        throw new IllegalStateException("no pair");
    }
}
`;

const guidedCondition = REFERENCE_SOURCE.replace('while (left < right)', 'while (false /* TODO：两个指针还指向不同下标吗？ */)');
const guidedPointerMove = `class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0;
        int right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[]{left + 1, right + 1};
            // TODO：sum 小于或大于 target 时，只移动可以让和趋近 target 的那一端。
            throw new UnsupportedOperationException("请补全指针移动");
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
`;

export const lesson167 = {
  schemaVersion: 1,
  id: '167',
  slug: 'two-sum-ii-input-array-is-sorted',
  title: '有序数组两数之和 II',
  order: 15,
  lessonVersion: PROBLEM_META['167'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '写出返回 int[] 的 Java 方法，分清数组下标和题目要求的 1 起始编号。',
    '用排序性质推导左右指针的排除规则，并保证两个下标不相同。',
    '从状态预测和真实 Java 运行反馈中定位指针方向与返回值错误。',
  ],
  source: { platform: 'LeetCode', number: 167, url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
  taskSemantics: '给定非降序整数数组 numbers 和 target，已保证恰有一对不同位置的元素之和为 target。返回这一对按升序排列、从 1 开始编号的两个位置。题意参考 LeetCode 167；本站题面、模拟、推导、图形和代码均为原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接受长度 2—10000、元素和 target 均为 -1000—1000 的非降序数组，且恰有一个由不同下标构成的解。参考演示最多 30 项、2000 快照；更长的合法输入仍可真实运行。', inputSchemaId: 'TwoSumSortedInput' },
  steps: [
    { id: '167-syntax-method', kind: 'syntax', title: 'Java 必要语法 · 方法和 int[] 返回值', body: 'public int[] twoSum(int[] numbers, int target) 接收一个数组引用值和一个 int 基本值，返回新建的 int 数组引用值。Java 参数按值传递：numbers 的引用值被复制，数组对象不会自动复制；本题只读取输入。new int[]{left + 1, right + 1} 创建长度为 2 的返回数组，不必打印结果，也无需编写 main。', relatedIds: ['J1', 'J3'] },
    { id: '167-syntax-loop', kind: 'syntax', title: 'Java 必要语法 · length、while 和编号', body: 'numbers.length 是长度，没有括号。Java 读取 numbers[left] 使用 0 起始下标；题目返回的却是 1 起始编号，所以返回时左右下标各加 1。while (left < right) 保证两个位置不同；++ 和 -- 各移动一个下标。sum 是 int 基本值，本站每项不超过 1000，两个数相加不会溢出。return 会立即结束方法。', relatedIds: ['J2', 'J8'] },
    { id: '167-understand', kind: 'understanding', title: '读题 · 值、数组下标与题目编号', body: '例如 numbers=[2,7,11,15]、target=9。2+7=9，它们的 Java 数组下标为 0 和 1；题目要求返回 [1,2]，不是 [0,1]，也不是元素值 [2,7]。相同值可以出现在不同位置，例如 [3,3] 可返回 [1,2]；同一位置的 3 不能使用两次。输出是一个新数组，输入 numbers 不需要改动。', relatedIds: ['167-basic', '167-duplicate-values'] },
    { id: '167-manual', kind: 'understanding', title: '手工模拟 · 两端朝目标靠近', body: '对 [2,3,4,9,14] 找 7：left=0、right=4，和 16 偏大，把 right 移到 3；2+9=11 仍偏大，right 移到 2；2+4=6 偏小，把 left 移到 1；3+4=7 命中。最后 Java 下标是 1、2，题目编号要各加 1，返回 [2,3]。每一步先观察和，再决定只移动一端。', relatedIds: ['middle-pair'] },
    { id: '167-derive', kind: 'derivation', title: '算法推导 · 为什么能安全丢弃一端', body: '直接办法可对每个元素扫描余下元素，最多 O(n²) 次比较；排序信息允许一次收缩。开始时 left=0、right=length-1，不变量是唯一解的两个下标仍在闭区间 [left,right] 中，且 left<right 时可构成不同位置。若 numbers[left]+numbers[right]<target，固定 left 与区间内任何其他右端相加都不会更大，因此 left 不可能属于解，可以 left++。若和偏大，固定 right 与区间内任何其他左端相加都不会更小，因此 right 不可能属于解，可以 right--。相等时返回 [left+1,right+1]。每轮严格缩小区间，最多 O(n) 轮，只用固定几个变量，额外空间 O(1)（返回数组是规定输出）；这些结论来自算法结构，不靠运行耗时猜测。', relatedIds: [] },
    { id: '167-predict', kind: 'prediction', title: '先预测，再揭示两处状态', body: '默认演示先预测第一次两端和，再预测比较后哪个指针移到哪里。切换演示输入后，两个答案从新输入的实际快照动态生成。预测是参考算法的静态教学检查，不表示学生 Java 已真实执行。', relatedIds: ['167-predict-sum', '167-predict-move'] },
    { id: '167-reference', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组、变量、左右端标记、解释与代码高亮读取同一份不可变状态快照；下一步、上一步和切换输入不会改动学生源码。学生编辑的 Java 仍须通过独立 Docker runner 编译和判题，参考演示不是学生程序的执行轨迹。', relatedIds: ['middle-pair', 'basic-pair', 'same-values'] },
    { id: '167-guided-intro', kind: 'guided-code', title: '引导编写 · 三段逐步撤去支架', body: '第一段补 while 的不同下标条件；第二段根据 sum 与 target 关系补指针移动；第三段仅给方法骨架，自行写完整算法。练习支架是静态练习，最后提交完整 Solution 到真实 Java runner，按实际返回的两个下标判定；不会把字符串匹配当成通过。', relatedIds: ['167-guided'] },
    { id: '167-independent', kind: 'independent-code', title: '独立模式 · 从方法骨架开始', body: '独立模式开始时只有方法签名。先用两个数、重复值和左右端都移动的输入试运行，再提交本站公布用例。若编译失败读 javac 行号；若返回 [0,1] 检查题目编号；若重复下标检查 left<right；若超时检查每轮是否缩小区间。失败后改代码重新运行，只有当前源码真实提交通过才记为独立通过。', relatedIds: [] },
    { id: '167-summary', kind: 'summary', title: '复盘 · 将排序信息变成排除证明', body: '请解释为何 sum 偏小时移动 left、偏大时移动 right；为何不能使用同一个位置；为何返回时两个下标都加 1。本站把预测、提示、查看答案、引导通过和独立通过分别记录，刷新可恢复草稿。通过本站测试不代表通过 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'a1d672cde50f9833bf18f5a9f34b5e7cc7c158d2f0dbadab5b7c376591364e43', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(item => ({ ...item })) },
  hints: [
    { id: '167-hint-concept', level: 1, body: '有序数组里，两端的和偏小与偏大分别说明哪一端已不可能参与唯一解？' },
    { id: '167-hint-invariant', level: 2, body: '维护唯一解始终在 [left,right] 内。sum 偏小时排除当前 left；偏大时排除当前 right。两个指针必须指向不同位置。' },
    { id: '167-hint-pseudocode', level: 3, body: 'left=0、right=length-1；当 left<right：算两端和；相等返回 [left+1,right+1]；和小则 left++，否则 right--。' },
  ],
  predictionChecks: [
    { id: '167-predict-sum', prompt: '默认输入 [2,3,4,9,14]、target=7，第一次两端相加得多少？', answer: { kind: 'int', value: 16 }, explanation: 'numbers[0]=2 与 numbers[4]=14，相加是 16。', checkpointId: 'first-sum' },
    { id: '167-predict-move', prompt: '第一次和 16 偏大后，right 移到哪个 Java 下标？', answer: { kind: 'int', value: 3 }, explanation: '右端 14 过大，令 right 从 4 减一到 3。', checkpointId: 'first-move' },
  ],
  guided: { id: '167-guided', finalCheck: 'real-java-submit', stages: [
    { id: '167-guided-condition', instruction: '支架 1 / 3：补 while 条件，保证两个指针指向不同位置。', scaffoldSource: guidedCondition, checkKind: 'static-practice' },
    { id: '167-guided-move', instruction: '支架 2 / 3：补 sum 偏小或偏大时的指针移动，并删除 TODO 异常。', scaffoldSource: guidedPointerMove, checkKind: 'static-practice' },
    { id: '167-guided-whole', instruction: '支架 3 / 3：从方法骨架完整实现，提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '167-error-zero-based', description: '直接返回 Java 的 0 起始数组下标。', counterexampleInputId: '167-basic', explanation: '[2,7,11,15] 的 Java 下标是 0、1，但题目编号是 1、2；返回两个值都应加 1。' },
    { id: '167-error-self-pair', description: '允许同一下标的元素与自己相加。', counterexampleInputId: '167-one-half-not-pair', explanation: 'target=2 时唯一的 1 不能用两遍；[1,1] 不是两个不同位置。while 条件应确保 left<right。' },
    { id: '167-error-direction', description: '和偏大时移动 left，或偏小时移动 right。', counterexampleInputId: '167-middle', explanation: '排序保证和偏大时右端才可以安全排除，反向移动可能越过唯一答案。' },
    { id: '167-error-repeated-values', description: '把相等数值误认为同一位置而拒绝。', counterexampleInputId: '167-duplicate-values', explanation: '[3,3] 的两个 3 是两个不同数组位置；只需检查下标是否不同。' },
  ],
  testSuite: { version: PROBLEM_META['167'].testSuiteVersion, cases, wrongFixtures: [
    { id: '167-wrong-zero-based', source: WRONG_ZERO_BASED_SOURCE, targetedCaseIds: ['167-basic', '167-two', '167-middle'] },
    { id: '167-wrong-reuse-index', source: WRONG_REUSE_INDEX_SOURCE, targetedCaseIds: ['167-one-half-not-pair', '167-negative'] },
    { id: '167-wrong-move-direction', source: WRONG_MOVE_DIRECTION_SOURCE, targetedCaseIds: ['167-middle', '167-left-moves'] },
  ] },
  visualization: { modelId: '167-opposing-pointers', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson167;
