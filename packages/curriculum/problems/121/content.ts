import { PROBLEM_META, type Lesson, type MaxProfitInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type MaxProfitLesson = Extract<Lesson, { id: '121' }>;

export const demoInputs: { id: string; title: string; input: MaxProfitInput }[] = [
  { id: 'classic-market', title: '先跌后涨：[7,1,5,3,6,4]', input: { prices: [7, 1, 5, 3, 6, 4] } },
  { id: 'falling-market', title: '持续下跌：[7,6,4,3,1]', input: { prices: [7, 6, 4, 3, 1] } },
  { id: 'new-low-late', title: '后段刷新最低价：[3,2,6,1,7]', input: { prices: [3, 2, 6, 1, 7] } },
];

const cases: MaxProfitLesson['testSuite']['cases'] = [
  { id: 'single-day', input: { prices: [5] }, expected: { kind: 'int', value: 0 }, coverage: '只有一天，无法先买后卖；也检查不会访问 prices[1]。' },
  { id: 'two-rise', input: { prices: [1, 5] }, expected: { kind: 'int', value: 4 }, coverage: '最短可盈利输入：第 0 天买、第 1 天卖。' },
  { id: 'two-fall', input: { prices: [5, 1] }, expected: { kind: 'int', value: 0 }, coverage: '最短递减输入：不能倒序用未来低价买入。' },
  { id: 'classic-profit', input: { prices: [7, 1, 5, 3, 6, 4] }, expected: { kind: 'int', value: 5 }, coverage: '经典先跌后涨：最低价 1 买入，后面的 6 卖出。' },
  { id: 'strictly-increasing', input: { prices: [1, 2, 3, 4, 5] }, expected: { kind: 'int', value: 4 }, coverage: '单调上涨：必须保留第一天的最低价直到最后一天。' },
  { id: 'strictly-decreasing', input: { prices: [7, 6, 4, 3, 1] }, expected: { kind: 'int', value: 0 }, coverage: '单调下跌：所有候选利润为负，best 仍为 0。' },
  { id: 'all-equal', input: { prices: [4, 4, 4, 4] }, expected: { kind: 'int', value: 0 }, coverage: '相等价格：零利润不需要交易，最低价可保持在最早一天。' },
  { id: 'late-new-low', input: { prices: [3, 2, 6, 1, 7] }, expected: { kind: 'int', value: 6 }, coverage: '出现更晚的新低价后还能得到新的最优交易。' },
  { id: 'best-must-not-reset', input: { prices: [2, 8, 1, 4] }, expected: { kind: 'int', value: 6 }, coverage: '后面刷新最低价但后续利润更小，best 不能被重置。' },
  { id: 'multiple-rises', input: { prices: [1, 3, 2, 5] }, expected: { kind: 'int', value: 4 }, coverage: '只能完成一笔交易，不能累加两个上涨区间得到 5。' },
  { id: 'duplicate-minimum', input: { prices: [3, 1, 1, 4] }, expected: { kind: 'int', value: 3 }, coverage: '重复最低价不影响最大利润，也不需要特殊处理相等分支。' },
  { id: 'price-bounds', input: { prices: [10000, 0, 10000] }, expected: { kind: 'int', value: 10000 }, coverage: '本站价格上下界与最大可能利润。' },
];

export const WRONG_SUM_RISES_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int profit = 0;
        for (int day = 1; day < prices.length; day++) {
            if (prices[day] > prices[day - 1]) {
                profit += prices[day] - prices[day - 1];
            }
        }
        return profit;
    }
}
`;

export const WRONG_ZERO_MINIMUM_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = 0;
        int best = 0;
        for (int day = 0; day < prices.length; day++) {
            best = Math.max(best, prices[day] - minPrice);
            minPrice = Math.min(minPrice, prices[day]);
        }
        return best;
    }
}
`;

export const WRONG_IGNORES_ORDER_SOURCE = `class Solution {
    public int maxProfit(int[] prices) {
        int minimum = prices[0];
        int maximum = prices[0];
        for (int price : prices) {
            minimum = Math.min(minimum, price);
            maximum = Math.max(maximum, price);
        }
        return maximum - minimum;
    }
}
`;

const guidedCandidateProfit = `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = prices[0];
        int best = 0;
        for (int day = 1; day < prices.length; day++) {
            int today = prices[day];
            // TODO：用今天卖出价与此前最低买入价计算 candidate，并更新 best。
        }
        return best;
    }
}
`;

const guidedTwoUpdates = `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = prices[0];
        int best = 0;
        for (int day = 1; day < prices.length; day++) {
            int today = prices[day];
            int profit = today - minPrice;
            // TODO：先用 profit 更新 best，再让今天参与后续日期的 minPrice。
        }
        return best;
    }
}
`;

export const lesson121 = {
  schemaVersion: 1,
  id: '121',
  slug: 'best-time-to-buy-and-sell-stock',
  title: '买卖股票的最佳时机',
  order: 12,
  lessonVersion: PROBLEM_META['121'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '读写 int[]、length、for 循环、局部 int 变量和 int 返回值。',
    '用“此前最低买入价”保证买入日在卖出日前，并用 best 保存历史最优利润。',
    '解释单次扫描不变量，以及递减价格为什么返回 0。',
  ],
  source: { platform: 'LeetCode', number: 121, url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  taskSemantics: '给出按日期排列的每日价格。你至多完成一次交易：选择一天买入，并在更晚的一天卖出，返回可获得的最大利润；若不存在正利润就返回 0。题意参考 LeetCode 121，本课题面、手算、推导、图形与代码均为本站原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站输入为 JSON {"prices":[...]}：1—10000 天，每个价格为 0—10000。学生方法接收 int[]，无需解析 JSON。参考演示最多显示 30 天、2000 个快照；更长合法输入仍可真实运行。', inputSchemaId: 'MaxProfitInput' },
  steps: [
    {
      id: 'syntax-array-loop-return', kind: 'syntax', title: 'J1 / J2 / J3 · 方法、int[]、length、for 与 return',
      body: '方法签名 public int maxProfit(int[] prices) 表示接收一个 int 数组引用值，并返回一个 int 基本值。本站可信调用器创建数组并调用方法，你不用写 main，也不能靠打印 PASS 通过。数组长度写 prices.length，没有括号；合法下标是 0 到 length-1。int minPrice = prices[0] 读取第一项；for (int day=1; day<prices.length; day++) 从第二天开始逐日扫描。return best; 把真实整数结果交回调用器。Java 按值传递参数：这里复制的是数组引用值，但本题只读取数组元素，不修改数组对象。',
      relatedIds: ['J1', 'J2', 'J3', 'single-day'],
    },
    {
      id: 'syntax-math-local', kind: 'syntax', title: '局部变量与 Math.min / Math.max',
      body: 'int today = prices[day] 保存当天价格；int profit = today - minPrice 计算若今天卖出的利润。Math.max(a,b) 返回较大的 int，Math.min(a,b) 返回较小的 int，它们不会自动修改参数变量，所以要写 best = Math.max(best, profit) 与 minPrice = Math.min(minPrice, today)。局部变量必须先赋值再读取。本站价格范围让差值保持在 Java int 范围内。',
      relatedIds: ['J8'],
    },
    {
      id: 'understanding-manual-trade', kind: 'understanding', title: '原创题面、输入输出与手工模拟',
      body: '输入 prices=[7,1,5,3,6,4] 表示第 0 到第 5 天的价格依次如此，输出 5。手算：先把第 0 天价格 7 记作最低买入价，best=0。第 1 天价格 1，今天卖会亏 6，因此 best 不变，再把最低价改成 1。第 2 天卖可赚 4，best=4；第 3 天只赚 2；第 4 天卖可赚 5，best=5；第 5 天只赚 3。最终在第 1 天买、第 4 天卖。输入 [7,6,4,3,1] 每次候选利润都不大于 0，因此选择不交易并返回 0。',
      relatedIds: ['classic-market', 'falling-market'],
    },
    {
      id: 'derivation-order-invariant', kind: 'derivation', title: '推导 · 把每一天依次当作卖出日',
      body: '直接枚举买入日和卖出日需要检查 O(n²) 对。换个角度：当 day 固定为卖出日时，最佳买入价一定是 day 之前出现过的最低价格。因此扫描 day 前维持两个事实：minPrice 等于 prices[0..day) 的最小值；best 等于卖出日在 [1,day) 内的所有合法交易最大利润，且至少为 0。先用旧 minPrice 计算今天卖出的 profit 并更新 best，随后才让 today 参与 minPrice，供未来卖出日使用。这样状态顺序直接保证先买后卖。',
      relatedIds: ['two-fall', 'strictly-decreasing'],
    },
    {
      id: 'derivation-complexity-zero', kind: 'derivation', title: '为什么递减序列返回 0，以及复杂度',
      body: 'best 从 0 开始，只会通过 Math.max(best, profit) 保持或增大。递减序列中，今天的价格总低于此前最低价，每个 profit 都是负数，所以 best 始终为 0；随后 minPrice 更新为今天，为下一天继续服务。算法逐日做固定次操作，时间 O(n)，只用 minPrice、best、day、today、profit 等固定数量的 int，额外空间 O(1)。参考界面保存历史快照是教学开销，不是 Java 解法的空间复杂度。',
      relatedIds: ['strictly-decreasing', 'best-must-not-reset'],
    },
    {
      id: 'prediction-min-final', kind: 'prediction', title: '先预测最低买入价，再预测最终利润',
      body: '默认输入 [7,1,5,3,6,4]。先预测开始扫描卖出日时 minPrice 的初值；走完各天后，再预测 best 的最终值。切换演示输入会从当前输入的不可变轨迹生成新答案，提交答案后才揭示。这些是参考算法状态预测，不是学生 Java 的执行结果。',
      relatedIds: ['predict-initial-minimum', 'predict-final-profit'],
    },
    {
      id: 'reference-price-demo', kind: 'reference-demo', title: '参考算法状态演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。价格数组、候选卖出日、最低价来源、today、profit、best、解释和代码高亮全部来自同一份不可变快照。“最低价日”是界面从参考状态保留的教学标记，不是参考 Java 里的额外变量。下一步、上一步、播放、暂停、重置和输入切换只选择或重建参考轨迹；不会解释任意学生代码，也不会把动画当成真实运行。',
      relatedIds: ['classic-market', 'falling-market', 'new-low-late'],
    },
    {
      id: 'guided-max-profit', kind: 'guided-code', title: '三段引导后提交完整 Java',
      body: '第一段根据此前最低价写当天候选利润并维护 best；第二段明确先更新 best、再更新 minPrice 的状态顺序；第三段回到只含方法签名的骨架，从头写完整方法。每段支架只记录静态练习过程，不按填入字符串或参考源码相等性判定。最终提交完整 Solution.java 到真实 runner，由 Docker 中的 javac 与 java 执行全部本站用例。',
      relatedIds: ['guided-stock'],
    },
    {
      id: 'independent-max-profit', kind: 'independent-code', title: '独立模式 · 从方法骨架开始',
      body: '独立草稿从 maxProfit 方法骨架开始，不预填完整循环。先运行单日、两日上涨和两日下跌，再提交全部本站测试。编译错误看 javac 行号；运行异常检查下标；递减数组若返回正数，检查是否忽略日期顺序；[1,3,2,5] 若返回 5，说明误做成多次交易。只有当前完整源码真实通过才记录“独立通过本站测试”，旧源码结果不会用于新源码。',
      relatedIds: ['single-day', 'two-rise', 'two-fall', 'multiple-rises'],
    },
    {
      id: 'summary-stock', kind: 'summary', title: '复盘 · 用不变量说明一次扫描',
      body: '请用自己的话回答：扫描 day 前 minPrice 覆盖哪些日期？为什么先计算 profit 再更新 minPrice？best 为什么从 0 开始？递减序列为何不能用最后一天低价和第一天高价相减？本站分别记录预测、提示、查看答案、引导通过与独立通过；页面访问和参考演示不表示掌握，通过本站测试也不是 LeetCode 官方评测结论。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '6eacaf8cfb05185218e467c8d61540f0c1cffbc60cab76e1a44d48cfbb8c1f33',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: 'hint-sell-day-view', level: 1, body: '依次把每一天看作卖出日。要让这天利润最大，只需知道它之前出现过的最低价格。' },
    { id: 'hint-two-invariants', level: 2, body: '扫描 day 前保持 minPrice=min(prices[0..day))；best 保存此前所有合法卖出日的最大利润，初值为 0。' },
    { id: 'hint-stock-pseudocode', level: 3, body: 'minPrice=prices[0]，best=0；day 从1到length-1：profit=prices[day]-minPrice，best=max(best,profit)，minPrice=min(minPrice,prices[day])；返回 best。' },
  ],
  predictionChecks: [
    { id: 'predict-initial-minimum', prompt: '默认 prices=[7,1,5,3,6,4]，枚举第 1 天为卖出日前，minPrice 初始化为多少？', answer: { kind: 'int', value: 7 }, explanation: '卖出日从第 1 天开始；此前只有第 0 天可买入，所以 minPrice=prices[0]=7。', checkpointId: 'initial-minimum' },
    { id: 'predict-final-profit', prompt: '默认输入中，依次检查所有卖出日后，best 最终是多少？', answer: { kind: 'int', value: 5 }, explanation: '最低价 1 出现在第 1 天，之后第 4 天价格 6，合法利润为 5，其他卖出日都不更优。', checkpointId: 'final-result' },
  ],
  guided: {
    id: 'guided-stock',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-stock-candidate', instruction: '支架 1 / 3：把 day 当卖出日，用 today-minPrice 得到候选利润，并让 best 只增不减。', scaffoldSource: guidedCandidateProfit, checkKind: 'static-practice' },
      { id: 'guided-stock-updates', instruction: '支架 2 / 3：补上 best 与 minPrice 两次更新；解释为何 minPrice 更新在当天利润之后。', scaffoldSource: guidedTwoUpdates, checkKind: 'static-practice' },
      { id: 'guided-stock-whole', instruction: '支架 3 / 3：从方法骨架完整实现一次扫描，最后把完整 Java 交给真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-sum-every-rise', description: '把每个相邻上涨差值累加，实际允许了多次买卖。', counterexampleInputId: 'multiple-rises', explanation: '[1,3,2,5] 中累加得到 2+3=5，但一笔交易只能从 1 买到 5，正确结果是 4。' },
    { id: 'error-minimum-zero', description: '把 minPrice 初始化为 0，凭空使用输入中尚未出现的买入价。', counterexampleInputId: 'single-day', explanation: 'prices=[5] 没有卖出日，正确结果为 0；虚构价格 0 会错误得到利润 5。应初始化为 prices[0]。' },
    { id: 'error-ignore-date-order', description: '只找全局最大价和最小价相减，不检查最大价是否在最低价之后。', counterexampleInputId: 'strictly-decreasing', explanation: '[7,6,4,3,1] 的最大价在最低价之前，不能先以 1 买入再回到过去以 7 卖出；正确结果是 0。' },
    { id: 'error-reset-best', description: '刷新 minPrice 时同时把 best 清零，丢掉此前已经完成的更优交易。', counterexampleInputId: 'best-must-not-reset', explanation: '[2,8,1,4] 中前两天已经得到利润 6；后来最低价变为 1，但最佳历史利润仍应保留为 6。' },
  ],
  testSuite: {
    version: PROBLEM_META['121'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-sum-rises', source: WRONG_SUM_RISES_SOURCE, targetedCaseIds: ['multiple-rises'] },
      { id: 'wrong-zero-minimum', source: WRONG_ZERO_MINIMUM_SOURCE, targetedCaseIds: ['single-day', 'classic-profit'] },
      { id: 'wrong-ignore-order', source: WRONG_IGNORES_ORDER_SOURCE, targetedCaseIds: ['two-fall', 'strictly-decreasing'] },
    ],
  },
  visualization: { modelId: '121-one-pass-min-price', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
