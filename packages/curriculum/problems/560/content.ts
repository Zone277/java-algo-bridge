import { PROBLEM_META, type Lesson, type SubarraySumInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson560 = Extract<Lesson, { id: '560' }>;

export const demoInputs: { id: string; title: string; input: SubarraySumInput }[] = [
  { id: 'basic', title: '两个重叠区间：1、1、1，k=2', input: { nums: [1, 1, 1], k: 2 } },
  { id: 'negative-zero', title: '负数与零产生重复前缀', input: { nums: [1, -1, 0], k: 0 } },
  { id: 'all-zeros', title: '三个零共有六个非空区间', input: { nums: [0, 0, 0], k: 0 } },
  { id: 'single-zero', title: '只有一个零，不能计入空区间', input: { nums: [0], k: 0 } },
];

const cases: Lesson560['testSuite']['cases'] = [
  { id: 'basic', input: demoInputs[0]!.input, expected: { kind: 'int', value: 2 }, coverage: '区间 [0,1] 与 [1,2] 都计入；允许重叠，返回数量而不是一个区间。' },
  { id: 'negative-zero', input: demoInputs[1]!.input, expected: { kind: 'int', value: 3 }, coverage: '负数、零与重复前缀；[0,1]、[0,2]、[2,2] 三个区间。' },
  { id: 'all-zeros', input: demoInputs[2]!.input, expected: { kind: 'int', value: 6 }, coverage: '同一前缀和的频次不断增加；每轮新增 1、2、3 个区间，不能只存存在性。' },
  { id: 'single-zero', input: demoInputs[3]!.input, expected: { kind: 'int', value: 1 }, coverage: '最小长度且 k=0；先写入再计数会把空区间也算上，错误得到 2。' },
  { id: 'single-hit', input: { nums: [7], k: 7 }, expected: { kind: 'int', value: 1 }, coverage: '单元素即答案；需要初始 0→1 才能识别从下标 0 开始的区间。' },
  { id: 'single-miss', input: { nums: [7], k: 0 }, expected: { kind: 'int', value: 0 }, coverage: '没有非空区间和为零；不能因为当前前缀与自己相减为零而计数。' },
  { id: 'negative-target', input: { nums: [-2, -1, -2], k: -3 }, expected: { kind: 'int', value: 2 }, coverage: '全负数组与负 k 合法，两段相邻区间均应统计。' },
  { id: 'whole-prefix', input: { nums: [2, -1, 2], k: 3 }, expected: { kind: 'int', value: 1 }, coverage: '完整数组是唯一答案；检查前缀初始零和处理最后一个元素。' },
  { id: 'not-subsequence', input: { nums: [1, 4, 2], k: 3 }, expected: { kind: 'int', value: 0 }, coverage: '1 与 2 不能跨过 4 单独相加；子数组必须连续，不是任选子序列。' },
  { id: 'mixed-overlap', input: { nums: [3, 4, -7, 1, 3, 3, 1, -4], k: 7 }, expected: { kind: 'int', value: 4 }, coverage: '重复前缀、跨负数和多个不同右端同时出现，检查完整累积过程。' },
  { id: 'repeated-prefix', input: { nums: [1, -1, 1, -1], k: 0 }, expected: { kind: 'int', value: 4 }, coverage: '相同前缀来自不同位置，保留次数才能得到四个和为零的区间。' },
  { id: 'window-trap', input: { nums: [3, -2, 2], k: 1 }, expected: { kind: 'int', value: 1 }, coverage: '右扩到 -2 后和从 3 降到 1；正数滑窗提前丢弃 3 会漏掉答案。' },
  { id: 'value-bounds', input: { nums: [1000, -1000, 1000, -1000], k: 0 }, expected: { kind: 'int', value: 4 }, coverage: '元素值域两端与前缀重复，负数不得在输入端被排除。' },
  { id: 'max-positive-prefix', input: { nums: Array.from({ length: 10000 }, () => 1000), k: 10000000 }, expected: { kind: 'int', value: 1 }, coverage: '真实输入长度及正 k 上界，只有完整数组命中，前缀达到 10000000。' },
  { id: 'max-negative-prefix', input: { nums: Array.from({ length: 10000 }, () => -1000), k: -10000000 }, expected: { kind: 'int', value: 1 }, coverage: '真实输入长度及负 k 下界，前缀达到 -10000000，仍可用 Java int。' },
  { id: 'max-count', input: { nums: Array.from({ length: 10000 }, () => 0), k: 0 }, expected: { kind: 'int', value: 50005000 }, coverage: '最大数量 n(n+1)/2=50005000；真实运行接受 10000 项，不被演示上限截断。' },
];

export const WRONG_STORE_FIRST_SOURCE = `import java.util.HashMap;
import java.util.Map;
class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        freq.put(0, 1);
        int prefix = 0, count = 0;
        for (int value : nums) {
            prefix += value;
            freq.put(prefix, freq.getOrDefault(prefix, 0) + 1);
            count += freq.getOrDefault(prefix - k, 0);
        }
        return count;
    }
}
`;

export const WRONG_FORGET_FREQUENCY_SOURCE = `import java.util.HashMap;
import java.util.Map;
class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        freq.put(0, 1);
        int prefix = 0, count = 0;
        for (int value : nums) {
            prefix += value;
            count += freq.getOrDefault(prefix - k, 0);
            freq.put(prefix, 1);
        }
        return count;
    }
}
`;

export const lesson560 = {
  schemaVersion: 1, id: '560', slug: 'subarray-sum-equals-k', title: '和为 K 的子数组', order: 31,
  lessonVersion: PROBLEM_META['560'].lessonVersion, prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: [
    '区分非空连续子数组、子序列和一种解法，按不同起止位置统计全部答案。',
    '从区间和等于两个前缀之差，推导此前前缀的频次 Map 与先查后存不变量。',
    '用 Java getOrDefault、Integer 泛型和整数累加实现方法，并以零与负数反例排查错误。',
  ],
  source: { platform: 'LeetCode', number: 560, url: 'https://leetcode.com/problems/subarray-sum-equals-k/' },
  taskSemantics: '给定整数数组 nums 与整数 k，统计有多少个非空连续子数组的元素和恰好等于 k。每个区间由不同的起止下标确定；区间可以重叠，也可以有相同的元素序列。返回总数量，不返回区间、最大长度或布尔值。nums 与 k 都允许负数或零。题意参考 LeetCode 560，本站文字、例子、代码与演示原创，无官方关联。',
  siteLimits: { description: '本站教学输入上限：nums 长度 1—10000，元素为 -1000—1000，k 为 -10000000—10000000。参考状态演示最多 29 项，以让初始零在内的前缀频次表最多 30 键；30—10000 项仍可真实运行。最大答案 50005000、前缀绝对值最多 10000000，prefix-k 绝对值最多 20000000，都在 Java int 范围。', inputSchemaId: 'SubarraySumInputSchema' },
  steps: [
    { id: '560-syntax-method', kind: 'syntax', title: 'J1 / J2 / J3 · 数组引用与整数计数', body: 'public int subarraySum(int[] nums,int k) 返回整数数量。nums 保存数组对象的引用值，k、prefix、count、i、needed、matches 保存 int 基本值；Java 方法参数都按值传递，不能说所有变量都保存对象引用。nums.length 是字段，合法下标为 0…length-1。prefix += nums[i] 等价于把相加结果写回 prefix，不修改 nums；count += matches 则累积数量。for 声明的 i 只在循环内有效，needed 与 matches 只在本轮循环块内有效。', relatedIds: ['J1', 'J2', 'J3'] },
    { id: '560-syntax-map', kind: 'syntax', title: 'J5 · getOrDefault 与出现次数', body: '导入 java.util.Map 与 java.util.HashMap。Map<Integer,Integer> freq=new HashMap<>() 创建“前缀和→出现次数”的映射，Map 是接口类型，HashMap 是具体实现。泛型写 Integer 而非 int；put 与读取时使用自动装箱、拆箱。freq.getOrDefault(key,0) 返回旧次数或 0，本身不插入任何键；freq.put(key,old+1) 才把次数更新。不能把 value 写成当前下标，也不能每次都覆盖成 1。本课不依赖 HashMap 的迭代顺序，演示按首次插入顺序显示仅为便于阅读。', relatedIds: ['J5'] },
    { id: '560-understanding', kind: 'understanding', title: '手算 · 重叠合法，跳过中间不合法', body: '输入 {"nums":[1,1,1],"k":2}：下标区间 [0,1]、[1,2] 各有两个 1，答案是 2，虽然它们重叠。两段长度相同、内容相同，也因位置不同分别计数。[1,4,2]、k=3 的答案却为 0，不能跳过 4 选择 1 与 2。\n再看 [1,-1,0]、k=0：满足的是 [0,1]、[0,2]、[2,2]，一共 3 段。空子数组不计入；[0]、k=0 只有单元素这一段，答案为 1。可信调用器读取实际返回 int，打印数字或 PASS 不能代替返回值。', relatedIds: ['basic', 'negative-zero', 'not-subsequence', 'single-zero'] },
    { id: '560-derive-enumeration', kind: 'derivation', title: '初始办法 · 枚举右端再累加', body: '固定左端 l，让右端 r 从 l 向右移动，累加 nums[r]，每次和等于 k 就加一。这覆盖每个非空连续区间一次，时间 O(n²)、额外空间 O(1)，可作为小输入的独立检查。不能照搬 209 的正数滑窗：当存在负数时，扩大窗口未必增大和，缩小窗口也未必减小和。[3,-2,2]、k=1 中先看到 3 就收缩会丢掉后面的 [3,-2]。', relatedIds: ['window-trap'] },
    { id: '560-derive-prefix', kind: 'derivation', title: '推导 · 从区间和到前缀之差', body: '定义数学记号 P(t)=前 t 项之和，P(0)=0。区间 [l,r] 的和是 P(r+1)-P(l)。固定 r 后，要得到 k，就寻找此前有多少个 P(l)=P(r+1)-k，其中 0≤l≤r。prefix 只滚动保存当前 P(r+1)，不需要构建 Java 前缀数组；freq 保存更早前缀值的出现次数。一次出现对应一个起点，同值在不同位置出现必须分别计数。初始写入 0→1，代表 P(0)，让从下标 0 开始的非空区间也能被发现。', relatedIds: ['single-hit', 'whole-prefix'] },
    { id: '560-derive-timeline', kind: 'derivation', title: '手算频次 · 同一个零为何能出现三次', body: '对 [1,-1,0]、k=0，初始 freq={0→1}、prefix=count=0。i=0 后 prefix=1，找 1 的旧次数 0，count 仍 0，再记 1→1。i=1 后 prefix=0，找 0 的旧次数 1，count=1，再把 0 更新为 2。i=2 后 prefix=0，找 0 的旧次数 2，count=3，再把 0 更新为 3。最后表中的三个零前缀来自长度 0、2、3，不是三个零元素。把次数总写成 1 会漏掉不同起点。', relatedIds: ['negative-zero', 'repeated-prefix'] },
    { id: '560-derive-invariant', kind: 'derivation', title: '不变量 · 先查旧前缀，再存当前前缀', body: '进入第 i 轮前：prefix=P(i)，freq 精确记录 P(0)…P(i) 的频次，count 统计所有右端小于 i 的有效区间。先加 nums[i] 得到 P(i+1)，旧表仍只有更早位置；查询 prefix-k 的次数 matches，再 count+=matches，最后才把当前 prefix 的次数加 1。这时 freq 记录 P(0)…P(i+1)，下一轮不变量恢复。若先存再查，k=0 时会把当前前缀与自己配对，误算一个空区间。每轮只新增以 i 为右端的答案，既不遗漏也不重复。', relatedIds: ['single-zero', 'single-miss'] },
    { id: '560-derive-bounds', kind: 'derivation', title: '复杂度与边界 · 计数可能远大于数组长度', body: '每项进行固定次数 Map 查询与更新，HashMap 通常平均情形下时间 O(n)，最多 n+1 个前缀键，额外空间 O(n)。这是算法结构分析，几次真实运行时间不能证明渐进复杂度。长度 n 的全零数组、k=0 时，每个非空区间都满足，总数 1+2+…+n=n(n+1)/2；本站 n=10000 时为 50005000，可以用 int。freq 的次数最大为 10001。负 k、无解、单元素都使用同一规则，无须提前把 k=0 判为无解。', relatedIds: ['max-count', 'max-positive-prefix', 'max-negative-prefix'] },
    { id: '560-prediction', kind: 'prediction', title: '先预测，再揭示 · 旧频次与最终总数', body: '先预测第一次 lookup 的 matches，再预测最后 count。切换输入后，检查点由新输入快照重新计算；即使输入只有一个元素也保留两个检查点。请注意 lookup 不改表也不改 count；store 之后看到的新频次不能倒用为本轮 matches。预测属于参考模型教学检查，不代表 Java 已经编译或通过本站测试。', relatedIds: ['560-predict-first', '560-predict-final'] },
    { id: '560-reference', kind: 'reference-demo', title: '参考演示 · 每次查询与写入分开', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组 nums、freq、变量表、代码高亮和解释都读取同一个不可变快照，表示对应语句执行后的状态。prefix 是整数，不画成源码中并不存在的数组；前缀长度、收录前缀数与已计数右端数明确标为教学辅助量。Map 仅在 new 执行后出现。可前进、后退、播放、暂停、重置与切换输入，旧快照不会被后续 put 改写。参考答案默认折叠，展开记录答案使用；编辑学生源码不能改变这些预置轨迹。', relatedIds: demoInputs.map(demo => demo.id) },
    { id: '560-guided', kind: 'guided-code', title: '引导编写 · 初值、时序与完整方法', body: '先补空前缀初值及所需旧前缀，再自己组织查询、累加与记录的顺序，最后从独立骨架完成方法。支架自检只辅助学习；最终完整 Solution 必须交给真实 Docker Java runner 编译执行。正确的其他算法同样可通过本站测试，判题不比对源码字符串。', relatedIds: ['560-guided-code'] },
    { id: '560-independent', kind: 'independent-code', title: '独立挑战 · 用最短反例定位顺序', body: '独立模式只提供方法骨架和必要 import。先运行 [0]、k=0，再试 [0,0,0]、k=0 与 [1,-1,0]、k=0；这些输入分别检验空区间、频次及负数。完成后提交本站全部用例。编译失败先读 javac 的行号与诊断；返回错误则比对实际输出与期望，检查当前源码的 sourceHash。只有真实 submit 全通过才记录当前代码通过，不能把静态练习当作引导或独立通过。', relatedIds: ['J8', 'single-zero', 'all-zeros', 'negative-zero'] },
    { id: '560-summary', kind: 'summary', title: '复盘 · 一个频次对应多少起点', body: '说明 P(0) 的作用、freq 的键和值、查询时允许哪些前缀位置，以及为何当前前缀必须最后写入。再解释零元素导致多个前缀同值时，count 为何可能一次增加大于 1。本站分别保存预测、提示使用、答案查看、引导通过与独立模式通过本站测试；看过答案、访问页面或播放动画不等于掌握，也不宣称通过 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '5ba261ba0e15ed377963782cb3b72e1e5f616aa088710711b118f7fed7867e36', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: '560-hint-concept', level: 1, body: '把 [l,r] 的和写成“前 r+1 项之和减去前 l 项之和”。固定右端后，需要寻找怎样的旧前缀？' },
    { id: '560-hint-invariant', level: 2, body: 'Map 保存此前前缀和的出现次数，初始 0→1。查找 prefix-k 时，当前 prefix 尚未记录，以保证左端严格早于当前前缀位置。' },
    { id: '560-hint-pseudocode', level: 3, body: 'freq[0]=1，prefix=count=0；逐项 prefix+=当前值；matches=旧表中 prefix-k 的次数；count+=matches；再把 freq[prefix] 加 1；最后返回 count。' },
  ],
  predictionChecks: [
    { id: '560-predict-first', prompt: 'nums=[1,1,1]、k=2，第一次 prefix=1，旧表为 {0→1}。needed=-1 的次数是多少？', answer: { kind: 'int', value: 0 }, explanation: '旧表没有 -1，getOrDefault(-1,0) 得到 0；不插入这个键。', checkpointId: 'first-matches' },
    { id: '560-predict-final', prompt: 'nums=[1,1,1]、k=2，最后返回多少个非空连续子数组？', answer: { kind: 'int', value: 2 }, explanation: '下标区间 [0,1] 与 [1,2] 各计一次，答案为 2。', checkpointId: 'final-count' },
  ],
  guided: { id: '560-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '560-guided-initial', instruction: '支架 1 / 3：补空前缀的初始记录与 needed 表达式；说明为什么初值不是空表。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('freq.put(0, 1);', '/* TODO：记录唯一的长度 0 前缀 */').replace('int needed = prefix - k;', 'int needed = /* TODO：所需旧前缀和 */;') },
    { id: '560-guided-order', instruction: '支架 2 / 3：在每次更新 prefix 后，补先查次数、再累加 count、最后更新频次的三步。用 [0]、k=0 检查。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;
class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        freq.put(0, 1);
        int prefix = 0, count = 0;
        for (int value : nums) {
            prefix += value;
            // TODO：查询旧频次、累加答案、再记录当前前缀。
        }
        return count;
    }
}
` },
    { id: '560-guided-whole', instruction: '支架 3 / 3：从方法骨架写完整 Java，并提交真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '560-error-store-first', description: '先把当前前缀放入表，再查找 prefix-k。', counterexampleInputId: 'single-zero', explanation: '[0]、k=0 会返回 2，而非 1；多出来的一次来自当前前缀与自己配对，是不允许的空区间。' },
    { id: '560-error-one-per-key', description: '只用集合或每次把次数写成 1，忽略重复前缀的不同位置。', counterexampleInputId: 'all-zeros', explanation: '[0,0,0] 每个右端分别新增 1、2、3 段，总数 6；仅保存存在性会错误返回 3。' },
    { id: '560-error-empty-seed', description: '忘记初始 freq.put(0,1)，使从数组开头开始的答案丢失。', counterexampleInputId: 'single-hit', explanation: '[7]、k=7 需要查旧前缀 0；没有 P(0) 便错误返回 0，正确答案为 1。' },
    { id: '560-error-window', description: '照搬正数滑动窗口，和超过 k 就立即丢弃左端。', counterexampleInputId: 'window-trap', explanation: '[3,-2,2]、k=1 中 [3,-2] 是答案；先丢掉 3 会漏解，因为加入负数可以减小和。' },
    { id: '560-error-subsequence', description: '允许跳过数组中间的元素，统计任意选择的子序列。', counterexampleInputId: 'not-subsequence', explanation: '[1,4,2]、k=3 不能只取 1 和 2；没有连续区间满足条件，正确返回 0。' },
  ],
  testSuite: { version: PROBLEM_META['560'].testSuiteVersion, cases, wrongFixtures: [
    { id: '560-wrong-store-first', source: WRONG_STORE_FIRST_SOURCE, targetedCaseIds: ['single-zero', 'single-miss', 'all-zeros', 'repeated-prefix'] },
    { id: '560-wrong-forget-frequency', source: WRONG_FORGET_FREQUENCY_SOURCE, targetedCaseIds: ['negative-zero', 'all-zeros', 'repeated-prefix', 'max-count'] },
  ] },
  visualization: { modelId: '560-online-prefix-frequency', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson560;
