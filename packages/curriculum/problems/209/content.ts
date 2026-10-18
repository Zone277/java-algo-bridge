import { PROBLEM_META, type Lesson, type MinimumSubarrayInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type MinimumSubarrayLesson = Extract<Lesson, { id: '209' }>;

export const demoInputs: { id: string; title: string; input: MinimumSubarrayInput }[] = [
  { id: 'repeated-shrink-demo', title: '达标后反复收缩：target=7，[2,3,1,2,4,3]', input: { target: 7, nums: [2, 3, 1, 2, 4, 3] } },
  { id: 'no-answer-demo', title: '整段仍不够：target=100，[1,2,3,4]', input: { target: 100, nums: [1, 2, 3, 4] } },
  { id: 'single-answer-demo', title: '单项就达标：target=8，[1,1,1,8]', input: { target: 8, nums: [1, 1, 1, 8] } },
];

const cases: MinimumSubarrayLesson['testSuite']['cases'] = [
  { id: '209-repeated-shrink', input: { target: 7, nums: [2, 3, 1, 2, 4, 3] }, expected: { kind: 'int', value: 2 }, coverage: '同一右端可能需要多次缩短左端，最终 [4,3] 长度为 2；仅用 if 会漏解。' },
  { id: '209-single-exact', input: { target: 7, nums: [7] }, expected: { kind: 'int', value: 1 }, coverage: '单元素恰达标；缩短后窗口为空，不能再访问 nums[left]。' },
  { id: '209-single-over', input: { target: 7, nums: [9] }, expected: { kind: 'int', value: 1 }, coverage: '单元素超过 target 也有效，判定不是只接受相等。' },
  { id: '209-single-under', input: { target: 7, nums: [6] }, expected: { kind: 'int', value: 0 }, coverage: '单元素不够；未找到答案时应返回 0，而非 length+1 哨兵。' },
  { id: '209-no-answer', input: { target: 100, nums: [1, 2, 3, 4] }, expected: { kind: 'int', value: 0 }, coverage: '整个数组的和仍不足，收缩分支一次也不进入。' },
  { id: '209-whole-array', input: { target: 10, nums: [1, 2, 3, 4] }, expected: { kind: 'int', value: 4 }, coverage: '只有整个数组恰好达标，检查闭区间长度 right-left+1。' },
  { id: '209-over-target', input: { target: 7, nums: [4, 4] }, expected: { kind: 'int', value: 2 }, coverage: '没有任何和等于 target 的区间，但 [4,4] 的和 8 已满足至少为 7。' },
  { id: '209-late-single', input: { target: 8, nums: [1, 1, 1, 8] }, expected: { kind: 'int', value: 1 }, coverage: '末尾一项即答案；固定右端必须连续去掉多个左端元素。' },
  { id: '209-middle-removals', input: { target: 11, nums: [1, 2, 3, 4, 5] }, expected: { kind: 'int', value: 3 }, coverage: '最佳区间 [3,4,5]，先扩展至达标，再收缩到第一次不达标。' },
  { id: '209-contiguous-only', input: { target: 10, nums: [5, 1, 1, 5] }, expected: { kind: 'int', value: 4 }, coverage: '两端的 5 不相邻，不能当成长度 2 的子序列；只能选连续整段。' },
  { id: '209-repeated-values', input: { target: 6, nums: [2, 2, 2, 2] }, expected: { kind: 'int', value: 3 }, coverage: '重复值和多个同样长度答案，返回长度即可。' },
  { id: '209-minimum-target', input: { target: 1, nums: [1, 2, 3] }, expected: { kind: 'int', value: 1 }, coverage: 'target 的最小边界；每一轮都可能收缩成空窗口。' },
  { id: '209-maximum-value', input: { target: 20000, nums: [10000, 10000, 10000] }, expected: { kind: 'int', value: 2 }, coverage: '元素取本站上界，验证整数求和和并列答案。' },
  { id: '209-maximum-target', input: { target: 1000000000, nums: [10000, 10000] }, expected: { kind: 'int', value: 0 }, coverage: 'target 取上界；不因为目标大就猜测输入非法或返回哨兵。' },
  { id: '209-maximum-length', input: { target: 100000000, nums: Array<number>(10000).fill(10000) }, expected: { kind: 'int', value: 10000 }, coverage: '本站长度与元素同时取上界，总和 100000000 在 Java int 范围内；此例只做真实运行，不截断成演示。' },
];

export const WRONG_SINGLE_SHRINK_SOURCE = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = nums.length + 1;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            if (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == nums.length + 1 ? 0 : best;
    }
}
`;

export const WRONG_EQUALS_ONLY_SOURCE = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = nums.length + 1;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum == target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == nums.length + 1 ? 0 : best;
    }
}
`;

const guidedCondition = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = nums.length + 1;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (/* TODO：当前窗口何时达标并且还应尝试缩短？ */) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == nums.length + 1 ? 0 : best;
    }
}
`;

const guidedShrink = `class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int left = 0;
        int sum = 0;
        int best = nums.length + 1;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                // TODO：先记录当前长度，再从 sum 扣除旧左端，最后移动 left。
                throw new UnsupportedOperationException("请补全收缩步骤并删除此行");
            }
        }
        return best == nums.length + 1 ? 0 : best;
    }
}
`;

export const lesson209 = {
  schemaVersion: 1,
  id: '209', slug: 'minimum-size-subarray-sum', title: '长度最小的子数组', order: 21,
  lessonVersion: PROBLEM_META['209'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '用 Java 方法接收 int target 和 int[] nums，返回最短长度，区分返回值与打印内容。',
    '说明连续子数组与可跳过元素的子序列不同，并解释正数条件为什么允许单向滑动窗口。',
    '维护窗口和、左/右边界与最短长度，在达标后反复收缩，并处理无解与单元素答案。',
  ],
  source: { platform: 'LeetCode', number: 209, url: 'https://leetcode.com/problems/minimum-size-subarray-sum/' },
  taskSemantics: '给定正整数 target 和只含正整数的数组 nums，找出元素和至少为 target 的最短非空连续片段，返回它的长度；不存在这样的片段时返回 0。原数组顺序不能改变，不能跳过中间元素。题意参考 LeetCode 209，题面、示例解释、推导、图形与参考代码由本站原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站输入为 JSON {"target":7,"nums":[2,3,1,2,4,3]}。target 为 1—1000000000；nums 为 1—10000 项，每项 1—10000（严格正数）。学生方法无需解析 JSON。最大数组和为 100000000，Java int 足够保存；负数和零不属于本题输入契约。参考演示最多 30 项、2000 快照；更长的合法数组仍可在真实 runner 中执行。', inputSchemaId: 'MinimumSubarrayInput' },
  steps: [
    { id: '209-syntax-method', kind: 'syntax', title: 'J1 / J3 · 参数、数组与返回长度', body: 'public int minSubArrayLen(int target, int[] nums) 声明返回 int 基本值的方法。target 参数保存整数值；nums 参数保存数组引用值。Java 参数按值传递，传递数组时复制的是引用值。本题只读取数组元素，不需要改变数组或创建另一个数组。可信调用器负责 main 和构造输入，你编写 class Solution 与规定方法。nums.length 是数组长度属性，nums[i] 是下标为 i 的元素；return 返回最短长度，System.out.println 不能代替返回值。', relatedIds: ['J1', 'J3'] },
    { id: '209-syntax-while', kind: 'syntax', title: 'J2 · while、赋值次序与哨兵', body: 'for 的 right 从 0 开始，只在 right < nums.length 时访问 nums[right]。sum += nums[right] 把整数加到局部变量 sum；while (sum >= target) 会在每次收缩后重新判断，不等同于只做一次的 if。先 sum -= nums[left] 再 left++，才能移除原来的左端值。Math.min(a,b) 只返回较小值，需要赋回 best。best 初值设 nums.length+1，表示尚无答案；结尾用条件表达式 best == nums.length+1 ? 0 : best 转为返回结果。', relatedIds: ['J2', 'J8'] },
    { id: '209-understand', kind: 'understanding', title: '原创题面 · 连续地积累直到达标', body: '把 nums 看成按时间排列的正数记录，要求截取一段相邻记录使总数至少达到 target，并让记录数量最少。target=7、nums=[2,3,1,2,4,3] 的答案为 2，因为最后的 [4,3] 达标；没有单项达到 7。target=10、nums=[5,1,1,5] 必须选整个连续段，答案为 4，不能跳过两个 1 把两端 5 拼成子序列。输出是长度，不是区间和、下标或数组本身。', relatedIds: ['repeated-shrink-demo', '209-contiguous-only'] },
    { id: '209-hand-simulation', kind: 'understanding', title: '手工模拟 · 同一个右端可以缩短多次', body: '默认示例起初 left=0、sum=0、best=7。right 依次到 0、1、2 时 sum 为 2、5、6，均不足；right=3 时加入 2 得 8，先记长度 4，再移除 2，使 left=1、sum=6。right=4 加入 4 后 sum=10：先检查长度 4，移除 3 得 7，仍达标，继续检查长度 3，再移除 1 得 6。right=5 加入 3 后 sum=9，先检查长度 3，移除 2 得 7，再检查长度 2，移除 4 得 3，停止收缩。最终 best=2。', relatedIds: ['repeated-shrink-demo'] },
    { id: '209-derive-window', kind: 'derivation', title: '推导 · 正数使两端只向右移动', body: '朴素方法枚举每个左端，再向右累加到达标，最坏 O(n²)。这里的所有元素严格为正：右端加入一项会使 sum 增加；左端删除一项会使 sum 减少。于是右端每次扩一项，达标时立即记录长度并不断右移左端；一旦不达标，继续删除只会更差，必须扩展右端。删除某个左端前，它在当前右端构成的有效长度已经记录；未来使用同一左端只会更长，不可能改善答案，因此 left 不必回退。若允许负数，此推理不成立；例如扩展可能让 sum 变小。', relatedIds: ['J2', '209-repeated-shrink'] },
    { id: '209-invariant', kind: 'derivation', title: '不变量 · 区间、最短历史与语句之间的状态', body: '每次判断内层 while 时，sum 恰好是闭区间 [left,right] 的和（left=right+1 时为空且 sum=0）；best 保存所有已检查的达标区间中的最短长度，尚无答案则是 length+1。先记录 right-left+1，再减旧左端、移动 left，才重新满足该循环边界不变量。执行减法之后而 left++ 之前，sum 临时对应 [left+1,right]；演示用独立的“sum 区间”标记说明这一瞬间，不能提前移动 Java 变量。内层循环结束后，best 已覆盖到当前右端的所有可能改进。两个指针各最多前进 n 次，时间 O(n)、Java 额外空间 O(1)；界面保存快照属于教学播放器开销。', relatedIds: ['209-single-exact', '209-no-answer'] },
    { id: '209-predict', kind: 'prediction', title: '先预测，再揭示窗口的变化', body: '先预测第一项加入后 sum 的值，再预测第一次达标并删除旧左端之后的 sum。没有达标区间的输入，第二问改为预测最终返回值。答案由当前输入的参考快照计算，切换输入后会变化。预测属于教学检查，不会把引导或独立模式标为通过。', relatedIds: ['209-predict-expand', '209-predict-contract'] },
    { id: '209-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。整数数组、left/right 指针、sum、best、求和区间、解释与参考代码高亮都读取同一不可变快照。sumStart/sumEndExclusive 是说明 sum 当前包含哪些项的演示标记，不是参考 Java 的额外局部变量。前进、后退、播放、暂停、重置与切换输入均复用现有播放器；学生修改源码不会改变这份预置模型，其真实结果来自另一条 Docker 编译执行通道。', relatedIds: ['repeated-shrink-demo', 'no-answer-demo', 'single-answer-demo'] },
    { id: '209-guided', kind: 'guided-code', title: '三段引导 · 从条件到完整方法', body: '第一段补 while 条件，第二段补记录长度、移除旧左端和移动 left，第三段只保留方法骨架。每段自检只是静态学习练习；最终必须把完整 Java Solution 提交真实 runner，由 javac 编译、java 运行并检查返回值。允许不同正确实现，不根据填入字符串是否与参考答案一致判通过。', relatedIds: ['209-guided-task'] },
    { id: '209-independent', kind: 'independent-code', title: '独立模式 · 从方法骨架开始', body: '独立编辑器初始只给方法签名。先运行单项、无解、多次收缩与超过 target 的输入；错误结果要比较实际返回长度和预期。编译失败看 javac 行号；越界异常检查是否先移动 left 后才读取旧左端；超时检查内层循环是否真的使 sum 变小。修正后重新提交本站测试。引导与独立草稿分别保存并支持刷新恢复，只有当前源码的真实 submit 结果可以记录对应通过。', relatedIds: ['209-single-exact', '209-repeated-shrink', '209-over-target'] },
    { id: '209-summary', kind: 'summary', title: '复盘 · 用正数前提解释每次移动', body: '请解释为什么达标后用 while 而不是 if，为什么长度是 right-left+1，为什么 sum 必须包括连续区间，以及为什么无解要从哨兵转为 0。试说明负数会破坏哪一步单调性推导。提示使用、查看答案、引导通过和独立通过本站测试分别保存；播放参考动画不等于掌握，通过本站测试也不代表 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'e49b9874c8c38f93ecb648a4efc4a1e8f478a1e520702c033455061e2161477a', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '209-hint-concept', level: 1, body: '元素全为正数。加入右端一项与删除左端一项，分别会怎样改变窗口和？达标后应该寻找更长还是更短的区间？' },
    { id: '209-hint-invariant', level: 2, body: '用 left/right 表示连续区间，sum 保存它的和，best 保存已经找到的最短达标长度。达标时先记答案，再不断移除旧左端，直到 sum < target。' },
    { id: '209-hint-pseudocode', level: 3, body: 'left=0，sum=0，best=n+1；依次枚举 right：sum+=nums[right]；当 sum>=target，best=min(best,right-left+1)，sum-=nums[left]，left++。扫描完若 best 仍为 n+1 返回 0，否则返回 best。' },
  ],
  predictionChecks: [
    { id: '209-predict-expand', checkpointId: 'first-expansion', prompt: '默认输入 target=7、nums=[2,3,1,2,4,3]，第一次加入 nums[right] 后 sum 是多少？', answer: { kind: 'int', value: 2 }, explanation: '起初 sum=0，right=0，加入 nums[0]=2 后 sum=2。' },
    { id: '209-predict-contract', checkpointId: 'first-contraction', prompt: '默认输入第一次达标时 sum=8、left=0。执行 sum -= nums[left] 后，新 sum 是多少？', answer: { kind: 'int', value: 6 }, explanation: '减掉旧左端 nums[0]=2，sum 变为 6；left 还没有移动，下一条 left++ 才把 left 改为 1。' },
  ],
  guided: { id: '209-guided-task', finalCheck: 'real-java-submit', stages: [
    { id: '209-guided-condition', instruction: '支架 1 / 3：补 while 条件。至少为 target 就有效，收缩后必须再次判断。', scaffoldSource: guidedCondition, checkKind: 'static-practice' },
    { id: '209-guided-shrink', instruction: '支架 2 / 3：补最短长度更新，再移除旧左端、移动 left；删除 TODO 异常。', scaffoldSource: guidedShrink, checkKind: 'static-practice' },
    { id: '209-guided-whole', instruction: '支架 3 / 3：从骨架写出完整方法，最终提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '209-error-if', description: '达标后只收缩一次，用 if 代替 while。', counterexampleInputId: '209-repeated-shrink', explanation: '默认示例得到 4，错过同一右端还能继续缩成的 [4,3] 长度 2；每次删除后都须重新判断。' },
    { id: '209-error-equals', description: '只允许 sum == target，忽略超过目标的合法区间。', counterexampleInputId: '209-over-target', explanation: 'target=7、nums=[4,4] 的和 8 已满足“至少为 7”，答案应为 2，不是 0。' },
    { id: '209-error-continuity', description: '排序或跳过中间小值，选最大的若干元素凑够目标。', counterexampleInputId: '209-contiguous-only', explanation: '[5,1,1,5] 的两个 5 不相邻，不能作为长度 2 的连续子数组；target=10 时答案是 4。' },
    { id: '209-error-order', description: '先 left++ 再 sum -= nums[left]，减错元素，甚至越界。', counterexampleInputId: '209-single-exact', explanation: '[7] 达标后若先 left++ 就会读取 nums[1]。必须先扣除旧左端值，再移动边界。' },
    { id: '209-error-sentinel', description: '无解时直接返回 best，忘记转换 length+1 哨兵。', counterexampleInputId: '209-no-answer', explanation: 'target=100、[1,2,3,4] 没有答案，5 只是内部标记，规定返回值应为 0。' },
  ],
  testSuite: { version: PROBLEM_META['209'].testSuiteVersion, cases, wrongFixtures: [
    { id: '209-wrong-single-shrink', source: WRONG_SINGLE_SHRINK_SOURCE, targetedCaseIds: ['209-repeated-shrink', '209-late-single'] },
    { id: '209-wrong-equals-only', source: WRONG_EQUALS_ONLY_SOURCE, targetedCaseIds: ['209-over-target', '209-single-over'] },
  ] },
  visualization: { modelId: '209-positive-window', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies MinimumSubarrayLesson;
