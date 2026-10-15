import { PROBLEM_META, type Lesson, type MaximumSubarrayInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type MaximumSubarrayLesson = Extract<Lesson, { id: '53' }>;

export const demoInputs: { id: string; title: string; input: MaximumSubarrayInput }[] = [
  { id: 'mixed-restart', title: '重新开始并延长：[-2,1,-3,4,-1,2,1,-5,4]', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] } },
  { id: 'all-negative', title: '全是负数：[-8,-3,-6,-2,-5,-4]', input: { nums: [-8, -3, -6, -2, -5, -4] } },
  { id: 'short-valley', title: '跨过小跌幅：[5,-2,4]', input: { nums: [5, -2, 4] } },
];

const cases: MaximumSubarrayLesson['testSuite']['cases'] = [
  { id: 'single-negative', input: { nums: [-7] }, expected: { kind: 'int', value: -7 }, coverage: '最小长度且全负：答案必须是一个非空子数组，不能凭空选 0。' },
  { id: 'single-positive', input: { nums: [9] }, expected: { kind: 'int', value: 9 }, coverage: '单项正数：初始化之后无需进入循环。' },
  { id: 'all-negative-case', input: { nums: [-8, -3, -6, -2, -5, -4] }, expected: { kind: 'int', value: -2 }, coverage: '全负数：选最大的一项，而不是 0 或全部元素之和。' },
  { id: 'classic-mixed', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expected: { kind: 'int', value: 6 }, coverage: '混合值：在 4 处重启，再延长到 [4,-1,2,1]。' },
  { id: 'all-positive', input: { nums: [1, 2, 3, 4] }, expected: { kind: 'int', value: 10 }, coverage: '全正数：整段相加应最优。' },
  { id: 'all-zero', input: { nums: [0, 0, 0] }, expected: { kind: 'int', value: 0 }, coverage: '零值和并列最优：0 可以来自非空数组。' },
  { id: 'best-in-prefix', input: { nums: [8, -1, -20, 2, 3] }, expected: { kind: 'int', value: 8 }, coverage: '历史最优在前面：后续 current 下降或重启时 best 不应丢失。' },
  { id: 'best-in-suffix', input: { nums: [-5, 2, 3] }, expected: { kind: 'int', value: 5 }, coverage: '最佳段在尾部：应抛弃前面的负前缀。' },
  { id: 'cross-small-valley', input: { nums: [5, -2, 4] }, expected: { kind: 'int', value: 7 }, coverage: '跨过较小负值：连续段可以含负数，不能只取最大单项。' },
  { id: 'restart-after-loss', input: { nums: [3, -10, 4, 5] }, expected: { kind: 'int', value: 9 }, coverage: '大幅下跌之后重启，不能强迫保留失利的前缀。' },
  { id: 'equal-best', input: { nums: [2, -2, 2] }, expected: { kind: 'int', value: 2 }, coverage: '并列最优：返回和，不要求指定唯一区间。' },
  { id: 'value-bounds', input: { nums: [10000, -10000, 10000] }, expected: { kind: 'int', value: 10000 }, coverage: '本站单项上界与下界，同时检查负项后恢复。' },
];

export const WRONG_EMPTY_ALLOWED_SOURCE = `class Solution {
    public int maxSubArray(int[] nums) {
        int current = 0;
        int best = 0;
        for (int value : nums) {
            current = Math.max(0, current + value);
            best = Math.max(best, current);
        }
        return best;
    }
}
`;

export const WRONG_MAX_ELEMENT_SOURCE = `class Solution {
    public int maxSubArray(int[] nums) {
        int best = nums[0];
        for (int value : nums) {
            best = Math.max(best, value);
        }
        return best;
    }
}
`;

export const WRONG_NONCONTIGUOUS_SOURCE = `class Solution {
    public int maxSubArray(int[] nums) {
        int sum = 0;
        int largest = nums[0];
        for (int value : nums) {
            if (value > 0) sum += value;
            largest = Math.max(largest, value);
        }
        return sum > 0 ? sum : largest;
    }
}
`;

const guidedChooseEnding = `class Solution {
    public int maxSubArray(int[] nums) {
        int current = nums[0];
        int best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int value = nums[i];
            // TODO：在“从 value 重启”和“旧 current 加 value”之间选择，以 i 结尾。
            best = Math.max(best, current);
        }
        return best;
    }
}
`;

const guidedKeepHistory = `class Solution {
    public int maxSubArray(int[] nums) {
        int current = nums[0];
        int best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int value = nums[i];
            current = Math.max(value, current + value);
            // TODO：用新的 current 更新历史最优 best，不能把 best 清零。
        }
        return best;
    }
}
`;

export const lesson53 = {
  schemaVersion: 1,
  id: '53',
  slug: 'maximum-subarray',
  title: '最大子数组和',
  order: 14,
  lessonVersion: PROBLEM_META['53'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '写出接收 int[] 并返回 int 的 Java 方法，正确使用 length、索引、局部变量和循环。',
    '区分“必须以当前位置结尾”的 current 和“已经见过的全局最优”best。',
    '解释非空与连续两项约束，并处理全负数及重启/延长决策。',
  ],
  source: { platform: 'LeetCode', number: 53, url: 'https://leetcode.com/problems/maximum-subarray/' },
  taskSemantics: '给定整数数组 nums，选取至少一个元素组成的连续片段，返回该片段的最大元素和。片段在原数组中必须相邻；不能跳过中间的负数，也不能选择空片段。题意参考 LeetCode 53，本课叙述、手算、推导、图形与代码为本站原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站输入是 JSON {"nums":[...]}：1—10000 项，每项 -10000—10000；学生方法接收 int[]，无需自行解析 JSON。最大可能和为 100000000，处于 Java int 范围。参考演示最多 30 项、2000 快照；更长的合法输入仍可真实运行。', inputSchemaId: 'MaximumSubarrayInput' },
  steps: [
    { id: 'syntax-method-array', kind: 'syntax', title: 'J1 / J2 / J3 · 方法、数组与 int', body: 'public int maxSubArray(int[] nums) 定义接收 int[] 引用值、返回 int 基本值的方法。本站可信调用器负责 main 和数组构造，你只需写 class Solution。nums.length 是数组长度属性，不加括号；nums[i] 是第 i 项，下标从 0 开始。局部 int 变量必须赋初值才能读取。Java 参数按值传递：传入数组时复制的是引用值，本题只读取元素，不改原数组对象。return best; 返回整数，打印文字不能代替返回值。', relatedIds: ['J1', 'J2', 'J3'] },
    { id: 'syntax-loop-max', kind: 'syntax', title: '循环边界与 Math.max', body: '从 nums[0] 初始化两个状态后，for (int i=1; i<nums.length; i++) 只处理余下各项。Math.max(a,b) 返回较大 int，不会自动改动 a 或 b；因此要写 current = Math.max(value, current + value)。本站最多 10000 项，每项绝对值最多 10000，所有片段和都在 Java int 范围内。', relatedIds: ['J2', 'J8'] },
    { id: 'understanding-contiguous', kind: 'understanding', title: '原创题面、输入输出与手工模拟', body: '输入 nums=[-2,1,-3,4,-1,2,1,-5,4]，输出 6，因为连续的 [4,-1,2,1] 合计 6。手算从第 0 项开始：current=-2，best=-2；到 1 时重启，current=1，best=1；到 -3 时延长得到 -2，best 仍为 1；到 4 时重启，current=4，best=4；随后加 -1、2、1 得到 3、5、6。遇到 -5 仍可保留以该项结尾的和 1，但 best 保持 6。全负数 [-8,-3,-6,-2,-5,-4] 的答案是 -2，而非空片段不能得到 0。', relatedIds: ['mixed-restart', 'all-negative'] },
    { id: 'derivation-ending', kind: 'derivation', title: '推导 · 固定片段的末尾', body: '朴素办法枚举每个起点和终点，逐段求和，容易重复劳动。固定末尾 i，最优连续段只有两种来源：单独使用 nums[i]；或把 nums[i] 接到“以 i-1 结尾的最大和”后面。于是 current = max(nums[i], oldCurrent + nums[i])。处理 i 后，current 是所有以 i 结尾的非空连续段中的最大和；best = max(oldBest, current) 是所有末尾不超过 i 的非空连续段中的最大和。先更新 current，再更新 best，不能把历史 best 直接覆盖成 current。', relatedIds: ['restart-after-loss', 'best-in-prefix'] },
    { id: 'derivation-initial-and-complexity', kind: 'derivation', title: '非空边界、证明与复杂度', body: '第 0 项时唯一可选的非空段就是 [nums[0]]，所以 current=best=nums[0]。若全为负数，公式仍会挑最大的一项；若从 0 初始化，相当于非法地允许空段。递推对“以 i 结尾”的两种可能已穷尽，best 再比较全部结束位置，故返回的就是所求。每项执行固定次操作，时间 O(n)、Java 解法额外空间 O(1)。界面保存历史快照用于教学，不算进 Java 解法的空间复杂度。', relatedIds: ['single-negative', 'all-negative-case'] },
    { id: 'prediction-current-best', kind: 'prediction', title: '先预测，再揭示两个状态', body: '默认输入中，先预测只处理第 0 项时 current 的值，再预测扫描完全部元素时 best 的值。切换演示输入会根据那份输入的新轨迹生成答案，作答后才揭示。预测来自预置参考状态模型，不是对学生 Java 源码的执行。', relatedIds: ['predict-initial-current', 'predict-final-best'] },
    { id: 'reference-kadane-demo', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组、当前索引、current、best、片段边界教学标记、解释与高亮代码全部来自同一份不可变快照。片段边界是界面推导标记，并非 Java 参考代码中的额外变量。前进、后退、播放、暂停、重置及切换输入只选取或重建参考轨迹；学生源码的真实结果通过另一个 runner 通道取得。', relatedIds: ['mixed-restart', 'all-negative', 'short-valley'] },
    { id: 'guided-kadane', kind: 'guided-code', title: '分三段补全，再提交完整 Java', body: '第一段给出循环，只补“重启还是延长”的 current 更新；第二段给出 current 更新，只补保存历史 best；第三段撤去支架，从方法骨架写完整方法。静态练习不按填写字符串与参考答案是否相同判通过。最后把完整 Solution.java 提交真实 runner，让 Docker 内 javac 与 java 执行本站用例。', relatedIds: ['guided-max-subarray'] },
    { id: 'independent-kadane', kind: 'independent-code', title: '独立模式 · 方法骨架起步', body: '独立草稿只包含方法签名和待实现异常，不预填参考循环。先试单元素、全负数、跨小跌幅，再提交本站所有用例。编译错误看 javac 行号；运行异常检查下标；全负数返回 0 通常是误允许空片段；[5,-2,4] 返回 9 说明把不相邻的正数凑在一起。只有当前源码真实运行通过才记录“独立通过本站测试”。', relatedIds: ['single-negative', 'all-negative-case', 'cross-small-valley'] },
    { id: 'summary-kadane', kind: 'summary', title: '复盘 · 用不变量解释代码', body: '请说明 current 为何必须以当前 i 结尾，best 为何允许停留在此前元素；为什么遇负数不一定立刻重启；为什么全负数仍有合法答案。本站分别记录预测、提示、看答案、引导通过与独立通过本站测试；播放演示不等于掌握，通过本站测试也不代表 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'dcd6a594a27c9c5630a900cfdd421950068751981a0ac324ecb114c75029fecd',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: 'hint-fix-ending', level: 1, body: '固定当前元素为片段末尾。最优片段要么只含它，要么接在上一个位置的某个连续段后面。' },
    { id: 'hint-two-states', level: 2, body: 'current 只看必须以 i 结尾的段；best 保存此前所有位置的历史最大和。两个变量都从 nums[0] 初始化。' },
    { id: 'hint-kadane-pseudocode', level: 3, body: 'current=best=nums[0]；从 i=1 扫描：current=max(nums[i], current+nums[i])，best=max(best,current)；返回 best。' },
  ],
  predictionChecks: [
    { id: 'predict-initial-current', prompt: '默认 nums 以 -2 开头，只处理第 0 项后 current 是多少？', answer: { kind: 'int', value: -2 }, explanation: '必须选非空片段；目前唯一片段是 [-2]，所以 current=-2。', checkpointId: 'initial-current' },
    { id: 'predict-final-best', prompt: '默认数组全部扫描完后 best 是多少？', answer: { kind: 'int', value: 6 }, explanation: '连续片段 [4,-1,2,1] 的和为 6，超过其他候选段。', checkpointId: 'final-result' },
  ],
  guided: {
    id: 'guided-max-subarray',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-ending-choice', instruction: '支架 1 / 3：补写 current 更新，比较只取 value 与延长旧 current 两种连续段。', scaffoldSource: guidedChooseEnding, checkKind: 'static-practice' },
      { id: 'guided-history-update', instruction: '支架 2 / 3：补写 best 更新；就算当前段变差，也保留前面的历史最优。', scaffoldSource: guidedKeepHistory, checkKind: 'static-practice' },
      { id: 'guided-full-solution', instruction: '支架 3 / 3：从方法骨架完整实现，再把完整 Java 交给真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-allow-empty', description: '把 current 和 best 都初始化成 0，误允许空片段。', counterexampleInputId: 'all-negative-case', explanation: '[-8,-3,-6,-2,-5,-4] 必须选择至少一项，结果为 -2；0 不是任何非空连续段的和。' },
    { id: 'error-only-single', description: '只找最大单项，忽略可延长的连续段。', counterexampleInputId: 'cross-small-valley', explanation: '[5,-2,4] 的最大单项是 5，但完整连续段和为 7。' },
    { id: 'error-skip-negative', description: '把所有正数相加，跳过中间负数，得到不连续的“子序列”。', counterexampleInputId: 'cross-small-valley', explanation: '[5,-2,4] 不能跳过 -2 把 5 与 4 相加；最大合法和是 7，不是 9。' },
    { id: 'error-forget-best', description: '把历史最优直接覆盖为当前段，丢失先前更好的片段。', counterexampleInputId: 'best-in-prefix', explanation: '[8,-1,-20,2,3] 的前缀 [8] 已得 8；最后 current 为 5 时，best 仍须是 8。' },
  ],
  testSuite: {
    version: PROBLEM_META['53'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-empty-allowed', source: WRONG_EMPTY_ALLOWED_SOURCE, targetedCaseIds: ['single-negative', 'all-negative-case'] },
      { id: 'wrong-single-element-only', source: WRONG_MAX_ELEMENT_SOURCE, targetedCaseIds: ['cross-small-valley', 'all-positive'] },
      { id: 'wrong-noncontiguous-positive-sum', source: WRONG_NONCONTIGUOUS_SOURCE, targetedCaseIds: ['cross-small-valley', 'classic-mixed'] },
    ],
  },
  visualization: { modelId: '53-kadane', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
