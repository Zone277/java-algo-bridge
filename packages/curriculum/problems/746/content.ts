import { PROBLEM_META, type Lesson, type MinCostStairsInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson746 = Extract<Lesson, { id: '746' }>;

export const demoInputs: { id: string; title: string; input: MinCostStairsInput }[] = [
  { id: 'three-stairs', title: '直接从位置 1 出发：10,15,20', input: { cost: [10, 15, 20] } },
  { id: 'mixed-parity', title: '路径会切换奇偶：1,100,1,1,100,1', input: { cost: [1, 100, 1, 1, 100, 1] } },
  { id: 'two-zero', title: '最短输入与零费用', input: { cost: [0, 0] } },
];

const cases: Lesson746['testSuite']['cases'] = [
  { id: 'three-stairs', input: { cost: [10, 15, 20] }, expected: { kind: 'int', value: 15 }, coverage: '默认手算：直接从 1 跳到顶楼；顶楼 n 不在 cost 数组中。' },
  { id: 'mixed-parity', input: { cost: [1, 100, 1, 1, 100, 1] }, expected: { kind: 'int', value: 4 }, coverage: '路径 0→2→3→5→6 混合奇偶，打破只取偶数或奇数台阶的错误策略。' },
  { id: 'start-one', input: { cost: [10, 1] }, expected: { kind: 'int', value: 1 }, coverage: '长度为 2 且从 1 开始更省，检测固定从 0 出发的错误基例。' },
  { id: 'start-zero', input: { cost: [1, 10] }, expected: { kind: 'int', value: 1 }, coverage: '长度为 2 且从 0 开始更省，检测总是从 1 出发或忘记两步选项。' },
  { id: 'two-zero', input: { cost: [0, 0] }, expected: { kind: 'int', value: 0 }, coverage: '最小长度与零费用；两个预测检查点即使答案相同也应各自存在。' },
  { id: 'free-path', input: { cost: [0, 8, 0, 8] }, expected: { kind: 'int', value: 0 }, coverage: '沿 0→2→4 免费到顶楼；不能无条件累加途经但没落脚的台阶。' },
  { id: 'equal-three', input: { cost: [5, 5, 5] }, expected: { kind: 'int', value: 5 }, coverage: '重复费用仍是不同位置；从 1 走两步一次付款即可，不必踩最后一级。' },
  { id: 'increasing', input: { cost: [1, 2, 3, 4] }, expected: { kind: 'int', value: 4 }, coverage: '递增费用下到达状态序列为 0,0,1,2,4，检查滚动赋值与顶楼最后一轮。' },
  { id: 'adjacent-cheap', input: { cost: [9, 1, 1, 9, 1] }, expected: { kind: 'int', value: 3 }, coverage: '最优需要连续走两个廉价台阶；不是每次固定走两步，也不是只选一种奇偶。' },
  { id: 'free-middle', input: { cost: [999, 0, 999] }, expected: { kind: 'int', value: 0 }, coverage: '从中间零费用台阶直接到顶楼；不用支付起点之前或跳过台阶的费用。' },
  { id: 'expensive-barrier', input: { cost: [0, 999, 999, 0] }, expected: { kind: 'int', value: 999 }, coverage: '连续两级高费用无法同时跳过；允许的最大步长确实为 2。' },
  { id: 'long-mixed', input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] }, expected: { kind: 'int', value: 6 }, coverage: '多轮状态滚动与多次奇偶切换，检测局部最便宜或覆盖旧状态的错误。' },
  { id: 'maximum-cost', input: { cost: Array.from({ length: 1000 }, () => 999) }, expected: { kind: 'int', value: 499500 }, coverage: '1000 级与单级 999 上界，最少付款 500 次；Java int 足够，真实判题不受 30 项演示限制。' },
];

export const WRONG_FIXED_PARITY_SOURCE = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int even = 0;
        int odd = 0;
        for (int i = 0; i < cost.length; i++) {
            if (i % 2 == 0) even += cost[i];
            else odd += cost[i];
        }
        return Math.min(even, odd);
    }
}
`;

export const WRONG_FIXED_START_SOURCE = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int[] arrival = new int[cost.length + 1];
        arrival[1] = cost[0];
        for (int i = 2; i <= cost.length; i++) {
            arrival[i] = Math.min(arrival[i - 1] + cost[i - 1],
                                  arrival[i - 2] + cost[i - 2]);
        }
        return arrival[cost.length];
    }
}
`;

const guidedChoices = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 2; i <= cost.length; i++) {
            int fromOne = /* TODO：从 i-1 来，支付哪个 cost？ */;
            int fromTwo = /* TODO：从 i-2 来，支付哪个 cost？ */;
            int next = Math.min(fromOne, fromTwo);
            twoBack = oneBack;
            oneBack = next;
        }
        return oneBack;
    }
}
`;

const guidedShift = `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int twoBack = 0;
        int oneBack = 0;
        for (int i = 2; i <= cost.length; i++) {
            int fromOne = oneBack + cost[i - 1];
            int fromTwo = twoBack + cost[i - 2];
            int next = Math.min(fromOne, fromTwo);
            // TODO：把两个滚动变量推进一个位置，保留旧值。
        }
        return oneBack;
    }
}
`;

export const lesson746 = {
  schemaVersion: 1, id: '746', slug: 'min-cost-climbing-stairs', title: '使用最小花费爬楼梯', order: 25,
  lessonVersion: PROBLEM_META['746'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '正确解释可选起点、台阶收费与顶楼位置，区分费用最小与路径计数。',
    '用到达位置的最小费用定义状态，由最后一步或两步推导递推。',
    '用 Java int 与 Math.min 实现滚动 DP，按语句顺序保留旧值并提交完整代码。',
  ],
  source: { platform: 'LeetCode', number: 746, url: 'https://leetcode.com/problems/min-cost-climbing-stairs/' },
  taskSemantics: '一段楼梯有 n 个带费用的台阶，下标为 0…n-1，cost[i] 是离开台阶 i 并向上走时必须支付的费用。每次可走 1 级或 2 级，可以选择台阶 0 或台阶 1 作为起点。目标是到达位置 n 的顶楼，返回最小总费用。起点可免费到达，但从它继续向上仍要付款；跳过的台阶不用付款。顶楼没有费用项 cost[n]。本题求费用，不求走法数量。题意参考 LeetCode 746，本站题面、推导与示例为原创表达，无官方关联。',
  siteLimits: { description: '本站真实判题接受 2—1000 个台阶，每级费用为 0—999 的整数。结果不超过 499500，Java int 足够；参考演示最多 30 级，31—1000 级仍可真实运行。', inputSchemaId: 'MinCostStairsInput' },
  steps: [
    { id: '746-syntax-method', kind: 'syntax', title: 'J1 / J2 · 返回费用的 int 方法',
      body: 'public int minCostClimbingStairs(int[] cost) 返回最小费用。本站调用器负责把输入转换为参数，无需学生写 main。int twoBack=0 保存基本整数值，不是对象引用；Math.min(a,b) 返回两者较小值，不改变 a 或 b。oneBack=next 复制 int 的值，return oneBack 结束方法并返回该值。打印答案或 PASS 不能代替返回值。', relatedIds: ['J1', 'J2'] },
    { id: '746-syntax-array', kind: 'syntax', title: 'J3 · 数组引用、长度与合法下标',
      body: 'cost 是保存数组引用值的变量，方法参数按值传递这个引用值；数组对象不会被自动复制。cost.length 是台阶数 n，数组合法下标只有 0…n-1。for (int i=2; i<=cost.length; i++) 中 i 是本轮要到达的位置，最后一轮 i=n 合法，因为读取的是 cost[i-1] 和 cost[i-2]，并不读取 cost[i]。局部 int 与数组引用要分别理解。', relatedIds: ['J2', 'J3'] },
    { id: '746-understanding', kind: 'understanding', title: '手算 · 到达起点免费，离开起点付款',
      body: '输入 {"cost":[10,15,20]}，顶楼位置是 3。从 0→2→3 要付 10+20=30；从 1→3 只付 15，所以输出 {"kind":"int","value":15}。不必从 0 开始，也不必踏上最后一级台阶 2。[1,100,1,1,100,1] 的路径 0→2→3→5→6 付 4，比固定偶数或奇数下标的费用 102 都小；每次能自行选择走一或两级。', relatedIds: ['three-stairs', 'mixed-parity'] },
    { id: '746-derivation-state', kind: 'derivation', title: '定义状态 · 到达而非离开',
      body: '枚举全部路径会重复求解很多相同位置的问题。定义 D(i) 为到达位置 i、尚未支付离开 i 的费用时的最小累计费用。可任选 0 或 1 起步，所以 D(0)=D(1)=0；这不是说 cost[0] 和 cost[1] 都免收。默认例的 D(0…3)=[0,0,10,15]：到位置 2 最省是从 0 走两级付 10，到顶楼 3 最省是从 1 走两级付 15。', relatedIds: ['three-stairs', 'start-one'] },
    { id: '746-derivation-transition', kind: 'derivation', title: '推导 · 最后一步来自哪里',
      body: '到达 i 的最后一次移动只能来自 i-1 或 i-2。从 i-1 来的总费用为 D(i-1)+cost[i-1]；从 i-2 来的为 D(i-2)+cost[i-2]。前缀路径如果不是最省，就可换成更省的路径而不影响最后一步，因此 D(i)=min(这两个候选)。算到 i=n 后直接返回 D(n)，不用再付款。与 70 的“走法数量相加”不同，本题对费用候选取最小值。', relatedIds: ['three-stairs', 'expensive-barrier'] },
    { id: '746-derivation-invariant', kind: 'derivation', title: '不变量 · 覆盖前先保存 next',
      body: '每轮开始 twoBack=D(i-2)、oneBack=D(i-1)。先计算 fromOne 和 fromTwo，再以 next 保存 D(i)；此时两个滚动值仍旧。执行 twoBack=oneBack 后，两个变量暂时都等于 D(i-1)，只有再执行 oneBack=next 才得到下一轮所需的 D(i-1)、D(i)。不能先覆盖旧值再计算候选。每个位置做固定次工作，时间 O(n)、额外空间 O(1)；显示的 DP 表是教学账本，不是参考 Java 分配的数组。', relatedIds: ['increasing', 'long-mixed'] },
    { id: '746-prediction', kind: 'prediction', title: '先预测，再揭示 · 第一次递推与顶楼答案',
      body: '先预测第一次 next=D(2)，再预测最终 oneBack=D(n)。默认输入的两次答案为 10、15；切换到混合奇偶输入后为 1、4。答案来自当前输入的快照，先作答再揭示。相同数值的两个检查点也分别记录；预测正确不代表 Java 编译或执行通过。', relatedIds: ['746-predict-first', '746-predict-final'] },
    { id: '746-reference', kind: 'reference-demo', title: '参考演示 · 两条到达路径和两次赋值',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。数组、变量表、教学 DP 表、代码高亮与解释来自同一不可变快照。cost 的两个标记是候选来源 i-2、i-1，不把顶楼 n 画成数组元素。基例 D(0)、D(1) 单列；表格状态 k 对应 D(k+2)。下一步、上一步、播放、暂停、重置和切换输入都作用于参考快照；倒退恢复赋值前的值。学生源码在独立通道真实执行，本演示不跟踪学生程序。', relatedIds: demoInputs.map(demo => demo.id) },
    { id: '746-guided-step', kind: 'guided-code', title: '引导编写 · 候选费用、滚动更新、完整方法',
      body: '先补从前一位置与前两位置到达的费用，再补 twoBack、oneBack 的滚动更新，最后从空方法完成。支架是静态练习，不按填写字符串是否等于参考答案判题。最终提交完整 Solution 到真实 Docker runner，由 javac 编译、java 执行后读取 int 返回值。完整数组 DP 等不同正确写法也能通过本站测试。', relatedIds: ['746-guided'] },
    { id: '746-independent', kind: 'independent-code', title: '独立练习 · 先暴露错误，再修正',
      body: '独立模式从方法骨架开始，与引导草稿分开。先用 [10,1] 检查是否固定从 0 开始，再用混合奇偶反例检查贪心假设，然后提交本站测试。编译失败看源码行号；错误答案核对实际与期望；异常或超时需要单独排查。修改源码后重新运行，旧结果不能代表新源码。Docker 不可用时不能把参考演示当作执行通过。', relatedIds: ['J8', 'start-one', 'mixed-parity'] },
    { id: '746-summary', kind: 'summary', title: '复盘 · 解释每个费用对应的动作',
      body: '请说明 D(1)=0 为什么仍要在离开 1 时付 cost[1]，为什么最后一轮允许 i=n 却不能访问 cost[n]，以及 twoBack 更新后 oneBack 更新前两个变量的含义。提示使用、查看答案、引导通过、独立通过本站测试分别记录，刷新可恢复草稿与进度。播放不代表掌握；本站测试不等于 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: '05300aea8518bec9c603dc5e4f6c469618df0dab41f8e069a573caadc4a2441c',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '746-hint-choice', level: 1, body: '固定目的地 i，最后一次只能来自哪两个位置？需要支付的是出发台阶还是目的地的费用？' },
    { id: '746-hint-state', level: 2, body: 'D(0)=D(1)=0。D(i)=min(D(i-1)+cost[i-1], D(i-2)+cost[i-2])，一直算到顶楼 i=n。' },
    { id: '746-hint-code', level: 3, body: '两个滚动值初始化为 0；从 i=2 到 n，先算两个候选并保存 next=min(...)，再依次 twoBack=oneBack、oneBack=next；最终返回 oneBack。' },
  ],
  predictionChecks: [
    { id: '746-predict-first', prompt: '默认 [10,15,20]，到达位置 2 的第一次 next 是多少？', answer: { kind: 'int', value: 10 }, explanation: '从 0 走两级付 10，从 1 走一级付 15；较小值为 10。', checkpointId: 'first-arrival' },
    { id: '746-predict-final', prompt: '默认 [10,15,20]，到达顶楼位置 3 最后返回多少？', answer: { kind: 'int', value: 15 }, explanation: '从 1 直接走两级到顶楼，只付 cost[1]=15。', checkpointId: 'final-cost' },
  ],
  guided: {
    id: '746-guided', finalCheck: 'real-java-submit',
    stages: [
      { id: '746-guided-choices', instruction: '支架 1 / 3：补从 i-1 与 i-2 出发的两个候选费用，说明每次付款的下标。', scaffoldSource: guidedChoices, checkKind: 'static-practice' },
      { id: '746-guided-shift', instruction: '支架 2 / 3：next 已保存，补两次滚动赋值，保留下一轮需要的旧 oneBack。', scaffoldSource: guidedShift, checkKind: 'static-practice' },
      { id: '746-guided-whole', instruction: '支架 3 / 3：从骨架写完整方法，最终提交完整 Java 进行真实判定。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  commonErrors: [
    { id: '746-error-parity', description: '把最优路径限制为全部偶数下标或全部奇数下标。', counterexampleInputId: 'mixed-parity', explanation: '[1,100,1,1,100,1] 两个固定奇偶总费用都是 102，但 0→2→3→5→6 只需 4。路径可以混合一与两级。' },
    { id: '746-error-start', description: '固定从 0 出发，令 D(1)=cost[0]。', counterexampleInputId: 'start-one', explanation: '[10,1] 可以从 1 起步，离开它付 1 即到顶楼。D(1)=0 才表达可选起点；固定从 0 会得到 10。' },
    { id: '746-error-top', description: '使用 cost[i] 作为本轮费用，最后访问 cost[n]。', counterexampleInputId: 'three-stairs', explanation: 'i 是目的地，最后一轮 i=3 是顶楼，cost[3] 不存在。应付出发位置 i-1 或 i-2 的费用。' },
    { id: '746-error-shift', description: '先把 oneBack 覆盖成 next，再复制给 twoBack。', counterexampleInputId: 'increasing', explanation: '[1,2,3,4] 正确是 4；反向覆盖会丢掉 D(i-1)，在后续轮次得到 6。应先保存旧 oneBack 给 twoBack。' },
  ],
  testSuite: {
    version: PROBLEM_META['746'].testSuiteVersion, cases,
    wrongFixtures: [
      { id: '746-wrong-fixed-parity', source: WRONG_FIXED_PARITY_SOURCE, targetedCaseIds: ['mixed-parity', 'adjacent-cheap', 'long-mixed'] },
      { id: '746-wrong-fixed-start', source: WRONG_FIXED_START_SOURCE, targetedCaseIds: ['start-one', 'three-stairs', 'free-middle'] },
    ],
  },
  visualization: { modelId: '746-rolling-arrival-cost', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson746;
