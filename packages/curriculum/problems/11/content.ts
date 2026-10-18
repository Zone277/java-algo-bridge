import { ContainerWaterInputSchema, PROBLEM_META, expectedOutput, type ContainerWaterInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson11 = Extract<Lesson, { id: '11' }>;
type Case11 = Lesson11['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: ContainerWaterInput }[] = [
  { id: 'inner-best', title: '两端交替收缩：[2,6,4,1,5,3]', input: { height: [2, 6, 4, 1, 5, 3] } },
  { id: 'right-shorter', title: '右端较短：[7,1,2,5]', input: { height: [7, 1, 2, 5] } },
  { id: 'equal-pair', title: '最短输入、两端等高：[4,4]', input: { height: [4, 4] } },
  { id: 'zero-pair', title: '最短输入、高度为零：[0,0]', input: { height: [0, 0] } },
];

function testCase(id: string, raw: ContainerWaterInput, coverage: string): Case11 {
  const input = ContainerWaterInputSchema.parse(raw);
  const expected = expectedOutput('11', input);
  if (expected.kind !== 'int') throw new Error('11 expected output must be int');
  return { id, input, expected, coverage };
}

const cases: Case11[] = [
  testCase('11-inner-best', demoInputs[0]!.input, '最大面积来自内部下标 1、4；必须先左移再右移，不能只检查最外两端。'),
  testCase('11-two', { height: [2, 5] }, '最短合法长度 2；宽度为 1，高度由短板 2 限制，结果为 2。'),
  testCase('11-zero', demoInputs[3]!.input, '全零且最短输入；合法最大面积为 0，不应抛异常或无限循环。'),
  testCase('11-one-zero', { height: [0, 4] }, '只有一端为零，另一端再高也不能形成正面积。'),
  testCase('11-equal', { height: [4, 4, 4, 4] }, '多个等高端点；应保留最宽配对面积，等高时移动任何一端都可以。'),
  testCase('11-tall-ends', { height: [5, 0, 0, 0, 5] }, '两端高而中间为零；容器只由选定两端决定，不能把中间高度或接雨水量加入面积。'),
  testCase('11-increasing', { height: [1, 2, 3, 4, 5] }, '高度递增；移动短左端可能改善短板，最高的相邻两条线并非最优。'),
  testCase('11-decreasing', { height: [5, 4, 3, 2, 1] }, '高度递减；右端必须能持续左移，镜像输入答案仍为 6。'),
  testCase('11-tall-center', { height: [1, 8, 1, 1] }, '单个很高的内部竖线不能独自决定面积；最优为首尾宽度 3、短板 1。'),
  testCase('11-right-shorter', demoInputs[1]!.input, '首次较短的是右端；先记录外侧最大面积后排除右端，best 不能被后续小面积覆盖。'),
  testCase('11-height-limit', { height: [10000, 0, 10000] }, '本站高度上限 10000；两端相距 2，检验乘积和零高内部项。'),
  testCase('11-length-limit', { height: Array<number>(10000).fill(10000) }, '真实判题长度与高度均达本站上限；答案 99990000 可由 Java int 表示，不用于参考演示。'),
];

export const WRONG_TALLER_SIDE_SOURCE = `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            best = Math.max(best, (right - left) * Math.min(height[left], height[right]));
            if (height[left] < height[right]) right--; else left++;
        }
        return best;
    }
}
`;

export const WRONG_INCLUSIVE_WIDTH_SOURCE = `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            int area = (right - left + 1) * Math.min(height[left], height[right]);
            best = Math.max(best, area);
            if (height[left] <= height[right]) left++; else right--;
        }
        return best;
    }
}
`;

export const WRONG_TALLER_HEIGHT_SOURCE = `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            int area = (right - left) * Math.max(height[left], height[right]);
            best = Math.max(best, area);
            if (height[left] <= height[right]) left++; else right--;
        }
        return best;
    }
}
`;

const guidedArea = REFERENCE_SOURCE.replace('int area = width * shorter;', 'int area = 0; // TODO：把 width 和 shorter 合成正确面积');
const guidedMove = `class Solution {
    public int maxArea(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int best = 0;
        while (left < right) {
            int width = right - left;
            int shorter = Math.min(height[left], height[right]);
            int area = width * shorter;
            best = Math.max(best, area);
            // TODO：排除较短的一端；两端相等时任选一端，保证每轮向内移动。
            throw new UnsupportedOperationException("请补全指针移动");
        }
        return best;
    }
}
`;

export const lesson11 = {
  schemaVersion: 1,
  id: '11',
  slug: 'container-with-most-water',
  title: '盛最多水的容器',
  order: 20,
  lessonVersion: PROBLEM_META['11'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '把两条竖线的横向距离与短板高度写成 Java int 面积表达式。',
    '用排除证明推导移动短板的双指针规则，而不是凭示例猜方向。',
    '区分本轮面积与历史最大面积，用真实 Java 反馈修正边界、乘积与指针错误。',
  ],
  source: { platform: 'LeetCode', number: 11, url: 'https://leetcode.com/problems/container-with-most-water/' },
  taskSemantics: 'height[i] 表示横坐标 i 处从地面竖起的一条线的高度。任选两个不同位置，以这两条竖线和水平地面围成不能倾斜的容器，求能容纳的最大二维面积。只计算所选两端，宽度为下标差，高度由较短线限制。题意参考 LeetCode 11；本站题面、示例、推导、图形和代码原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接受长度 2—10000 的 height 数组，每项为 0—10000 的整数；至少选择两条不同位置的线，输入不要求有序。最大面积不超过 9999×10000=99990000，Java int 足够。参考演示最多 30 项、2000 快照；长输入可真实运行，演示不会悄悄截断。', inputSchemaId: 'ContainerWaterInput' },
  steps: [
    { id: '11-syntax-method', kind: 'syntax', title: 'Java 必要语法 · 方法、数组与返回值', body: 'public int maxArea(int[] height) 类似你熟悉的 C 函数声明：参数 height 提供各位置的高度，返回一个 int 最大面积。height 变量保存数组引用值，数组元素 height[i] 保存 int 基本值。Java 方法参数按值传递，复制引用值不会复制数组对象；本解法只读输入，不修改元素。平台提供调用器，所以你写 class Solution 和方法即可，不需要 main，也不通过打印结果交卷。', relatedIds: ['J1', 'J3'] },
    { id: '11-syntax-loop', kind: 'syntax', title: 'Java 必要语法 · length、Math 和 while', body: 'height.length 是数组长度，最后一个下标是 height.length-1。left、right、width、shorter、area、best 都是 int 基本值；Math.min(a,b) 返回较小值，Math.max(a,b) 返回较大值。while (left < right) 只在两个下标不同时继续；left++ 或 right-- 向内移动一格。width、shorter、area 声明在循环体内，每轮重新计算；best 声明在外面，跨轮保留。return best 会结束方法并交回整数。本站最大乘积为 99990000，没有超出 int 范围。', relatedIds: ['J2', 'J8'] },
    { id: '11-understand', kind: 'understanding', title: '读题 · 横向距离乘以短板', body: '输入是 JSON，例如 {"height":[2,6,4,1,5,3]}。选下标 1 和 4 的两条线，高度分别为 6、5，横向距离是 4-1=3，所以面积为 3×5=15，返回整数 15。宽度是坐标差，不是数组里包含的项数；高度不能用较高的一端。中间线不是容器的新边界。本题求一对线围出的最大面积，不是逐格累计“接雨水”，也不是返回被选下标或改变数组。', relatedIds: ['11-inner-best', '11-tall-ends'] },
    { id: '11-manual', kind: 'understanding', title: '手工模拟 · 最大面积来自内部', body: '对 [2,6,4,1,5,3]：先取 (0,5)，宽 5、短板 2、面积 10，best=10；移动较短的左端到 1。再取 (1,5)，宽 4、短板 3、面积 12，best=12；移动右端到 4。取 (1,4)，宽 3、短板 5、面积 15，best=15；右端到 3。之后 (1,3) 的面积 2、(1,2) 的面积 4 都没有超过 15，右端最终与左端相遇，返回 15。每次必须先记面积再移动。', relatedIds: ['inner-best'] },
    { id: '11-derive', kind: 'derivation', title: '算法推导 · 为什么丢弃短板不会漏掉更优解', body: '初始办法是枚举所有 i<j，计算 (j-i)×min(height[i],height[j])，用 O(n²) 次配对比较得到答案。要减少比较，从最远两端向内收缩，并保存 best。若左端不高于右端，固定当前 left 与区间内任意更靠左的右端 j 配对：宽度 j-left 不会超过 right-left，短板 min(height[left],height[j]) 不会超过 height[left]，所以面积不会超过刚记录的当前面积，也不会超过 best。于是所有仍含这个 left 的未查配对都可排除，令 left++；右端较短时对称地令 right--。等高时任选一端都安全，本参考固定移动 left。移动高端没有这个排除证明。', relatedIds: [] },
    { id: '11-invariant', kind: 'derivation', title: '不变量、边界与复杂度', body: '每轮开始时，best 是已经检查过的配对中的最大面积；凡至少一端已经在 [left,right] 外的配对，其面积都不超过 best。任何可能改写 best 的配对因此仍在区间内。先更新 best 再排除短端可保持不变量；left==right 时区间内已没有合法配对，best 就是全局最优。输入至少两项，零高度合法，等高时也必须移动，避免死循环。每轮将 right-left 减少 1，共 n-1 轮，时间 O(n)，额外空间 O(1)。复杂度由操作次数推导，不是由少数用例的耗时认证。', relatedIds: ['11-two', '11-zero', '11-equal'] },
    { id: '11-predict', kind: 'prediction', title: '先预测，再揭示面积与移动方向', body: '默认演示先预测初始两端的面积，再预测参考解法接下来移动哪一端。切换输入后，答案来自新输入的不可变快照；最短两项、全零、两端等高也各有两处预测。预测是参考算法的教学检查，不表示学生代码已执行。', relatedIds: ['11-predict-area', '11-predict-side'] },
    { id: '11-reference', kind: 'reference-demo', title: '参考解法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组格表示高度数值，left/right 标出选定端点；width、shorter、area、best、代码高亮和解释都读取同一份不可变快照。这里不把格子的显示宽度当成水量。移动后的本轮面积仍属于移动前一对，下轮才重新计算；退出循环体后不再显示本轮局部变量。上一步恢复完整快照，不逆推程序。学生源码编辑与此演示分开，真实结果只来自 Docker 中的 javac/java。', relatedIds: ['inner-best', 'right-shorter', 'equal-pair', 'zero-pair'] },
    { id: '11-guided-intro', kind: 'guided-code', title: '引导编写 · 先算面积，再证明移动', body: '第一段补齐面积公式，第二段根据短板补移动规则，第三段撤去算法支架，只留方法骨架。每段都可以编辑完整 Java，并把完整 Solution 提交到真实 runner；填空提示属于静态练习，不把恰好填了参考字符串判成通过。通过条件是代码真实编译执行后返回正确面积。', relatedIds: ['11-guided'] },
    { id: '11-independent', kind: 'independent-code', title: '独立挑战 · 从骨架到失败再修正', body: '独立模式从方法骨架开始，与引导草稿分别保存。先试 [2,5] 检查宽度和短板，再试 [0,0]、[4,4,4,4] 和内部配对最优的例子。编译错误按 javac 行号检查语法；运行异常检查数组越界；结果偏大检查 +1 和 Math.max；结果偏小检查是否移动高端或丢失 best；超时检查每轮是否推进指针。编辑源码后重新运行，当前提交的真实结果才可更新通过记录。Docker 不可用会明确提示，参考演示仍不能代替执行。', relatedIds: ['J8', '11-two', '11-inner-best'] },
    { id: '11-summary', kind: 'summary', title: '复盘 · 用不等式解释每一次移动', body: '请解释：为什么水位受短板限制？为什么横向宽度不加 1？固定短端后，任何向内配对为何都不会超过刚算的面积？为什么先记 best 再移动？最后从骨架独立完成并通过本站测试。提示、查看答案、预测、引导通过、独立通过分别记录，刷新可恢复草稿；通过本站测试不代表通过 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '1c5d8bc75f0e8525a3cfe0d2e5c749876789712637596b431524ef219c926847', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(item => ({ ...item })) },
  hints: [
    { id: '11-hint-concept', level: 1, body: '一对竖线围出的面积同时受横向距离和较短一端限制。若保留短端、只向内换另一端，有机会比当前面积更大吗？' },
    { id: '11-hint-invariant', level: 2, body: '维护 best 和未排除区间 [left,right]。当前短端与任何更靠内的位置配对，宽度只会减小，高度最多仍是当前短端；记录本轮面积后，可以排除这个短端。' },
    { id: '11-hint-pseudocode', level: 3, body: 'left=0，right=length-1，best=0；当 left<right：area=(right-left)×min(两端高度)，best=max(best,area)；左端较短或等高就 left++，否则 right--；返回 best。' },
  ],
  predictionChecks: [
    { id: '11-predict-area', prompt: '默认 [2,6,4,1,5,3] 的初始两端下标为 0、5，面积是多少？', answer: { kind: 'int', value: 10 }, explanation: '宽度 5-0=5，短板 min(2,3)=2，因此面积 10。', checkpointId: 'first-area' },
    { id: '11-predict-side', prompt: '记录初始面积 10 后，本参考下一步移动哪一端？', answer: { kind: 'choice', optionId: 'left' }, options: [{ id: 'left', label: 'left++，排除左端' }, { id: 'right', label: 'right--，排除右端' }], explanation: '左端高度 2 较短；固定它向内配对宽度更小、高度最多仍为 2，因此排除 left。', checkpointId: 'first-side' },
  ],
  guided: { id: '11-guided', finalCheck: 'real-java-submit', stages: [
    { id: '11-guided-area', instruction: '支架 1 / 3：用 width 与 shorter 补全 area，注意宽度不是包含的项数。', scaffoldSource: guidedArea, checkKind: 'static-practice' },
    { id: '11-guided-move', instruction: '支架 2 / 3：用两端高度判断移动方向，删除 TODO 异常，保证每轮收缩。', scaffoldSource: guidedMove, checkKind: 'static-practice' },
    { id: '11-guided-whole', instruction: '支架 3 / 3：从方法骨架实现整个算法，提交完整 Java 到真实 runner。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '11-error-taller-side', description: '每次移动较高的一端，认为保留低端可以找到更宽的容器。', counterexampleInputId: '11-inner-best', explanation: '移动总在向内，宽度只会减小。保留短板没有让水位上升的机会；错误方案在 [2,6,4,1,5,3] 只得到 10，漏掉下标 1、4 的面积 15。' },
    { id: '11-error-width', description: '把 width 写成 right-left+1，混淆距离与元素个数。', counterexampleInputId: '11-two', explanation: '[2,5] 的两个坐标是 0、1，间距为 1，面积为 2；加 1 会错误返回 4。' },
    { id: '11-error-taller-height', description: '计算面积时取 Math.max(height[left],height[right])。', counterexampleInputId: '11-one-zero', explanation: '[0,4] 的短端为 0，不能装水；取较高端会错误算出 4。' },
    { id: '11-error-best', description: '只保存最后一次 area，或每轮用 area 覆盖 best。', counterexampleInputId: '11-right-shorter', explanation: '[7,1,2,5] 初始面积就是最优的 15，后面面积依次为 4、1。必须用 Math.max 保留历史最大值。' },
    { id: '11-error-interior', description: '将中间高度也当成水位限制，或者逐格累加接雨水量。', counterexampleInputId: '11-tall-ends', explanation: '[5,0,0,0,5] 选择下标 0、4，宽度 4、高度 5，面积 20；本题不是按内部柱子累计的接雨水题。' },
  ],
  testSuite: { version: PROBLEM_META['11'].testSuiteVersion, cases, wrongFixtures: [
    { id: '11-wrong-taller-side', source: WRONG_TALLER_SIDE_SOURCE, targetedCaseIds: ['11-inner-best', '11-increasing', '11-decreasing'] },
    { id: '11-wrong-inclusive-width', source: WRONG_INCLUSIVE_WIDTH_SOURCE, targetedCaseIds: ['11-two', '11-equal', '11-height-limit'] },
    { id: '11-wrong-taller-height', source: WRONG_TALLER_HEIGHT_SOURCE, targetedCaseIds: ['11-two', '11-one-zero', '11-tall-center'] },
  ] },
  visualization: { modelId: '11-shorter-side-pointers', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson11;
