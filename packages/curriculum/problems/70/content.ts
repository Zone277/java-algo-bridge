import { PROBLEM_META, type ClimbStairsInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type ClimbStairsLesson = Extract<Lesson, { id: '70' }>;

export const demoInputs: { id: string; title: string; input: ClimbStairsInput }[] = [
  { id: 'five-steps', title: '递推三次：n=5', input: { n: 5 } },
  { id: 'base-two', title: '两种基础走法：n=2', input: { n: 2 } },
  { id: 'seven-steps', title: '继续滚动：n=7', input: { n: 7 } },
];

const cases: ClimbStairsLesson['testSuite']['cases'] = [
  { id: 'one-step', input: { n: 1 }, expected: { kind: 'int', value: 1 }, coverage: '最小输入：直接命中 n=1 基例，不得访问第 2 级状态。' },
  { id: 'base-two', input: { n: 2 }, expected: { kind: 'int', value: 2 }, coverage: '第二个基础值：1+1 与 2 共两种，抓住 n<=2 都返回 1 的错误。' },
  { id: 'three-steps', input: { n: 3 }, expected: { kind: 'int', value: 3 }, coverage: '第一次递推必须执行，抓住 step<n 少算一级。' },
  { id: 'four-steps', input: { n: 4 }, expected: { kind: 'int', value: 5 }, coverage: '连续两次滚动，检查 previous/current 更新顺序。' },
  { id: 'five-steps', input: { n: 5 }, expected: { kind: 'int', value: 8 }, coverage: '默认手算与演示输入，完整覆盖基例、递推与返回。' },
  { id: 'six-steps', input: { n: 6 }, expected: { kind: 'int', value: 13 }, coverage: '奇偶级切换后继续滚动，避免将 previous 留在旧值。' },
  { id: 'ten-steps', input: { n: 10 }, expected: { kind: 'int', value: 89 }, coverage: '多轮递推，检查循环起点、终点和累积状态。' },
  { id: 'twenty-steps', input: { n: 20 }, expected: { kind: 'int', value: 10946 }, coverage: '中等规模，能抓住硬编码小表或错误递推初值。' },
  { id: 'forty-four', input: { n: 44 }, expected: { kind: 'int', value: 1134903170 }, coverage: '靠近本站上限，结果仍在 Java int 正数范围。' },
  { id: 'forty-five', input: { n: 45 }, expected: { kind: 'int', value: 1836311903 }, coverage: '本站最大 n，检查循环完整走到 step==n 且 int 不溢出。' },
];

export const WRONG_BOTH_BASES_ONE_SOURCE = `class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return 1;
        int previous = 1;
        int current = 2;
        for (int step = 3; step <= n; step++) {
            int next = previous + current;
            previous = current;
            current = next;
        }
        return current;
    }
}
`;

export const WRONG_LOOP_STOPS_EARLY_SOURCE = `class Solution {
    public int climbStairs(int n) {
        if (n == 1) return 1;
        int previous = 1;
        int current = 2;
        for (int step = 3; step < n; step++) {
            int next = previous + current;
            previous = current;
            current = next;
        }
        return current;
    }
}
`;

export const WRONG_OVERWRITE_SOURCE = `class Solution {
    public int climbStairs(int n) {
        if (n == 1) return 1;
        int previous = 1;
        int current = 2;
        for (int step = 3; step <= n; step++) {
            previous = current;
            current = previous + current;
        }
        return current;
    }
}
`;

const guidedArrayDp = `class Solution {
    public int climbStairs(int n) {
        int[] ways = new int[n + 1];
        ways[1] = 1;
        if (n == 1) return ways[1];
        ways[2] = 2;
        for (int step = 3; step <= n; step++) {
            // TODO：由前两级计算 ways[step]。
        }
        return ways[n];
    }
}
`;

const guidedRolling = `class Solution {
    public int climbStairs(int n) {
        if (n == 1) return 1;
        int previous = 1;
        int current = 2;
        for (int step = 3; step <= n; step++) {
            int next = previous + current;
            // TODO：先把 previous 移到旧 current，再把 current 移到 next。
        }
        return current;
    }
}
`;

export const lesson70 = {
  schemaVersion: 1,
  id: '70',
  slug: 'climbing-stairs',
  title: '爬楼梯',
  order: 9,
  lessonVersion: PROBLEM_META['70'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '使用 int 参数、int 返回值、数组下标和 for 循环表达基本递推。',
    '从最后一步只可能来自第 i-1 或 i-2 级推导 ways[i]=ways[i-1]+ways[i-2]。',
    '在不改变递推含义的前提下，把 DP 数组压缩为 previous/current/next 滚动变量。',
  ],
  source: { platform: 'LeetCode', number: 70, url: 'https://leetcode.com/problems/climbing-stairs/' },
  taskSemantics: '有一段 n 级楼梯，你每次只能向上走 1 级或 2 级。不同的步长顺序算不同走法，返回恰好到达第 n 级的走法数。本站 n 从 1 开始，不把 n=0 当作学生输入。题意参考 LeetCode 70，本课题面、手算、推导、图形和代码均为本站原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接受整数 n=1—45；该范围的结果可用 Java int 表示。参考演示最多展开 n=30 的教学递推表，n=31—45 仍可真实运行和判题。', inputSchemaId: 'ClimbStairsInput' },
  steps: [
    { id: 'syntax-int-method', kind: 'syntax', title: 'J1 / J2 · int 方法、return 与 for 边界', body: '方法签名 public int climbStairs(int n) 中，第一个 int 是返回类型，参数 n 是 int 基本值。Java 按值把 n 交给方法，学生无需 main；可信调用器读取真实 int 返回值，打印 PASS 不参与判定。if (n == 1) return 1; 在最小输入立即结束。for (int step=3; step<=n; step++) 从第一个需递推的等级 3 开始；<= 保证第 n 级本身被计算。', relatedIds: ['J1', 'J2'] },
    { id: 'syntax-array-dp', kind: 'syntax', title: 'J3 · 先读懂 int[] DP 表', body: '最直接的 Java DP 可写 int[] ways = new int[n + 1];，这会创建一个下标 0…n 的整数数组，新 int 数组默认填 0。本课定义 ways[i] 为恰好到第 i 级的走法数，因此 ways[1]=1、ways[2]=2，之后 ways[i]=ways[i-1]+ways[i-2]。因为 n 可能是 1，写 ways[2] 前应先处理 n==1，否则长度 2 的数组下标 2 越界。数组是对象，ways 保存引用值；修改 ways[i] 是修改数组对象的元素。', relatedIds: ['J3', 'one-step'] },
    { id: 'syntax-rolling-values', kind: 'syntax', title: '滚动变量 · 保存前两项就足够', body: '参考 Java 没有创建 ways 数组，而是令 previous=ways[1]=1、current=ways[2]=2。每轮先用 int next=previous+current 保存新值，再执行 previous=current，current=next。如果不保存 next 就先覆盖 previous，之后的加法会重复使用旧 current。状态演示中的 dp 结构是让你看见 ways 定义和已推导项的教学账本；它不表示这份参考 Java 实际分配了 int[]，也不应被用来声称参考算法使用 O(n) 额外空间。', relatedIds: [] },
    { id: 'understanding-stairs', kind: 'understanding', title: '读题与手算 · n=5 的走法数', body: '输入在本站用 JSON {"n":5} 表示，学生方法只接收整数 5，不自己解析 JSON。输出的结构化形式是 {"kind":"int","value":8}。手算：到第 1 级只有 [1]，所以 ways[1]=1；到第 2 级有 [1,1] 和 [2]，所以 ways[2]=2。之后不必列出全部序列：ways[3]=1+2=3，ways[4]=2+3=5，ways[5]=3+5=8。这里 [1,2] 和 [2,1] 是两种不同走法，因为步长顺序不同。', relatedIds: ['five-steps'] },
    { id: 'derivation-last-step', kind: 'derivation', title: '推导 · 最后一步来自 i-1 或 i-2', body: '把恰好到达第 i 级的所有走法按“最后一步”分类。若最后走 1 级，那么之前必须恰好在 i-1，有 ways[i-1] 种；若最后走 2 级，之前必须恰好在 i-2，有 ways[i-2] 种。两类最后步不可能同时成立，且覆盖了所有可能，因此数量相加：ways[i]=ways[i-1]+ways[i-2]。这个推导从 i=3 开始，前两项由题意直接给出。', relatedIds: [] },
    { id: 'derivation-rolling-invariant', kind: 'derivation', title: '不变量 · 更新前后的 previous/current', body: '处理 step 前维持：previous=ways[step-2]，current=ways[step-1]，教学表中 1…step-1 的值已确定。先计算 next=previous+current，此时两个旧值都还在，next=ways[step]。随后先 previous=current，再 current=next；更新后 previous=ways[step-1]、current=ways[step]，不变量为下一轮保持。循环结束时 step=n+1，所以 current=ways[n]。整个方法对每级做固定次操作，时间 O(n)；参考 Java 只保存固定个 int 局部变量，额外空间 O(1)。这来自代码结构，不是从几次偶然运行耗时推断。', relatedIds: ['three-steps', 'forty-five'] },
    { id: 'prediction-base-final', kind: 'prediction', title: '先预测分支，再预测终态', body: '默认 n=5。首先预测 n==1 是否直接返回；继续手算滚动变量后，再预测最终 int 返回值。切换 n=1 时，第一个选项会动态变为“直接返回 1”。答案来自所选输入的当前不可变快照，提交后才揭示；这些教学预测不是学生 Java 的真实运行。', relatedIds: ['predict-base-decision', 'predict-final-count'] },
    { id: 'reference-dp-demo', kind: 'reference-demo', title: '参考算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表显示参考 Java 的 previous/current/next，dp 结构只显示同一递推定义中已推导的 ways 值。所有变量、dp 格、解释和代码高亮读取同一份不可变快照。上一步、下一步、播放、暂停与重置只切换快照；切换输入重建参考轨迹。学生源码不会修改演示或生成自己的调试轨迹。', relatedIds: ['five-steps', 'base-two', 'seven-steps'] },
    { id: 'guided-climb-code', kind: 'guided-code', title: '引导编写 · 先数组 DP，再滚动压缩', body: '第一段在 int[] ways 支架中补递推式，先建立每个下标的含义；第二段使用 previous/current/next 保留相同递推，练习正确覆盖顺序；第三段从空方法骨架完整编写。静态练习不用字符串或参考源码相等性做功能判定；最终必须把完整 Solution 提交到真实 Java runner，由可信调用器检查 int 返回值。', relatedIds: ['guided-climb'] },
    { id: 'independent-climb', kind: 'independent-code', title: '独立挑战 · 从方法骨架开始', body: '独立模式只提供 Solution 与 climbStairs 方法骨架，不预填基例、循环或完整解法。先真实运行 n=1、2、3，再提交全部本站用例。若 n=2 失败，检查基例；若 n=3 还返回 2，检查 <= 循环边界；若从 n=4 开始偏大，检查是否在保存 next 前覆盖了 previous。只有当前完整源码真实 submit 全通过才记录独立模式通过本站测试。', relatedIds: [] },
    { id: 'summary-climb', kind: 'summary', title: '复盘 · 从定义到压缩', body: '请用自己的话回答：ways[i] 表示什么？最后一步为什么只划分为 i-1 和 i-2？为什么 n=1 要先返回？compute-next 时 previous/current 各是哪一项？教学 dp 表与参考 Java 的实际局部变量有什么区别？本站分别保存预测、提示、查看答案、引导通过和独立通过；通过只指通过本站测试，不是 LeetCode 官方评测结论。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'bf897f71b665fb5cee3f288080f00b1cb71f0cec26862552012bd40c140393b7',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: 'hint-last-step', level: 1, body: '先不写代码：恰好到第 i 级时，最后一步的长度只能是 1 或 2。分别删掉最后一步后，你站在哪一级？' },
    { id: 'hint-rolling-invariant', level: 2, body: '处理 step 前保持 previous=ways[step-2]、current=ways[step-1]。用两个旧值先算 next，再移动变量。' },
    { id: 'hint-rolling-pseudocode', level: 3, body: 'n==1 返回 1；previous=1、current=2；从 step=3 到 step<=n：next=previous+current，previous=current，current=next；循环后返回 current。' },
  ],
  predictionChecks: [
    { id: 'predict-base-decision', prompt: '默认 n=5，n==1 检查后会直接返回，还是继续初始化 previous/current？', answer: { kind: 'choice', optionId: 'continue' }, options: [{ id: 'return-base', label: '直接返回 1' }, { id: 'continue', label: '继续初始化 previous/current' }], explanation: 'n=5 不等于 1，继续初始化 ways[1] 和 ways[2] 对应的滚动值。', checkpointId: 'base-decision' },
    { id: 'predict-final-count', prompt: '默认 n=5，ways[1]=1、ways[2]=2，依次递推到 ways[5] 后，climbStairs 返回多少？', answer: { kind: 'int', value: 8 }, explanation: 'ways[3]=3，ways[4]=5，ways[5]=8；终态 current 就是 ways[5]。', checkpointId: 'final-result' },
  ],
  guided: {
    id: 'guided-climb',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-array-recurrence', instruction: '支架 1 / 3：先在 int[] ways 版本中补 ways[step]，用下标确认它只依赖前两项。完整数组 DP 也可作为正确提交。', scaffoldSource: guidedArrayDp, checkKind: 'static-practice' },
      { id: 'guided-rolling-update', instruction: '支架 2 / 3：递推和 next 已给出。补 previous/current 的两次赋值，保证旧 current 在覆盖前被移到 previous。', scaffoldSource: guidedRolling, checkKind: 'static-practice' },
      { id: 'guided-whole-climb', instruction: '支架 3 / 3：从方法骨架独立选择数组 DP 或滚动变量并写完。最终提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-both-bases-one', description: '写 if (n <= 2) return 1，把第 2 级的两种走法压成一种。', counterexampleInputId: 'base-two', explanation: 'n=2 时可以走 [1,1] 或 [2]，正确结果是 2。只有 n=1 直接返回 1，或明确写 n==2 返回 2。' },
    { id: 'error-loop-short', description: '循环条件写 step < n，没有计算第 n 级。', counterexampleInputId: 'three-steps', explanation: 'n=3 时循环从 step=3 开始；若条件是 3<3，一次都不执行就错误返回 2。应使用 step<=n。' },
    { id: 'error-overwrite-before-sum', description: '在保存 previous+current 之前就把 previous 覆盖成 current。', counterexampleInputId: 'four-steps', explanation: '计算第 3 级时应使用旧值 1+2=3。若先 previous=current，再 current=previous+current，会变成 2+2=4。先用 next 保存和。' },
    { id: 'error-index-two-for-one', description: '无条件创建 new int[n+1] 后立即写 ways[2]=2，忽略 n=1。', counterexampleInputId: 'one-step', explanation: 'n=1 时数组长度是 2，合法下标只有 0 和 1；写 ways[2] 会抛 ArrayIndexOutOfBoundsException。先处理 n==1。' },
  ],
  testSuite: {
    version: PROBLEM_META['70'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-both-bases-one', source: WRONG_BOTH_BASES_ONE_SOURCE, targetedCaseIds: ['base-two'] },
      { id: 'wrong-loop-stops-early', source: WRONG_LOOP_STOPS_EARLY_SOURCE, targetedCaseIds: ['three-steps', 'five-steps', 'forty-five'] },
      { id: 'wrong-overwrite-before-sum', source: WRONG_OVERWRITE_SOURCE, targetedCaseIds: ['three-steps', 'four-steps', 'ten-steps'] },
    ],
  },
  visualization: { modelId: '70-rolling-dp', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
