import { PROBLEM_META, type Lesson, type StockProfitIIInput } from '@jab/contracts';
import {
  ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE,
  WRONG_EXTREMA_SOURCE, WRONG_SINGLE_TRADE_SOURCE, WRONG_TELESCOPING_SOURCE,
} from './reference.js';

type ProfitLesson = Extract<Lesson, { id: '122' }>;

export const demoInputs: { id: string; title: string; input: StockProfitIIInput }[] = [
  { id: 'wave-market', title: '多段上涨：[7,1,5,3,6,4]', input: { prices: [7, 1, 5, 3, 6, 4] } },
  { id: 'flat-falling-market', title: '持平和下跌：[7,7,6,4,3,1]', input: { prices: [7, 7, 6, 4, 3, 1] } },
  { id: 'one-day-market', title: '仅有一天：[5]', input: { prices: [5] } },
];

const cases: ProfitLesson['testSuite']['cases'] = [
  { id: 'one-day', input: { prices: [5] }, expected: { kind: 'int', value: 0 }, coverage: '只有一天，不能形成先买后卖；也检验 day 从 1 起步不越界。' },
  { id: 'two-day-rise', input: { prices: [1, 5] }, expected: { kind: 'int', value: 4 }, coverage: '最短可获利序列，正确计入一次正差。' },
  { id: 'two-day-fall', input: { prices: [5, 1] }, expected: { kind: 'int', value: 0 }, coverage: '最短下跌序列，不应把亏损计入收益。' },
  { id: 'several-waves', input: { prices: [7, 1, 5, 3, 6, 4] }, expected: { kind: 'int', value: 7 }, coverage: '两段获利 4+3；与只能完成一笔交易的 121 题答案 5 区分。' },
  { id: 'strict-rise', input: { prices: [1, 2, 3, 4, 5] }, expected: { kind: 'int', value: 4 }, coverage: '连续上涨每天都计入正差，总和等于整段首尾差。' },
  { id: 'strict-fall', input: { prices: [7, 6, 4, 3, 1] }, expected: { kind: 'int', value: 0 }, coverage: '持续下跌，合法最优选择是不交易；全局最大减最小会误判。' },
  { id: 'equal-days', input: { prices: [4, 4, 4] }, expected: { kind: 'int', value: 0 }, coverage: '全部持平，不应凭空产生收益。' },
  { id: 'plateaus-and-waves', input: { prices: [1, 1, 3, 3, 2, 2, 4] }, expected: { kind: 'int', value: 4 }, coverage: '平台价格和两段上涨混合；0 差与负差都跳过。' },
  { id: 'short-zigzag', input: { prices: [1, 3, 2, 5] }, expected: { kind: 'int', value: 5 }, coverage: '两段收益 2+3；只做一笔交易只能得到 4。' },
  { id: 'late-valley', input: { prices: [3, 2, 6, 1, 7] }, expected: { kind: 'int', value: 10 }, coverage: '中间再次出现低谷，应累计前后两笔合法交易 4+6。' },
  { id: 'keep-earlier-profit', input: { prices: [2, 8, 1, 4] }, expected: { kind: 'int', value: 9 }, coverage: '价格大跌不抹掉已获利 6，随后再获利 3。' },
  { id: 'upper-bound-prices', input: { prices: [0, 10000, 0, 10000] }, expected: { kind: 'int', value: 20000 }, coverage: '本站价格上下界和多次完整幅度交易。' },
  { id: 'trailing-fall', input: { prices: [2, 8, 1] }, expected: { kind: 'int', value: 6 }, coverage: '最后一天大跌不应让之前收益被负差抵消。' },
  { id: 'zero-valleys', input: { prices: [5, 0, 10, 0, 10] }, expected: { kind: 'int', value: 20 }, coverage: '两次在零价买入、最高价卖出，不能只取全局最大减最小。' },
];

const guidedPair = `class Solution {
    public int maxProfit(int[] prices) {
        int profit = 0;
        for (int day = 1; day < prices.length; day++) {
            int gain = 0; // TODO：把 0 改成“今天价格减去昨天价格”。
            if (gain > 0) {
                profit += gain;
            }
        }
        return profit;
    }
}
`;

const guidedBranch = `class Solution {
    public int maxProfit(int[] prices) {
        int profit = 0;
        for (int day = 1; day < prices.length; day++) {
            int gain = prices[day] - prices[day - 1];
            // TODO：写出 gain>0 的判断，并在其中更新 profit。
        }
        return profit;
    }
}
`;

export const lesson122 = {
  schemaVersion: 1,
  id: '122',
  slug: 'best-time-to-buy-and-sell-stock-ii',
  title: '买卖股票的最佳时机 II',
  order: 36,
  lessonVersion: PROBLEM_META['122'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '用 int[]、prices.length、for、if 和 int 返回值实现完整 Java 方法。',
    '分辨 121 题至多一笔与本题可完成多笔交易，同时遵守同一时刻最多持有一股。',
    '说明扫描前缀收益不变量及为何只累计相邻正增量，并用反例检查错误解法。',
  ],
  source: { platform: 'LeetCode', number: 122, url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/' },
  taskSemantics: '按日期给出每天一股的价格，你可以在不同日期完成多笔买卖，同一时刻最多持有一股；可在卖出后再买入。返回所有合法交易能获得的最大非负总收益。题意参考 LeetCode 122，题面、例子、推导、图形和代码为本站原创表达，无官方关联。',
  siteLimits: { description: '本站输入 JSON 为 {"prices":[...]}：1—10000 天，价格 0—10000。学生方法只收到 int[]，无需解析 JSON。参考演示最多 30 天；较长合法输入仍可在真实 Java runner 判定。', inputSchemaId: 'StockProfitIIInput' },
  steps: [
    {
      id: '122-syntax-method-array', kind: 'syntax', title: 'Java 桥接 · 方法、数组和返回值',
      body: '方法 public int maxProfit(int[] prices) 接收 int 数组引用值并返回 int 基本值。与 C 的数组遍历相似，Java 用 prices.length 读取长度，合法下标为 0 到 length-1。for (int day = 1; day < prices.length; day++) 从第二天开始，才能安全读取 prices[day-1]。int profit = 0 是局部变量，须明确初始化；return profit 把真实结果交给可信调用器，无需写 main 或打印 PASS。Java 传入数组引用值的副本，本题只读数组，不修改原数组。',
      relatedIds: ['J1', 'J2', 'J3', 'one-day'],
    },
    {
      id: '122-syntax-condition', kind: 'syntax', title: 'Java 桥接 · if、差值和复合赋值',
      body: 'int gain = prices[day] - prices[day-1] 是今天相对昨天的价格变化。if (gain > 0) 只在上涨时执行大括号内语句；profit += gain 等价于 profit = profit + gain。下跌的负数和持平的 0 都不计入。本站最大可能总收益不超过 50000000，落在 Java int 范围内。',
      relatedIds: ['J2', 'strict-rise', 'strict-fall'],
    },
    {
      id: '122-understand-trades', kind: 'understanding', title: '原创题面、输入输出与手工模拟',
      body: '输入 prices=[7,1,5,3,6,4]，输出 7。按天手算：7→1 不交易；1→5 上涨 4，可在价格 1 买入、5 卖出；5→3 下跌不交易；3→6 上涨 3，再在 3 买入、6 卖出；6→4 下跌不交易。总收益 4+3=7。第 1 次已经卖出才进行第 2 次买入，任何时刻都没有持有两股。只做一笔交易的 121 题同输入最多赚 5，因此不能把旧算法直接交上来。',
      relatedIds: ['several-waves', 'short-zigzag'],
    },
    {
      id: '122-derive-greedy', kind: 'derivation', title: '推导 · 把上涨段拆成相邻的正差',
      body: '枚举每次买卖的日期组合会很快爆炸。观察一个连续上涨段，例如 1→2→3→5：从 1 买到 5 的收益 4，恰等于 (2-1)+(3-2)+(5-3)。遇到下跌就不交易，等下一个低点再买。任意合法交易的收益，都可写成其持有期间相邻价格差之和；负差只会减少收益，因此总最优等于全序列所有正差之和。可以把连续正差合成一笔交易，保证同一时刻最多持有一股。',
      relatedIds: ['strict-rise', 'short-zigzag'],
    },
    {
      id: '122-invariant-complexity', kind: 'derivation', title: '扫描不变量、边界和复杂度',
      body: '进入 day 这一轮前，profit 恰好是从第 1 天到第 day-1 天所有正相邻差的和，非负。计算 gain=prices[day]-prices[day-1]；若为正，加上它；否则不变。下一轮不变量仍成立。day=prices.length 时，每一对相邻日期都处理过，返回 profit。只有一天时循环不进入、答案 0；价格持平或持续下跌时也返回 0。Java 解法时间 O(n)、额外空间 O(1)；参考动画保存快照的内存是教学工具开销，不是 Java 解法空间复杂度。',
      relatedIds: ['one-day', 'equal-days', 'strict-fall'],
    },
    {
      id: '122-predict', kind: 'prediction', title: '先预测，再揭示收益状态',
      body: '默认输入 [7,1,5,3,6,4]：先预测 profit 初值；再预测第一对相邻日期的 gain；走完整段后预测最后的 profit。切换输入后，问题和答案从该输入的新参考轨迹生成。先作答后揭示属于静态教学预测，不会编译或执行学生代码。',
      relatedIds: ['122-predict-initial', '122-predict-gain', '122-predict-final'],
    },
    {
      id: '122-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。价格数组、day、gain、profit、相邻指针、解释和参考代码高亮，都从同一份不可变快照读取。播放、暂停、下一步、上一步、重置和输入切换只操作预置参考模型，不解释任意学生 Java 源码；学生结果来自独立真实执行通道。',
      relatedIds: ['wave-market', 'flat-falling-market', 'one-day-market'],
    },
    {
      id: '122-guided', kind: 'guided-code', title: '三段引导后提交完整 Java',
      body: '第一段只计算相邻 gain，条件与累计已有支架；第二段已有 gain，让你写 if 条件与累计；第三段回到仅有方法骨架的完整实现。支架仅引导书写，不比较填入字符串或参考源码。引导的最后验收会把完整 Solution.java 送入真实 Docker runner，用 javac/java 和本站用例判定。',
      relatedIds: ['122-guided-exercise'],
    },
    {
      id: '122-independent', kind: 'independent-code', title: '独立挑战 · 从方法骨架开始',
      body: '独立模式初始只有方法签名与待实现异常，不预填完整答案。先用 [5]、[1,5]、[5,1] 手算边界，再运行与提交全部本站测试。编译错误看 javac 行列；运行异常看下标；[1,3,2,5] 若得到 4，误用了至多一笔交易；[7,6,4,3,1] 若得到非 0，检查是否把过去的高价当作未来卖出。只有当前源码真实通过才记录“独立通过本站测试”，提示、看答案、引导通过分别记录。',
      relatedIds: ['one-day', 'short-zigzag', 'strict-fall'],
    },
    {
      id: '122-summary', kind: 'summary', title: '复盘 · 正差为何足够',
      body: '请用自己的话说明：进入 day 前 profit 覆盖了哪些相邻差？为什么只加入正差？如何把连续上涨的多个正差合成一笔合法买卖？同输入下 121 题与 122 题结果为何不同？本站的参考状态预测、真实 Java 运行和“通过本站测试”分别代表不同证据，不是 LeetCode 官方评测或学习掌握证明。',
      relatedIds: ['several-waves'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'ab3ddb08663d74a1e06e340a7fe3a631003ebc68751caf99ce309f7d78159010',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: '122-hint-concept', level: 1, body: '比较相邻两天价格。上涨可以变成一段合法收益；下跌或持平时不必交易。' },
    { id: '122-hint-invariant', level: 2, body: '扫描第 day 天前，profit 是前面所有正相邻差之和。用 prices[day]-prices[day-1] 更新这个前缀总和。' },
    { id: '122-hint-pseudocode', level: 3, body: 'profit=0；day 从 1 遍历到 length-1；gain=prices[day]-prices[day-1]；若 gain>0，则 profit+=gain；循环后返回 profit。' },
  ],
  predictionChecks: [
    { id: '122-predict-initial', prompt: '默认 [7,1,5,3,6,4]，尚未检查任何相邻日期时 profit 是多少？', answer: { kind: 'int', value: 0 }, explanation: '尚未执行交易，profit 从 0 开始。', checkpointId: 'initial-profit' },
    { id: '122-predict-gain', prompt: '默认输入中第一对日期 7→1 的 gain 是多少？', answer: { kind: 'int', value: -6 }, explanation: 'gain=prices[1]-prices[0]=1-7=-6；此差值不计入总收益。', checkpointId: 'first-gain' },
    { id: '122-predict-final', prompt: '默认输入处理所有日期后 profit 是多少？', answer: { kind: 'int', value: 7 }, explanation: '正差是 1→5 的 4 和 3→6 的 3，总和为 7。', checkpointId: 'final-profit' },
  ],
  guided: { id: '122-guided-exercise', finalCheck: 'real-java-submit', stages: [
    { id: '122-guided-pair', instruction: '支架 1 / 3：把 gain 的占位值 0 换成今天减昨天的价格差；正差累计逻辑已给出。', scaffoldSource: guidedPair, checkKind: 'static-practice' },
    { id: '122-guided-branch', instruction: '支架 2 / 3：已给出相邻 gain，请自己补上正增长分支和 profit 更新。', scaffoldSource: guidedBranch, checkKind: 'static-practice' },
    { id: '122-guided-whole', instruction: '支架 3 / 3：从方法骨架完整编写，再将完整 Java 交给真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '122-error-single-trade', description: '照搬 121 题的最低买入价加一次最大利润，只允许一笔交易。', counterexampleInputId: 'short-zigzag', explanation: '[1,3,2,5] 的两段正差为 2+3=5；一次交易最多赚 4，漏掉第二笔。' },
    { id: '122-error-global-extrema', description: '用全局最高价减全局最低价，忽略先买后卖的日期顺序。', counterexampleInputId: 'strict-fall', explanation: '[7,6,4,3,1] 中最低价在最后，不能回到过去以 7 卖出；正确收益 0。' },
    { id: '122-error-negative-gain', description: '把每个相邻差都相加，亏损冲掉合法收益。', counterexampleInputId: 'trailing-fall', explanation: '[2,8,1] 先赚 6 后不必再交易；把 -7 也计入会得到 -1。' },
    { id: '122-error-reset-profit', description: '价格下降时把已赚收益清零。', counterexampleInputId: 'keep-earlier-profit', explanation: '[2,8,1,4] 第一次已经赚 6，之后再赚 3，总收益 9，不应在价格跌到 1 时丢掉 6。' },
  ],
  testSuite: { version: PROBLEM_META['122'].testSuiteVersion, cases, wrongFixtures: [
    { id: '122-wrong-single-trade', source: WRONG_SINGLE_TRADE_SOURCE, targetedCaseIds: ['several-waves', 'short-zigzag', 'late-valley', 'zero-valleys'] },
    { id: '122-wrong-global-extrema', source: WRONG_EXTREMA_SOURCE, targetedCaseIds: ['strict-fall', 'several-waves', 'late-valley'] },
    { id: '122-wrong-telescoping', source: WRONG_TELESCOPING_SOURCE, targetedCaseIds: ['trailing-fall', 'several-waves', 'strict-fall'] },
  ] },
  visualization: { modelId: '122-positive-deltas', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies ProfitLesson;
