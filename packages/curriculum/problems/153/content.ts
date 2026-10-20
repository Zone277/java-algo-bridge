import { RotatedMinimumInputSchema, PROBLEM_META, expectedOutput, type RotatedMinimumInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson153 = Extract<Lesson, { id: '153' }>;
type Case153 = Lesson153['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RotatedMinimumInput }[] = [
  { id: 'minimum-at-mid', title: '最小值恰好在 mid：[6,9,-4,-1,2]', input: { nums: [6, 9, -4, -1, 2] } },
  { id: 'move-left', title: '先排除左侧：[3,5,8,-2,1]', input: { nums: [3, 5, 8, -2, 1] } },
  { id: 'sorted', title: '没有旋转：[-3,0,4,7]', input: { nums: [-3, 0, 4, 7] } },
  { id: 'single', title: '单个元素：[8]', input: { nums: [8] } },
];

function testCase(id: string, raw: RotatedMinimumInput, coverage: string): Case153 {
  const input = RotatedMinimumInputSchema.parse(raw);
  const expected = expectedOutput('153', input);
  if (expected.kind !== 'int') throw new Error('153 expected output must be int');
  return { id, input, expected, coverage };
}

const cases: Case153[] = [
  testCase('153-mid-minimum', demoInputs[0]!.input, '第一轮 mid 恰是最小值；right 必须保留 mid，否则会删掉答案。'),
  testCase('153-right-half', demoInputs[1]!.input, '第一轮最小值在 mid 的右侧，必须排除 mid 并令 left=mid+1。'),
  testCase('153-sorted', demoInputs[2]!.input, '未旋转同样合法，最小元素在下标 0；不能假定一定有下降位置。'),
  testCase('153-single', demoInputs[3]!.input, '最短合法输入 1 项，不进入循环；返回值 8 而非下标 0。'),
  testCase('153-two-sorted', { nums: [-2, 5] }, '两项未旋转，mid=left；right=mid 后正常终止。'),
  testCase('153-two-rotated', { nums: [5, -2] }, '两项旋转，mid=left；left=mid+1 后正常终止。'),
  testCase('153-last-minimum', { nums: [2, 4, 7, 10, -3] }, '最小值位于末尾，连续向右排除也必须保留最后一项。'),
  testCase('153-second-minimum', { nums: [10, -3, 2, 4, 7] }, '最小值位于下标 1，主要向左收缩后仍需要一次右移。'),
  testCase('153-negative', { nums: [-4, -2, -9, -7] }, '全为负数，不能以 0 作为最小值或将正负号误当作旋转条件。'),
  testCase('153-zero', { nums: [2, 5, 0, 1] }, '最小值为 0，返回元素值而非最小值的下标 2。'),
  testCase('153-extremes', { nums: [5000, -5000, -1, 7] }, '覆盖允许的最大、最小整数值；大小关系不依赖相邻差值。'),
  testCase('153-thirty', { nums: [...Array.from({ length: 13 }, (_, i) => i + 17), ...Array.from({ length: 17 }, (_, i) => i)] }, '演示上限 30 项；所有快照保留原数组和闭区间，不能截断。'),
  testCase('153-length-limit', { nums: [...Array.from({ length: 2499 }, (_, i) => i + 1), ...Array.from({ length: 2501 }, (_, i) => i - 2500)] }, '真实输入上限 5000 项；长输入执行判定，参考演示明确拒绝。'),
];

export const WRONG_DISCARD_MID_SOURCE = `class Solution {
    public int findMin(int[] nums) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) left = mid + 1;
            else right = mid - 1;
        }
        return nums[left];
    }
}
`;

export const WRONG_RETURN_INDEX_SOURCE = `class Solution {
    public int findMin(int[] nums) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) left = mid + 1;
            else right = mid;
        }
        return left;
    }
}
`;

const guidedMid = REFERENCE_SOURCE.replace('int mid = left + (right - left) / 2;', 'int mid = /* TODO：计算闭区间中点 */ left;');
const guidedBoundary = REFERENCE_SOURCE.replace(
  '            if (nums[mid] > nums[right]) {\n                left = mid + 1;\n            } else {\n                right = mid;\n            }',
  '            // TODO：比较 nums[mid] 和 nums[right]，排除一侧但保留最小值。\n            throw new UnsupportedOperationException("请补全两个分支");',
);

export const lesson153 = {
  schemaVersion: 1, id: '153', slug: 'find-minimum-in-rotated-sorted-array', title: '寻找旋转排序数组中的最小值', order: 23,
  lessonVersion: PROBLEM_META['153'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '用 Java 数组索引和整数除法表达二分中点，区分返回元素值与下标。',
    '根据旋转数组的两段升序性质，证明与右端比较时应保留哪一半。',
    '在每次边界变化后检查最小值仍在闭区间内，并用真实 Java 反例纠正边界错误。',
  ],
  source: { platform: 'LeetCode', number: 153, url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
  taskSemantics: '一份互不相同、严格递增的整数列表，把前面连续若干项整体搬到末尾，或保持原样后，交给你一个 nums 数组。请返回数组中的最小元素值。你不知道搬移的项数，也不能假定最小值位于首项。题意参考 LeetCode 153；本站题面、示例、推导和代码原创，与原平台无官方关联。',
  siteLimits: { description: '本站输入 nums 长度 1—5000，每项为 -5000—5000 的整数，不含重复值，且必须是严格递增数组的一次旋转（允许未旋转）。空数组、重复值或任意乱序不属于本题契约。参考演示最多 30 项，长输入可交给真实 runner；演示不截断数组。', inputSchemaId: 'RotatedMinimumInput' },
  steps: [
    { id: '153-syntax-method', kind: 'syntax', title: 'Java 必要语法 · 方法与数组', body: 'public int findMin(int[] nums) 声明接收整数数组、返回 int 的方法，类似 C 中接收数组信息的函数。nums 保存数组引用值，nums[i] 是 int 基本值；left、right、mid 也都是基本值。Java 参数按值传递，数组参数复制引用值，不复制数组对象。本参考只读数组。平台会调用方法，学生写 class Solution 即可，不需要 main，也不把 println 的文本作为答案。', relatedIds: ['J1', 'J3'] },
    { id: '153-syntax-loop', kind: 'syntax', title: 'Java 必要语法 · length、整数除法、while', body: 'nums.length 是数组长度，最后一个下标是 length-1。while (left < right) 表示还有至少两个候选元素。mid = left + (right-left)/2 中都是 int，非负差值做整数除法会舍去小数；用差值形式避免把大下标直接相加。if 比较元素 nums[mid] 和 nums[right]，而不是比较两个下标。return nums[left] 结束方法并返回元素值；return left 返回的只是位置。mid 声明在循环体内，离开本轮作用域后不再显示。', relatedIds: ['J2'] },
    { id: '153-understand', kind: 'understanding', title: '读题 · 旋转保留了什么顺序', body: '输入 {"nums":[6,9,-4,-1,2]} 可以由 [-4,-1,2,6,9] 把前三项搬到末尾得到。整体不是升序，但只在 9 到 -4 处下降，最小值 -4 是答案；返回整数 -4，不返回下标 2，也不返回旋转次数。[-3,0,4,7] 保持原样同样合法；[8] 的答案就是 8。本题明确排除重复值，因此不能直接把此规则用于含重复值的另一道题。', relatedIds: ['153-mid-minimum', '153-sorted', '153-single'] },
    { id: '153-manual', kind: 'understanding', title: '手工模拟 · mid 本身可能就是答案', body: '对 [6,9,-4,-1,2]：left=0、right=4，mid=2，nums[2]=-4 小于 nums[4]=2；最小值可能是 mid，所以令 right=2。现在 [0,2]，mid=1，nums[1]=9 大于 nums[2]=-4，最小值在 mid 右侧，所以 left=2。此时 left=right=2，返回 nums[2]=-4。若第一轮写 right=mid-1，已经把唯一最小值删掉，后面再努力也无法找回。', relatedIds: ['minimum-at-mid'] },
    { id: '153-derive', kind: 'derivation', title: '推导 · 用右端判断中点属于哪一侧', body: '直接逐项扫描记录最小值可用 O(n) 时间、O(1) 额外空间完成；但它没有利用旋转后的顺序。最小值是两段升序之间的分界。保持它在 [left,right] 内，取 mid<right：若 nums[mid]>nums[right]，从 mid 到 right 必经过下降处，mid 不可能是最小值，可以排除 [left,mid]。否则由于没有重复值，nums[mid]<nums[right]，mid 到 right 没有下降处，是升序段；其中最小的是 nums[mid]，所以最小值不在 (mid,right]，但可能恰好就是 mid，令 right=mid。未旋转时第二个规则一直有效。', relatedIds: ['153-right-half', '153-sorted'] },
    { id: '153-invariant', kind: 'derivation', title: '不变量 · 候选闭区间非空且包含唯一最小值', body: '初始化 [0,n-1] 包含最小值。每轮维护 0<=left<=最小值下标<=right<n。left=mid+1 排除确定较大的前半段；right=mid 保留可能最小的中点，二者都保持答案。left<right 时，向下取整的 mid 满足 left<=mid<right，每次区间长度严格减小，最多留下原来一半向上取整的候选，故 O(log n) 时间、O(1) 额外空间。退出时 left=right，唯一候选必为答案。不能套用 704 查找命中目标时的 mid-1 规则，也不能用 left=mid 导致两项输入停滞。复杂度来自区间缩小的证明，不来自少量执行计时。', relatedIds: ['153-two-sorted', '153-two-rotated'] },
    { id: '153-prediction', kind: 'prediction', title: '先预测，再揭示中点与最终值', body: '先根据当前闭区间预测第一次 mid，再预测最终返回的元素值。切换输入会重新建立快照与答案；单节点输入不创建不存在的 mid，改为预测 right，然后预测返回值，仍保留两次检查。这些是教学预测，不是学生 Java 编译执行记录。', relatedIds: ['153-predict-candidate', '153-predict-result'] },
    { id: '153-reference', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组、left/right/mid 标签、候选区间、变量表、代码高亮和解释读取同一不可变快照。left 与 right 标出闭区间，两端都保留。边界移动后的 mid 仍是本轮旧值，比较结果属于移动前的右端；下一轮才清除局部变量并重算。上一步恢复保存的引用和值，不倒推执行。源码编辑不会改变参考轨迹；学生结果来自独立的 Docker javac/java 通道。', relatedIds: demoInputs.map(input => input.id) },
    { id: '153-guided-intro', kind: 'guided-code', title: '引导编写 · 中点、排除规则、完整方法', body: '依次补中点公式、补两个边界分支、从方法骨架独立组织算法。每次都编辑完整 Java，静态练习确认只是学习记录；最终通过必须把完整源码提交到真实 runner。返回正确值的其他合法实现也应被接受，不按填入字符串是否等于参考答案评分。', relatedIds: ['153-guided'] },
    { id: '153-independent', kind: 'independent-code', title: '独立编写 · 用反例定位错误', body: '从骨架开始，先运行 [6,9,-4,-1,2] 和两种两项输入，再提交全部测试。编译错误检查分号、括号和方法签名；异常检查 nums.length 是否被错当成合法下标；结果错误检查返回值与下标、mid 是否被误删；超时检查每轮区间是否严格缩小。编辑源码后必须重新运行，新源码不能借用旧结果通过。Docker 不可用时会报告 RUNNER_UNAVAILABLE，不会在宿主机运行学生代码或把动画当成功。', relatedIds: ['J8', '153-mid-minimum', '153-two-rotated'] },
    { id: '153-summary', kind: 'summary', title: '复盘 · 每次排除都要能证明', body: '请说明为什么与当前 right 比较、为什么两个分支一个排除 mid 而另一个保留 mid，以及为什么只剩一个候选就可以返回。独立写出并通过本站测试；这不代表 LeetCode 官方评测通过。提示、查看答案、预测、引导通过、独立通过分别记录，刷新恢复草稿与进度，访问页面或播放动画不等于掌握。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '19f80497ca25f8f27d5bb392826f6d6e9750f2d908ca45f76fd551d443f0b7a5', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '153-hint-1', level: 1, body: '旋转后的数组最多有一个相邻下降处。试着比较中点与右端：从较大中点走到较小右端，途中一定经过什么？' },
    { id: '153-hint-2', level: 2, body: '维护最小值仍在 [left,right]。nums[mid]>nums[right] 时排除 mid 及其左侧；否则 (mid,right] 不能含最小值，但 mid 仍可以。' },
    { id: '153-hint-3', level: 3, body: 'left=0，right=n-1；while left<right：mid=left+(right-left)/2；若 nums[mid]>nums[right]，left=mid+1；否则 right=mid；返回 nums[left]。' },
  ],
  predictionChecks: [
    { id: '153-predict-candidate', checkpointId: 'first-candidate', prompt: '默认输入有 5 项，left=0、right=4，第一次 mid 是多少？', answer: { kind: 'int', value: 2 }, explanation: 'mid=0+(4-0)/2=2，中点是下标，不是元素值 -4。' },
    { id: '153-predict-result', checkpointId: 'final-result', prompt: '默认输入最终 left=right=2，方法应返回什么？', answer: { kind: 'int', value: -4 }, explanation: '返回 nums[2]=-4，不能返回下标 2。' },
  ],
  guided: { id: '153-guided', finalCheck: 'real-java-submit', stages: [
    { id: '153-guided-mid', instruction: '支架 1 / 3：补全中点公式，说明 int 除法怎样取整。', scaffoldSource: guidedMid, checkKind: 'static-practice' },
    { id: '153-guided-boundary', instruction: '支架 2 / 3：删除 TODO 异常，依据比较结果补全两种边界更新。', scaffoldSource: guidedBoundary, checkKind: 'static-practice' },
    { id: '153-guided-whole', instruction: '支架 3 / 3：从方法骨架实现整体算法，提交完整 Java 接受真实判定。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '153-error-discard', description: '把右边界写成 mid-1，以为每次都应该排除中点。', counterexampleInputId: '153-mid-minimum', explanation: '初始 mid=2 正是唯一最小值 -4。改成 mid-1 后永远找不回它，错误夹具返回 6。' },
    { id: '153-error-index', description: '找到位置后直接 return left。', counterexampleInputId: '153-single', explanation: '[8] 的位置是 0，题目要求的元素值却是 8；应返回 nums[left]。' },
    { id: '153-error-stall', description: 'nums[mid]>nums[right] 时写 left=mid。', counterexampleInputId: '153-two-rotated', explanation: '[5,-2] 中 left=0、right=1、mid=0。left=mid 什么也没有改变，会重复同一状态直到真实 runner 超时；mid 已不可能最小，应令 left=mid+1。' },
    { id: '153-error-rotation', description: '假定一定旋转，找不到相邻下降就返回 -1。', counterexampleInputId: '153-sorted', explanation: '[-3,0,4,7] 没有下降仍是合法输入，最小值 -3 在首项；区间二分无需特殊寻找旋转次数。' },
  ],
  testSuite: { version: PROBLEM_META['153'].testSuiteVersion, cases, wrongFixtures: [
    { id: '153-wrong-discard-mid', source: WRONG_DISCARD_MID_SOURCE, targetedCaseIds: ['153-mid-minimum'] },
    { id: '153-wrong-return-index', source: WRONG_RETURN_INDEX_SOURCE, targetedCaseIds: ['153-single', '153-mid-minimum', '153-zero'] },
  ] },
  visualization: { modelId: '153-right-anchor-binary-search', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson153;
