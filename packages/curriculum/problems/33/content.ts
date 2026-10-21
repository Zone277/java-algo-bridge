import { RotatedSearchInputSchema, PROBLEM_META, expectedOutput, type RotatedSearchInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson33 = Extract<Lesson, { id: '33' }>;
type Case33 = Lesson33['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RotatedSearchInput }[] = [
  { id: 'left-segment', title: '目标在旋转点之前：查找 11', input: { nums: [8, 11, 14, -5, -2, 1, 4], target: 11 } },
  { id: 'right-segment', title: '目标在旋转点之后：查找 1', input: { nums: [8, 11, 14, -5, -2, 1, 4], target: 1 } },
  { id: 'absent', title: '值域中有空缺：查找 6', input: { nums: [3, 5, 7, 9, -4, -2, 0], target: 6 } },
  { id: 'single', title: '单项也需要检查：查找 7', input: { nums: [7], target: 7 } },
];

function testCase(id: string, raw: RotatedSearchInput, coverage: string): Case33 {
  const input = RotatedSearchInputSchema.parse(raw);
  const expected = expectedOutput('33', input);
  if (expected.kind !== 'int') throw new Error('33 expected output must be int');
  return { id, input, expected, coverage };
}

const cases: Case33[] = [
  testCase('33-left-segment', demoInputs[0]!.input, '左半跨越旋转点，目标不在有序右半值域内；必须向左保留原下标。'),
  testCase('33-right-segment', demoInputs[1]!.input, '左半跨越旋转点，目标落入有序右半值域；必须向右继续查找。'),
  testCase('33-left-range', { nums: [3, 5, 7, 9, -4, -2, 0], target: 5 }, '左半有序且目标在其中；保留左半并排除已检查过的中点。'),
  testCase('33-discard-left', { nums: [3, 5, 7, 9, -4, -2, 0], target: -2 }, '左半有序但目标属于旋转后的右半；不能仅按 target 小于中点而向左。'),
  testCase('33-absent-gap', demoInputs[2]!.input, '目标落在整体最小值和最大值之间仍可能不存在；区间为空返回 -1。'),
  testCase('33-sorted-first', { nums: [-9, -3, 2, 8], target: -9 }, '未旋转合法；目标等于左端点，值域判断必须包含左端等号。'),
  testCase('33-sorted-last', { nums: [-9, -3, 2, 8], target: 8 }, '未旋转时不断排除左半，最后一个候选必须被循环检查。'),
  testCase('33-single-found', demoInputs[3]!.input, '最短合法输入只有一项，命中返回下标 0，而非元素值 7。'),
  testCase('33-single-absent', { nums: [7], target: 9 }, '单项未命中，left 可以等于 length，但不能读取这个哨兵位置。'),
  testCase('33-two-first', { nums: [9, -3], target: 9 }, '两项旋转且 mid=left，首轮就命中，必须立即返回原下标 0。'),
  testCase('33-two-last', { nums: [9, -3], target: -3 }, '两项旋转；left=mid 的单项左半也有序，必须使用 <= 判断。'),
  testCase('33-mid-hit', { nums: [8, 11, 14, -5, -2, 1, 4], target: -5 }, '首轮中点就是目标，返回下标 3，不把元素值 -5 当作答案。'),
  testCase('33-extremes', { nums: [10000, -10000, 0], target: -10000 }, '覆盖输入数值上下界与负目标，比较大小而不是按正负号划段。'),
  testCase('33-absent-outside', { nums: [3, 5, 7, 9, -4, -2, 0], target: -10000 }, '目标小于所有元素，仍须正常收缩后返回 -1，不能读取负下标。'),
  testCase('33-thirty', { nums: [...Array.from({ length: 13 }, (_, i) => i + 17), ...Array.from({ length: 17 }, (_, i) => i)], target: 0 }, '演示上限 30 项，所有快照保留完整数组和原下标，不截断输入。'),
  testCase('33-length-limit', { nums: [...Array.from({ length: 2501 }, (_, i) => i - 1), ...Array.from({ length: 2499 }, (_, i) => i - 2500)], target: 2499 }, '真实执行上限 5000 项；目标返回原数组下标 2500，演示明确拒绝超限输入。'),
];

export const WRONG_SORTED_SEARCH_SOURCE = `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
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

export const WRONG_RETURN_VALUE_SOURCE = REFERENCE_SOURCE.replace('return mid;', 'return nums[mid];');

const guidedMid = REFERENCE_SOURCE.replace('int mid = left + (right - left) / 2;', 'int mid = /* TODO：计算闭区间的中点 */ left;');
const guidedRanges = REFERENCE_SOURCE.replace('nums[left] <= target && target < nums[mid]', '/* TODO：目标是否在有序左半的值域 */ false').replace('nums[mid] < target && target <= nums[right]', '/* TODO：目标是否在有序右半的值域 */ false');

export const lesson33 = {
  schemaVersion: 1, id: '33', slug: 'search-in-rotated-sorted-array', title: '搜索旋转排序数组', order: 26,
  lessonVersion: PROBLEM_META['33'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '用 Java 的 int[]、整数中点、复合条件与返回值表达旋转数组查找。',
    '先识别有序的一半，再用目标值域证明可以排除哪一半。',
    '维护目标若存在则仍在候选闭区间内的不变量，用反例修复边界和返回值错误。',
  ],
  source: { platform: 'LeetCode', number: 33, url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  taskSemantics: '一列互不相同的整数原先严格递增，把前面连续若干项整体移到末尾，或保持原序，得到 nums。给定整数 target，请找出它在当前 nums 中的下标；不存在时返回 -1。目标是利用顺序设计 O(log n) 查找。题意参考 LeetCode 33，本站题面、示例、讲解与代码原创，与原平台无官方关联。',
  siteLimits: { description: '本站 nums 长度 1—5000，元素与 target 都是 -10000—10000 的整数；nums 无重复且为严格升序数组的循环旋转，允许未旋转。空数组、重复值与任意乱序不属于本题契约。参考演示最多 30 项；长数组可真实运行，演示不会截断输入。', inputSchemaId: 'RotatedSearchInputSchema' },
  steps: [
    { id: '33-syntax-method', kind: 'syntax', title: 'Java 必要语法 · 数组、基本值与方法', body: 'public int search(int[] nums, int target) 接收整数数组与整数目标，返回 int。nums 保存数组引用值，nums[i]、target、left、right、mid 都是 int 基本值。Java 参数按值传递：传入 nums 时复制引用值，不复制数组对象；本参考只读取对象中的元素。nums.length 是长度，合法下标为 0 到 length-1。写 class Solution 中的方法即可，调用器负责传参，不需要 main，打印结果不能代替 return。', relatedIds: ['J1', 'J3'] },
    { id: '33-syntax-conditions', kind: 'syntax', title: 'Java 必要语法 · while、&& 与提前返回', body: 'while (left <= right) 让最后一个候选也被检查。mid=left+(right-left)/2 用 int 除法舍去非负小数部分。== 比较整数是否相等；&& 要求两侧条件同时成立，并在左侧为 false 时短路。Java 不能写 a<=target<b，必须写 a<=target && target<b。return mid 返回下标并立即结束整个方法；return -1 表示未找到，不是读取 nums[-1]。mid 在循环体内声明，循环外不能使用它。', relatedIds: ['J2', 'J8'] },
    { id: '33-understand', kind: 'understanding', title: '读题 · 返回旋转后的原下标', body: '输入 {"nums":[8,11,14,-5,-2,1,4],"target":11}，数组来自 [-5,-2,1,4,8,11,14] 的旋转。11 现在位于下标 1，所以输出 1，不是 11，也不是它在排序前的下标 5。相同数组查找 6 得到 -1。未旋转的数组同样合法。数组长度为 1 时也必须判断是否命中。本题没有重复值；不能直接把本规则和复杂度保证套用到含重复值的版本。', relatedIds: ['33-left-segment', '33-single-found'] },
    { id: '33-manual', kind: 'understanding', title: '手工模拟 · 大于中点也可能要向左找', body: '对 [8,11,14,-5,-2,1,4] 查找 11：left=0、right=6，mid=3，nums[mid]=-5 未命中。nums[left]=8 大于 -5，左半跨越旋转点，右半 [-5,-2,1,4] 有序。11 不满足 -5<11<=4，所以排除右半，令 right=2。再取 mid=1，nums[1]=11，返回 1。若按 704 的整体升序规则，因为 11>-5 就令 left=4，会立即丢掉目标。', relatedIds: ['left-segment', '33-left-segment'] },
    { id: '33-derive', kind: 'derivation', title: '推导 · 有序的一半提供可靠的值域', body: '逐项扫描可用 O(n) 时间、O(1) 空间找到目标，是检查答案的简单办法；但题目希望用旋转的结构缩小候选。旋转数组至多有一处相邻下降。中点未命中后，若 nums[left]<=nums[mid]，左半 [left,mid] 有序；只有 nums[left]<=target<nums[mid] 时目标才可能在左半，否则排除左半。若 nums[left]>nums[mid]，下降处在左半，右半 [mid,right] 必有序；只有 nums[mid]<target<=nums[right] 时保留右半，否则排除右半。值域包含目标只是“可能存在”，不保证没有空缺，仍需继续比较。', relatedIds: ['33-left-range', '33-discard-left', '33-right-segment', '33-absent-gap'] },
    { id: '33-invariant', kind: 'derivation', title: '不变量 · 目标若存在，位置仍在闭区间内', body: '初始化 [0,n-1] 覆盖所有候选。每轮先检查 mid 是否命中；未命中才按有序一半的值域排除不可能的部分，所以目标若存在仍在 [left,right]。mid 已排除，向右写 left=mid+1，向左写 right=mid-1；这里与 153 保留最小候选 mid 的规则不同。left=mid 的单项左半也有序，因此判有序要用 <=。每次留下的候选最多为原长度的一半向下取整，O(log n) 时间、O(1) 额外空间。区间为空说明不存在；left=n 或 right=-1 是边界哨兵，不读取数组。复杂度是排除证明的结论，不能由几次运行计时证明。', relatedIds: ['33-two-last', '33-single-absent'] },
    { id: '33-predict', kind: 'prediction', title: '先预测，再揭示中点与返回下标', body: '预测第一次 mid 下标，再预测最终返回下标或 -1。两个检查点随当前输入重新生成；即使单项输入或第一轮命中，也分别在计算 mid 和执行 return 前检查。预测仅是学习检查，不是学生源码的执行判定。', relatedIds: ['33-predict-mid', '33-predict-result'] },
    { id: '33-reference', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、原数组、left/right 候选区间、mid、代码高亮和说明来自同一不可变快照。分支条件只显示在求值步骤，更新边界后清除条件展示，避免把旧结果误读成按新边界重算。mid 在边界移动后仍是本轮旧值；下一轮检测时离开作用域并清除。上一步恢复保存的状态，输入切换创建新轨迹。学生编辑代码不会改变该参考模型，真实结果来自独立 Docker javac/java 通道。', relatedIds: demoInputs.map(demo => demo.id) },
    { id: '33-guided-intro', kind: 'guided-code', title: '引导编写 · 中点、值域、完整算法', body: '先补中点公式，再补两个有序半区的值域条件，最后从方法骨架写出完整算法。不要把“这半边有序”和“目标在这半边”混为一谈。每阶段都编辑完整 Java；教学确认只记录练习，最终引导通过必须提交完整源码到真实 runner。功能正确的其他合法实现可通过，不按是否填写了参考字符串判定。', relatedIds: ['33-guided'] },
    { id: '33-independent', kind: 'independent-code', title: '独立编写 · 从失败中定位问题', body: '从空方法骨架开始，先运行旋转前后两段的目标，再运行单项、两项和缺失目标。编译错误检查 &&、分号和方法签名；运行异常检查访问 nums.length 或 -1；错误答案检查是否误套普通二分、是否把值当下标；超时检查边界是否排除了 mid。修改代码后重新执行，旧请求不能为新源码记通过。Docker 不可用时显示 RUNNER_UNAVAILABLE，不在宿主执行学生源码，也不把参考动画当成真实成功。', relatedIds: ['J8', '33-left-segment', '33-two-last'] },
    { id: '33-summary', kind: 'summary', title: '复盘 · 先证明哪一半有序，再决定去留', body: '请解释为什么至少一半有序、为什么有序不代表包含目标、为何端点要带等号而 mid 必须排除。独立编写并通过本站测试不代表通过 LeetCode 官方评测。提示、答案查看、预测、引导通过和独立通过分别记录，刷新后恢复草稿与进度；浏览页面或播放动画不等于掌握。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '94e77fb4538ff62108f46788ee9d2f52a9fa412a9f9d0b8330033295a16b76c4', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '33-hint-1', level: 1, body: '旋转只引入至多一个下降处。用 mid 分开区间后，哪一半一定不会跨过下降处？先比较 nums[left] 与 nums[mid]。' },
    { id: '33-hint-2', level: 2, body: '先检查 mid 是否命中。左半有序时用 nums[left]<=target<nums[mid] 判断是否保留左半；否则右半有序，用 nums[mid]<target<=nums[right] 判断是否保留右半。' },
    { id: '33-hint-3', level: 3, body: 'left=0，right=n-1；while left<=right：计算 mid，命中返回 mid；判断有序一半及 target 的值域，向右 left=mid+1，向左 right=mid-1；循环结束返回 -1。用 && 连接两个值域比较。' },
  ],
  predictionChecks: [
    { id: '33-predict-mid', checkpointId: 'first-mid', prompt: '默认输入 left=0、right=6，第一轮 mid 是多少？', answer: { kind: 'int', value: 3 }, explanation: '0+(6-0)/2=3，是下标 3，不是元素 -5。' },
    { id: '33-predict-result', checkpointId: 'final-result', prompt: '默认输入查找 11，最终返回哪个整数？', answer: { kind: 'int', value: 1 }, explanation: '11 位于当前数组下标 1，返回下标而不是元素值。' },
  ],
  guided: { id: '33-guided', finalCheck: 'real-java-submit', stages: [
    { id: '33-guided-mid', instruction: '支架 1 / 3：补出闭区间的 mid，并解释为什么最后一个候选仍要检查。', scaffoldSource: guidedMid, checkKind: 'static-practice' },
    { id: '33-guided-ranges', instruction: '支架 2 / 3：补出有序左半与右半的目标值域判断，检查端点等号。', scaffoldSource: guidedRanges, checkKind: 'static-practice' },
    { id: '33-guided-whole', instruction: '支架 3 / 3：从骨架组织完整查找；提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '33-error-sorted', description: '直接把普通升序二分搬到旋转数组，仅比较 target 和 nums[mid]。', counterexampleInputId: '33-left-segment', explanation: '默认输入 mid=3、值为 -5，目标 11 比它大，却在左侧下标 1；普通二分向右后只能返回 -1。' },
    { id: '33-error-value', description: '命中后返回 nums[mid]，把元素值当作位置。', counterexampleInputId: '33-single-found', explanation: '[7] 查找 7 应返回下标 0；返回元素 7 属于错误答案，打印正确文本也无法改变判定。' },
    { id: '33-error-left-equal', description: '用 nums[left]<nums[mid] 判断左半有序，漏掉单项区间。', counterexampleInputId: '33-two-last', explanation: '[9,-3] 第一轮 left=mid=0，左半单项有序；用严格小于会误判右半有序并删除下标 1 的目标。' },
    { id: '33-error-last', description: '写 while (left<right) 并直接在循环外返回 -1，漏查最后一个候选。', counterexampleInputId: '33-single-found', explanation: '[7] 初始 left=right=0；若用严格小于就不进入循环，明明存在的目标会被报告缺失。' },
    { id: '33-error-stall', description: '向右收缩写 left=mid，未排除已比较过的中点。', counterexampleInputId: '33-two-last', explanation: '[9,-3] 的 mid=0，写 left=mid 后没有进展，真实执行会超时；应写 left=mid+1。' },
  ],
  testSuite: { version: PROBLEM_META['33'].testSuiteVersion, cases, wrongFixtures: [
    { id: '33-wrong-sorted-search', source: WRONG_SORTED_SEARCH_SOURCE, targetedCaseIds: ['33-left-segment', '33-discard-left', '33-two-last'] },
    { id: '33-wrong-return-value', source: WRONG_RETURN_VALUE_SOURCE, targetedCaseIds: ['33-single-found', '33-left-segment', '33-mid-hit'] },
  ] },
  visualization: { modelId: '33-sorted-half-search', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson33;
