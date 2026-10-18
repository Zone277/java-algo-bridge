import { PROBLEM_META, type HouseRobberInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson198 = Extract<Lesson, { id: '198' }>;

export const demoInputs: { id: string; title: string; input: HouseRobberInput }[] = [
  { id: 'mixed-parity', title: '不能只选奇数或偶数位置：2, 1, 1, 2', input: { nums: [2, 1, 1, 2] } },
  { id: 'five-houses', title: '取或不取的前缀比较：2, 7, 9, 3, 1', input: { nums: [2, 7, 9, 3, 1] } },
  { id: 'single-zero', title: '单间且金额为零', input: { nums: [0] } },
];

const cases: Lesson198['testSuite']['cases'] = [
  { id: 'mixed-parity', input: { nums: [2, 1, 1, 2] }, expected: { kind: 'int', value: 4 }, coverage: '最优选下标 0 和 3，跨越奇偶组；固定奇偶总和只能得到 3。也是默认手算和首个错误夹具的反例。' },
  { id: 'single-zero', input: { nums: [0] }, expected: { kind: 'int', value: 0 }, coverage: '最小长度与最小金额；允许不选，不能访问 nums[1]。' },
  { id: 'single-positive', input: { nums: [7] }, expected: { kind: 'int', value: 7 }, coverage: '单间非零：第一轮应完成，最终返回第一间金额。' },
  { id: 'two-first', input: { nums: [9, 4] }, expected: { kind: 'int', value: 9 }, coverage: '两间相邻，只能取较大的前项；检测错误滚动顺序导致把相邻值相加。' },
  { id: 'two-last', input: { nums: [2, 8] }, expected: { kind: 'int', value: 8 }, coverage: '两间中的后项更大，不能固定保留第一间或漏掉最后一轮。' },
  { id: 'all-zero', input: { nums: [0, 0, 0, 0, 0] }, expected: { kind: 'int', value: 0 }, coverage: '每轮取与不取都平局；最优金额仍为零，不能把未初始化与零混淆。' },
  { id: 'five-houses', input: { nums: [2, 7, 9, 3, 1] }, expected: { kind: 'int', value: 12 }, coverage: '多轮递推：选下标 0、2、4 得到 12，检查 take 必须使用前两段的最优值。' },
  { id: 'adjacent-large', input: { nums: [1, 9, 8, 1] }, expected: { kind: 'int', value: 10 }, coverage: '两个大值相邻不能同时取；选择 9 与末尾 1 比 1 与 8 更好。' },
  { id: 'skip-middle', input: { nums: [4, 1, 2, 9, 1] }, expected: { kind: 'int', value: 13 }, coverage: '全局最优选 4 和 9，不能按每对房屋局部贪心或强制隔一间就取。' },
  { id: 'separated-peaks', input: { nums: [6, 1, 1, 6, 1, 1, 6] }, expected: { kind: 'int', value: 18 }, coverage: '最优跨两个连续空缺，可选择下标 0、3、6，体现不相邻而非固定步长。' },
  { id: 'all-equal', input: { nums: [5, 5, 5, 5, 5] }, expected: { kind: 'int', value: 15 }, coverage: '重复金额仍代表不同位置；奇数个房屋需取 ceil(n/2) 项。' },
  { id: 'zero-gap', input: { nums: [8, 0, 0, 8] }, expected: { kind: 'int', value: 16 }, coverage: '首尾在线性街道不相邻，可同时取；错误使用环形约束会少算。' },
  { id: 'maximum-houses', input: { nums: Array.from({ length: 100 }, () => 400) }, expected: { kind: 'int', value: 20000 }, coverage: '100 间且每间 400 的本站上限；最大合法总额 20000，可由 Java int 表示，真实 runner 不受 30 项演示限制。' },
];

export const WRONG_FIXED_PARITY_SOURCE = `class Solution {
    public int rob(int[] nums) {
        int even = 0;
        int odd = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i % 2 == 0) even += nums[i];
            else odd += nums[i];
        }
        return Math.max(even, odd);
    }
}
`;

export const WRONG_OVERWRITE_SOURCE = `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            twoBack = oneBack;
            oneBack = Math.max(oneBack, twoBack + nums[i]);
        }
        return oneBack;
    }
}
`;

const guidedChoices = `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            int take = /* TODO：选当前，应与哪个旧值相加？ */;
            int skip = /* TODO：不选当前，沿用哪个旧值？ */;
            int next = Math.max(skip, take);
            twoBack = oneBack;
            oneBack = next;
        }
        return oneBack;
    }
}
`;

const guidedShift = `class Solution {
    public int rob(int[] nums) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 0; i < nums.length; i++) {
            int take = twoBack + nums[i];
            int skip = oneBack;
            int next = Math.max(skip, take);
            // TODO：先保存旧 oneBack，再把 next 放入 oneBack。
        }
        return oneBack;
    }
}
`;

export const lesson198 = {
  schemaVersion: 1,
  id: '198', slug: 'house-robber', title: '打家劫舍', order: 22,
  lessonVersion: PROBLEM_META['198'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '用 Java int 局部变量、int[] 参数、for 和 Math.max 表达取或不取的两种选择。',
    '以“前 k 间的最优金额”定义状态，区分数量 k 与数组下标 i。',
    '从两种互斥情况推导递推，并在覆盖变量时保留正确的旧前缀值。',
  ],
  source: { platform: 'LeetCode', number: 198, url: 'https://leetcode.com/problems/house-robber/' },
  taskSemantics: '一条直街上的房屋从左到右排列，nums[i] 表示第 i 个位置存放的金额。可以选择若干位置，但不能同时选择两个相邻位置，因为相邻房屋共用警报。返回在这个限制下能够取得的最大总金额；只需返回金额，不必返回所选下标。不会额外把首尾连成环；只有两间房屋时，两者仍相邻，不能同时选择。题意参考 LeetCode 198，本站题面、示例、推导与代码为原创教学表达，无官方关联。',
  siteLimits: { description: '本站真实判题接受 1—100 间房屋，每间整数金额 0—400，与本题约定一致。最大可能结果为 20000，可用 Java int 保存。参考演示最多 30 间；31—100 间仍可真实编译运行。', inputSchemaId: 'HouseRobberInput' },
  steps: [
    {
      id: '198-syntax-method', kind: 'syntax', title: 'J1 / J2 · int 方法与局部变量',
      body: 'public int rob(int[] nums) 返回一个 int 金额。与 C 函数相似，return oneBack 会结束方法并交回结果；本站提供可信 main 调用器，学生不负责读取 JSON。int twoBack=0、int oneBack=0 保存的是基本整数值，不是对象引用。局部变量必须先明确赋值再读取；Math.max(a,b) 返回两者较大者，不会修改传入变量。打印 PASS 不是返回结果，也不参与判题。',
      relatedIds: ['J1', 'J2'],
    },
    {
      id: '198-syntax-array', kind: 'syntax', title: 'J3 · 数组长度、下标与按值传递',
      body: 'nums 保存数组对象的引用值；Java 把该引用值的副本传入方法，不复制数组对象。nums.length 是项数，合法下标为 0 到 nums.length-1。for (int i=0; i<nums.length; i++) 逐间处理，nums[i] 是当前 int 元素。参考解法只读取数组。oneBack=next 则复制一个 int 基本值；它既不复制数组，也不改变 nums 的引用。',
      relatedIds: ['J3'],
    },
    {
      id: '198-understanding', kind: 'understanding', title: '读题与手算 · 不相邻不等于固定奇偶',
      body: '本站输入 {"nums":[2,1,1,2]} 会由调用器转成 int[]。若只选偶数下标 0、2，可得 3；只选奇数下标 1、3，也得 3。但下标 0 与 3 不相邻，选它们可得 4。因此输出是 {"kind":"int","value":4}。允许中间连续跳过多间，不要求每隔一间必选。输入 [8,0,0,8] 可同时选首尾得到 16，因为这是一条直街。',
      relatedIds: ['mixed-parity', 'zero-gap'],
    },
    {
      id: '198-derivation-state', kind: 'derivation', title: '先定义状态 · 前 k 间能得到多少',
      body: '可以枚举每间“选或不选”，丢掉选了相邻位置的方案，再取金额最大值；但直接枚举会有大量重复的前缀问题。定义 D(k) 为只考虑前 k 间（下标 0…k-1）时的最大金额，空前缀 D(0)=0。状态返回的是金额，不是最近一间的值，也不是必须选择最近一间。对默认输入，D(0…4) 依次为 [0,2,2,3,4]；D(3)=3 对应选下标 0 与 2，D(4)=4 则改为选下标 0 与 3。',
      relatedIds: ['mixed-parity'],
    },
    {
      id: '198-derivation-transition', kind: 'derivation', title: '推导 · 取当前与不取当前',
      body: '处理下标 i 时，所有合法方案恰分两类：不取当前，金额最多是前 i 间的 D(i)；取当前，就不能取 i-1，前面只能接前 i-1 间的最优金额 D(i-1)，再加 nums[i]。于是 D(i+1)=max(D(i), D(i-1)+nums[i])。第一间没有左邻居，为统一写法约定 D(-1)=0；这只是数学基例，不会访问 nums[-1]。两类覆盖所有合法方案，而各自前缀已经最优，因此可以取较大值。',
      relatedIds: ['two-first', 'single-zero'],
    },
    {
      id: '198-derivation-rolling', kind: 'derivation', title: '不变量 · 每次赋值改变了哪个前缀',
      body: '每轮开始（处理下标 i 前）：oneBack=D(i)，twoBack=D(max(0,i-1))。先算 take=twoBack+nums[i]、skip=oneBack，再把较大值保存为 next=D(i+1)。此时两个滚动变量仍是旧值。执行 twoBack=oneBack 后，两者暂时都等于 D(i)；执行 oneBack=next 后才变成下一轮需要的 D(i)、D(i+1)。不能跳过这个中间状态，也不能先覆盖 twoBack 再算 take。参考代码每间做固定次工作，时间 O(n)，只保存固定个 int，额外空间 O(1)。教学 DP 表用于解释前缀定义，并不表示参考 Java 分配了数组。',
      relatedIds: ['two-first', 'five-houses'],
    },
    {
      id: '198-prediction', kind: 'prediction', title: '先预测，再揭示 · 首个最优值与最终金额',
      body: '先在第一轮预测 max(take,skip) 的 next；再根据所选输入预测最终返回金额。默认 [2,1,1,2] 的两个答案分别是 2 与 4。切换到 [0] 时两个答案都变成 0。检查点从当前输入的快照动态取值，回答后才揭示；预测练习不是 Java 执行结果。',
      relatedIds: ['198-predict-first', '198-predict-final'],
    },
    {
      id: '198-reference', kind: 'reference-demo', title: '参考演示 · 逐个看旧值的保存与覆盖',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。数组、变量、D(k) 教学表、解释与代码高亮全部读取同一份不可变快照。先看 take/skip，再看 next，最后分别看 twoBack 与 oneBack 的两次赋值；上一步完整恢复旧值。播放、暂停、重置和输入切换只控制参考模型的快照。D(k) 是教学账本：空前缀 D(0)=0 单独列为教学基例，表格状态 i 对应 D(i+1)，与数组下标 i 对齐。Java 实际使用滚动 int；学生编辑的源码会走独立真实执行通道，不会变成本图的执行轨迹。',
      relatedIds: demoInputs.map(demo => demo.id),
    },
    {
      id: '198-guided-step', kind: 'guided-code', title: '引导编写 · 两种选择、移动状态、完整提交',
      body: '第一段补 take 和 skip，先练习相邻限制；第二段补两次滚动赋值，练习保存旧值；第三段从空方法开始。支架本身是静态练习，不比较所填字符串是否等于参考答案。最终提交完整 Solution 到真实 Docker runner，javac 编译后由可信调用器读取 rob 的 int 返回值；正确的数组 DP 或其他实现也可以通过本站测试。',
      relatedIds: ['198-guided'],
    },
    {
      id: '198-independent', kind: 'independent-code', title: '独立挑战 · 用反例检查思路',
      body: '独立模式只有方法骨架，与引导草稿分别保存。先运行 [2,1,1,2] 检查是否误用固定奇偶，再运行 [9,4] 检查是否把相邻金额加起来，再提交全部本站测试。编译失败时按 javac 的源码行定位；错误答案时看输入、实际值与期望值；超时或异常不是部分通过。修改源码后要重新运行，旧源码的成功不能代表新源码。',
      relatedIds: ['J8', 'mixed-parity', 'two-first'],
    },
    {
      id: '198-summary', kind: 'summary', title: '复盘 · 用前缀定义解释每一个值',
      body: '请回答：D(k) 的 k 是数量还是下标？为什么 take 不能使用旧 oneBack？twoBack=oneBack 后、oneBack=next 前两个变量各表示什么？[2,1,1,2] 为什么能打破固定奇偶策略？页面分别保存预测、提示使用、查看答案、引导通过与独立通过本站测试。播放动画不代表写出了代码，通过本站测试也不声称通过 LeetCode 官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '6c3532c0ace8fcd3a012157bfa809ee1802f265ed8bc0cf296a08563b55e724c',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '198-hint-choice', level: 1, body: '先问当前房屋选不选。选它时，左边哪一间必须排除？不选它时，哪个已解决的前缀可以直接沿用？' },
    { id: '198-hint-invariant', level: 2, body: '处理 i 前保持 oneBack=D(i)、twoBack=D(max(0,i-1))。take 使用 twoBack，skip 使用 oneBack，二者比较得到 next。' },
    { id: '198-hint-pseudocode', level: 3, body: '两个旧值初始均为 0；逐项：take=twoBack+当前金额，skip=oneBack，next=max(skip,take)；twoBack=oneBack；oneBack=next；最后返回 oneBack。' },
  ],
  predictionChecks: [
    { id: '198-predict-first', prompt: '默认 [2,1,1,2]，第一轮 take=0+2、skip=0，next 是多少？', answer: { kind: 'int', value: 2 }, explanation: '只考虑第一间时，选择金额 2 比不选的 0 更好，D(1)=2。', checkpointId: 'first-prefix' },
    { id: '198-predict-final', prompt: '默认 [2,1,1,2]，处理所有房屋后返回的 oneBack 是多少？', answer: { kind: 'int', value: 4 }, explanation: '最优选择下标 0 和 3，它们不相邻；总金额为 4。', checkpointId: 'final-result' },
  ],
  guided: {
    id: '198-guided', finalCheck: 'real-java-submit',
    stages: [
      { id: '198-guided-choices', instruction: '支架 1 / 3：补取当前与不取当前的候选金额。先用 [9,4] 确认不会同时选相邻房屋。', scaffoldSource: guidedChoices, checkKind: 'static-practice' },
      { id: '198-guided-shift', instruction: '支架 2 / 3：next 已保存新最优值，补两次赋值以正确移动两个旧前缀。', scaffoldSource: guidedShift, checkKind: 'static-practice' },
      { id: '198-guided-whole', instruction: '支架 3 / 3：从骨架完成全部方法，最终将完整 Java 提交到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  commonErrors: [
    { id: '198-error-parity', description: '只比较偶数下标总和与奇数下标总和。', counterexampleInputId: 'mixed-parity', explanation: '[2,1,1,2] 两组都只有 3；下标 0 和 3 不相邻却横跨奇偶，金额是 4。合法方案不局限于固定奇偶。' },
    { id: '198-error-overwrite', description: '先 twoBack=oneBack，再用 twoBack+nums[i] 计算候选。', counterexampleInputId: 'two-first', explanation: '[9,4] 在第二轮会把旧 D(1)=9 当作 D(0)，错误得到 13。应先用旧 twoBack 算 next，再移动变量。' },
    { id: '198-error-always-first', description: '默认第一间一定要选，之后固定隔间取。', counterexampleInputId: 'two-last', explanation: '[2,8] 最好不选第一间而选第二间得到 8；每个前缀都要比较选与不选。' },
    { id: '198-error-circular', description: '错误地把首间和末间也视为相邻。', counterexampleInputId: 'zero-gap', explanation: '[8,0,0,8] 的首尾可同时选，正确为 16。本题为直线排列，环形街道是另一道题。' },
  ],
  testSuite: {
    version: PROBLEM_META['198'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '198-wrong-fixed-parity', source: WRONG_FIXED_PARITY_SOURCE, targetedCaseIds: ['mixed-parity', 'skip-middle', 'separated-peaks'] },
      { id: '198-wrong-overwrite', source: WRONG_OVERWRITE_SOURCE, targetedCaseIds: ['two-first', 'five-houses', 'all-equal'] },
    ],
  },
  visualization: { modelId: '198-rolling-prefix-dp', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson198;
