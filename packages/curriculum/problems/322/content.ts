import { PROBLEM_META, type CoinChangeInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson322 = Extract<Lesson, { id: '322' }>;

export const demoInputs: { id: string; title: string; input: CoinChangeInput }[] = [
  { id: 'greedy-trap', title: '最大面值优先会失误：1,3,4 凑 6', input: { coins: [1, 3, 4], amount: 6 } },
  { id: 'unreachable', title: '偶数面值凑不出奇数金额', input: { coins: [2, 4], amount: 7 } },
  { id: 'zero', title: '金额为零，不取任何硬币', input: { coins: [2], amount: 0 } },
  { id: 'repeated', title: '同一种硬币可以反复使用', input: { coins: [2], amount: 6 } },
];

const cases: Lesson322['testSuite']['cases'] = [
  { id: 'greedy-trap', input: { coins: [1, 3, 4], amount: 6 }, expected: { kind: 'int', value: 2 }, coverage: '3+3 只需 2 枚，贪心 4+1+1 需要 3；禁止假定面值构成标准货币系统。' },
  { id: 'unreachable', input: { coins: [2, 4], amount: 7 }, expected: { kind: 'int', value: -1 }, coverage: '偶数面值无法凑出奇数；不能把不可达哨兵当成结果返回。' },
  { id: 'zero', input: { coins: [2], amount: 0 }, expected: { kind: 'int', value: 0 }, coverage: '零金额需要零枚；外层循环不执行，仍有两个独立预测检查点。' },
  { id: 'repeated', input: { coins: [2], amount: 6 }, expected: { kind: 'int', value: 3 }, coverage: '一个面值重复使用三次；不是每种硬币最多用一次的 0/1 选择。' },
  { id: 'one', input: { coins: [1], amount: 1 }, expected: { kind: 'int', value: 1 }, coverage: '最小正面值与最小正金额，余款直接引用 dp[0]。' },
  { id: 'too-large', input: { coins: [7, 9], amount: 3 }, expected: { kind: 'int', value: -1 }, coverage: '所有面值大于金额；必须先检查 coin<=value，不能访问负下标。' },
  { id: 'unsorted', input: { coins: [5, 1, 2], amount: 11 }, expected: { kind: 'int', value: 3 }, coverage: '面值未排序，5+5+1 是三枚；不能要求输入已经升序。' },
  { id: 'duplicates', input: { coins: [2, 2, 3], amount: 7 }, expected: { kind: 'int', value: 3 }, coverage: '重复面值允许存在，不限制每种面值的供应；2+2+3。' },
  { id: 'greedy-stuck', input: { coins: [3, 4], amount: 6 }, expected: { kind: 'int', value: 2 }, coverage: '贪心先拿 4 会剩 2 而报告无解，但 3+3 可达。' },
  { id: 'exact', input: { coins: [9, 6, 5, 1], amount: 9 }, expected: { kind: 'int', value: 1 }, coverage: '有一枚恰好等于金额，不能计算成硬币组合数量。' },
  { id: 'mixed', input: { coins: [4, 7], amount: 15 }, expected: { kind: 'int', value: 3 }, coverage: '跨越前期不可达金额，4+4+7 得到三枚，不能在遇到空洞时提前终止。' },
  { id: 'int-max-coin', input: { coins: [2147483647, 2], amount: 4 }, expected: { kind: 'int', value: 2 }, coverage: 'Java int 最大面值先通过比较跳过，合法方案用两个 2；避免金额加面值溢出。' },
  { id: 'max-count', input: { coins: [1], amount: 10000 }, expected: { kind: 'int', value: 10000 }, coverage: '真实判题金额上界，最大答案为 10000；不受参考演示金额 30 上限影响。' },
  { id: 'twelve-coins', input: { coins: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], amount: 30 }, expected: { kind: 'int', value: 30 }, coverage: '12 个重复面值与演示金额上界，检测状态数量和可视化表格 30 项边界。' },
];

export const WRONG_GREEDY_SOURCE = `import java.util.Arrays;
class Solution {
    public int coinChange(int[] coins, int amount) {
        Arrays.sort(coins);
        int count = 0;
        for (int i = coins.length - 1; i >= 0; i--) {
            count += amount / coins[i];
            amount %= coins[i];
        }
        return amount == 0 ? count : -1;
    }
}
`;

export const WRONG_ONCE_SOURCE = `import java.util.Arrays;
class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int coin : coins) {
            for (int value = amount; value >= coin; value--) {
                dp[value] = Math.min(dp[value], dp[value - coin] + 1);
            }
        }
        return dp[amount] == amount + 1 ? -1 : dp[amount];
    }
}
`;

const guidedBase = REFERENCE_SOURCE.replace('Arrays.fill(dp, unreachable);', '/* TODO：把数组填成不可达哨兵 */').replace('dp[0] = 0;', '/* TODO：设置零金额基例 */');
const guidedTransition = REFERENCE_SOURCE.replace('if (coin <= value)', 'if (/* TODO：余款下标合法的条件 */)').replace('Math.min(dp[value], dp[value - coin] + 1)', '/* TODO：当前最优与最后一枚候选取最小 */');

export const lesson322 = {
  schemaVersion: 1, id: '322', slug: 'coin-change', title: '零钱兑换', order: 28,
  lessonVersion: PROBLEM_META['322'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分最少硬币数、凑钱方案数和每枚只能用一次三个不同任务。',
    '用最后一枚硬币推导金额递增 DP，解释不可达哨兵及循环不变量。',
    '用 Java Arrays.fill、数组下标和嵌套循环实现完整方法，并用反例修正错误。',
  ],
  source: { platform: 'LeetCode', number: 322, url: 'https://leetcode.com/problems/coin-change/' },
  taskSemantics: '你有若干种正整数面值的硬币，每一种都可以取任意多枚。给定目标金额 amount，恰好凑出它所需的硬币枚数最少是多少？如果所有组合都无法恰好凑出，返回 -1；金额为 0 时不取硬币即可，返回 0。coins 中允许重复面值，重复不会减少某种硬币的供应。本题只返回最少枚数，不返回具体组合，不统计排列或组合数量。题意参考 LeetCode 322，本站题面与讲解原创，无官方关联。',
  siteLimits: { description: '本站真实运行接受 1—12 个面值，每项为 1—2147483647 的整数，amount 为 0—10000。参考状态演示只接受 amount<=30，面值仍可很大；31—10000 的金额可以真实运行。', inputSchemaId: 'CoinChangeInputSchema' },
  steps: [
    { id: '322-syntax-method', kind: 'syntax', title: 'J1 / J2 · int 返回值与嵌套循环', body: 'public int coinChange(int[] coins, int amount) 接收数组和金额，返回最少枚数。amount、value、coin 都保存基本整数值；不是对象引用。for (int value=1; value<=amount; value++) 按金额从小到大推进；内层 j 从 0 到 coins.length-1 读取面值。j 在内层 for 结束后离开作用域，coin 在本轮循环块结束后离开作用域。return 结束方法，打印 PASS 或数字不能代替返回 int。', relatedIds: ['J1', 'J2'] },
    { id: '322-syntax-array', kind: 'syntax', title: 'J3 · new int[] 和 Arrays.fill', body: 'coins 保存数组引用，Java 参数按值传递引用值，不复制数组对象。int[] dp=new int[amount+1] 创建新数组，所有元素默认是整数 0。import java.util.Arrays 后可用 Arrays.fill(dp,unreachable) 修改这一个数组的每项；fill 返回 void，不返回新数组。再把 dp[0]=0 作为特例。合法下标为 0…amount；数组 length 是字段。Math.min(a,b) 返回较小整数，dp[value]=... 才真正修改数组元素。', relatedIds: ['J3'] },
    { id: '322-understanding', kind: 'understanding', title: '手算 · 面值 1、3、4，目标 6', body: '输入 {"coins":[1,3,4],"amount":6}。六枚 1 可行但不够省；4+1+1 用三枚；3+3 用两枚且没有面值 6，故输出 {"kind":"int","value":2}。每种面值可反复使用，3+3 不要求 coins 中有两个 3。改成 [2,4] 凑 7，所有和为偶数，输出 -1；amount=0 时输出 0。手算 D(0…6)=[0,1,2,1,1,2,2]。', relatedIds: ['greedy-trap', 'unreachable', 'zero'] },
    { id: '322-derivation-initial', kind: 'derivation', title: '初始办法 · 贪心为何不足', body: '一直拿不超过余款的最大面值很直观，但 [1,3,4] 凑 6 会拿 4、1、1，比 3、3 多一枚；[3,4] 凑 6 甚至会误报无解。穷举所有取法能找答案，却反复求解相同余款。把每个较小金额的最少枚数保存下来，后续尝试不同的最后一枚时直接复用。', relatedIds: ['greedy-trap', 'greedy-stuck'] },
    { id: '322-derivation-state', kind: 'derivation', title: '状态与哨兵 · 不可达不等于零枚', body: '定义 D(v) 为恰好凑出金额 v 的最少枚数。D(0)=0。面值至少为 1，凑出不超过 amount 的任何金额，若可达就至多需要 amount 枚，因此 amount+1 是严格更大的不可达哨兵。先填哨兵再恢复 D(0)。不能把正金额默认零当成已凑出；也不要用 Integer.MAX_VALUE 再加 1，Java int 会溢出。本题最大哨兵 10001，候选至多 10002，安全可比较。', relatedIds: ['zero', 'unreachable', 'max-count'] },
    { id: '322-derivation-transition', kind: 'derivation', title: '递推 · 枚举最后一枚', body: '若最后一枚面值 coin<=v，去掉它后剩 v-coin；最优解的余款也必须最优，否则可替换成更少枚的余款方案。于是 D(v)=min(D(v),D(v-coin)+1)，枚举所有面值。coin>v 时先跳过，不访问负下标。面值为正确保 v-coin<v，可按金额递增读取已完成状态。余款不可达时哨兵+1 比当前哨兵还大，min 不会把它选成可达解。', relatedIds: ['too-large', 'int-max-coin'] },
    { id: '322-derivation-invariant', kind: 'derivation', title: '不变量 · 已完成金额与部分候选', body: '外层处理 v 前，0…v-1 的状态已最优，v 及更大金额仍为哨兵。内层检查前 j 个面值后，dp[v] 是这些“最后一枚”候选中的最小值；余款状态可使用所有面值，不是只允许前 j 种。所有候选检查完，dp[v] 才完成。重复面值只会重复相同候选，不改变最小值。共 amount×coins.length 次检查，时间 O(amount×m)、额外空间 O(amount)；这来自算法结构分析，少量运行用时不能证明渐进复杂度。', relatedIds: ['duplicates', 'twelve-coins'] },
    { id: '322-prediction', kind: 'prediction', title: '先预测，再揭示 · 哨兵与返回值', body: '默认 amount=6，先预测不可达哨兵，再预测最终最少枚数；答案分别为 7 和 2。切换 [2,4] 凑 7 后，答案变为 8 和 -1。amount=0 也有两个不同检查点，分别为 1 和 0。答案由当前输入快照生成；静态预测通过不代表 Java 已编译运行。', relatedIds: ['322-predict-sentinel', '322-predict-final'] },
    { id: '322-reference', kind: 'reference-demo', title: '参考演示 · 先初始化，再逐金额取最小', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、硬币数组、DP 表、代码高亮与解释读取同一不可变快照。分步显示分配后的默认零、填充哨兵、恢复 dp[0]、比较面值、更新 dp[value]；不是把未处理格画成 null。为保持最多 30 格，dp[0] 单列在变量表，表格状态 k 对应 dp[k+1]。已完成金额与已检查面值数量明确标为教学标记。下一步、上一步、播放、暂停、重置和切换输入复用公共播放器；学生编辑源码不会改变参考模型。', relatedIds: demoInputs.map(demo => demo.id) },
    { id: '322-guided-step', kind: 'guided-code', title: '引导练习 · 初始化、递推、完整方法', body: '先补哨兵填充与基例，再补合法余款条件和最少枚数递推，最后从骨架完成方法。支架属于静态练习；最终提交完整 Java 给 Docker 内 javac 和 java，读取实际返回值，不按填写字符串等于参考答案来判通过。BFS 等其他正确实现同样可以通过本站测试。', relatedIds: ['322-guided'] },
    { id: '322-independent', kind: 'independent-code', title: '独立编写 · 用反例区分错误', body: '独立模式从方法骨架开始。先试最大面值优先，运行 [1,3,4] 凑 6 观察实际 3 与期望 2；改成 DP 后重新运行，再提交全部本站测试。遇到编译错误检查 import 与括号，遇到异常检查下标，超时检查是否枚举了大量重复组合。源码改变后须重新运行，旧结果不代表新代码。Docker 不可用时显示执行不可用，参考演示仍不算真实运行。', relatedIds: ['J8', 'greedy-trap'] },
    { id: '322-summary', kind: 'summary', title: '复盘 · 状态究竟最小化什么', body: '解释为什么不是统计组合数、为什么同一面值可重复使用、为什么金额要递增，以及哨兵+1 为什么不会产生伪解。提示使用、查看答案、引导通过和独立通过本站测试分别记录；刷新可恢复草稿与进度。播放动画不代表掌握，本站测试不等于 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' }, independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '4658252a47ab9107c373ddcbbe1e5fa25a791dca565da0e9170397a1c409e809', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '322-hint-last', level: 1, body: '固定目标金额，最后一枚是哪种面值？拿掉它后的问题是否还是同一种任务？' },
    { id: '322-hint-state', level: 2, body: 'D(0)=0，其他格填 amount+1。按金额递增，只有 coin<=value 时才考虑 D(value-coin)+1。' },
    { id: '322-hint-code', level: 3, body: '对 value=1…amount，枚举所有 coin；若 coin<=value，令 dp[value]=min(dp[value],dp[value-coin]+1)。最后若 dp[amount] 仍等于哨兵则返回 -1，否则返回它。' },
  ],
  predictionChecks: [
    { id: '322-predict-sentinel', prompt: '默认 amount=6，不可达哨兵应设置为多少？', answer: { kind: 'int', value: 7 }, explanation: '可达解最多 6 枚，7 严格更大，可以区分无解。', checkpointId: 'sentinel' },
    { id: '322-predict-final', prompt: '默认 [1,3,4] 凑 6，最终返回最少枚数是多少？', answer: { kind: 'int', value: 2 }, explanation: '3+3 用两枚，贪心 4+1+1 不是最优。', checkpointId: 'final-count' },
  ],
  guided: { id: '322-guided', finalCheck: 'real-java-submit', stages: [
    { id: '322-guided-base', instruction: '支架 1 / 3：填充不可达哨兵，再恢复金额 0 的基例。', scaffoldSource: guidedBase, checkKind: 'static-practice' },
    { id: '322-guided-transition', instruction: '支架 2 / 3：补合法余款条件与最后一枚的候选取最小。', scaffoldSource: guidedTransition, checkKind: 'static-practice' },
    { id: '322-guided-whole', instruction: '支架 3 / 3：从方法骨架写完整解法，提交完整 Java 真实运行。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  commonErrors: [
    { id: '322-error-greedy', description: '每次优先取最大面值，误以为总能最少。', counterexampleInputId: 'greedy-trap', explanation: '[1,3,4] 凑 6，4+1+1 三枚，3+3 两枚。需要比较不同最后一枚的候选。' },
    { id: '322-error-once', description: '每种硬币只允许用一次，使用从大到小的 0/1 更新。', counterexampleInputId: 'repeated', explanation: '[2] 凑 6 可以使用三枚 2；按每币一次会误报无解。面值数组不是硬币库存。' },
    { id: '322-error-sentinel', description: '把默认零当作可达最优，或直接返回不可达哨兵。', counterexampleInputId: 'unreachable', explanation: '[2,4] 凑 7 应返回 -1。未凑出的正金额必须保留哨兵，结束时转换为 -1。' },
    { id: '322-error-index', description: '没有先检查 coin<=value 就读取 dp[value-coin]。', counterexampleInputId: 'int-max-coin', explanation: '面值可为 2147483647；比较后直接跳过，不进行越界读取，也不要先将 coin 与金额相加。' },
  ],
  testSuite: { version: PROBLEM_META['322'].testSuiteVersion, cases, wrongFixtures: [
    { id: '322-wrong-greedy', source: WRONG_GREEDY_SOURCE, targetedCaseIds: ['greedy-trap', 'greedy-stuck', 'mixed'] },
    { id: '322-wrong-once', source: WRONG_ONCE_SOURCE, targetedCaseIds: ['repeated', 'greedy-trap', 'unsorted'] },
  ] },
  visualization: { modelId: '322-ascending-amount-dp', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson322;
