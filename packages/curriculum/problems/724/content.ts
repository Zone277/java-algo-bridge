import { PROBLEM_META, type Lesson, type PivotIndexInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson724 = Extract<Lesson, { id: '724' }>;

export const demoInputs: { id: string; title: string; input: PivotIndexInput }[] = [
  { id: 'middle-balance', title: '左右各为 6：3,1,2,6,2,4', input: { nums: [3, 1, 2, 6, 2, 4] } },
  { id: 'left-empty', title: '左侧为空也能平衡：9,2,-2', input: { nums: [9, 2, -2] } },
  { id: 'no-balance', title: '没有中心下标：1,2,3', input: { nums: [1, 2, 3] } },
  { id: 'single', title: '单元素，两侧都为空：7', input: { nums: [7] } },
];

const cases: Lesson724['testSuite']['cases'] = [
  { id: '724-middle', input: { nums: [3, 1, 2, 6, 2, 4] }, expected: { kind: 'int', value: 3 }, coverage: '默认原创手算：下标 3 左和为 6、右和为 6；中心元素本身不计入两侧。' },
  { id: '724-single-positive', input: { nums: [7] }, expected: { kind: 'int', value: 0 }, coverage: '最短输入、非零中心；两侧为空且和都为 0，返回下标 0。' },
  { id: '724-single-negative', input: { nums: [-5] }, expected: { kind: 'int', value: 0 }, coverage: '单个负数同样有中心，中心自身不影响空侧相等。' },
  { id: '724-left-edge', input: { nums: [9, 2, -2] }, expected: { kind: 'int', value: 0 }, coverage: '左端可为中心，非空右侧通过正负抵消为 0，必须允许负数。' },
  { id: '724-right-edge', input: { nums: [2, -2, 9] }, expected: { kind: 'int', value: 2 }, coverage: '右端空侧为 0，左侧正负抵消；检查最后一个候选。' },
  { id: '724-two-right', input: { nums: [0, 7] }, expected: { kind: 'int', value: 1 }, coverage: '长度为 2 且中心在右端，不能假设中心必须有两边元素。' },
  { id: '724-two-left', input: { nums: [7, 0] }, expected: { kind: 'int', value: 0 }, coverage: '长度为 2 且第一项就是答案，必须先比较再累加中心元素。' },
  { id: '724-absent', input: { nums: [1, 2, 3] }, expected: { kind: 'int', value: -1 }, coverage: '无解时正常返回 -1；错误地把中心加入左和会把下标 1 当作答案。' },
  { id: '724-all-zero', input: { nums: [0, 0, 0] }, expected: { kind: 'int', value: 0 }, coverage: '每个位置都平衡，必须返回最左的 0，而不是中间或最后位置。' },
  { id: '724-negative', input: { nums: [-2, -1, -3, -1, -2] }, expected: { kind: 'int', value: 2 }, coverage: '全负数左右和均为 -3；累计和无需单调递增，不能据大小提前排除。' },
  { id: '724-many-pivots', input: { nums: [-1, 0, 0, 0, -1] }, expected: { kind: 'int', value: 1 }, coverage: '下标 1、2、3 都平衡，返回最左 1，检测覆盖已有答案后返回最后位置。' },
  { id: '724-cancellation', input: { nums: [1, -1, 5, 2, -2] }, expected: { kind: 'int', value: 2 }, coverage: '两侧各自抵消到 0，中心可以是任意值；不存在正数单调性。' },
  { id: '724-zero-not-pivot', input: { nums: [1, 0, 2] }, expected: { kind: 'int', value: -1 }, coverage: '元素为 0 不代表它是中心；比较的是两侧和，不是中心值。' },
  { id: '724-value-boundary', input: { nums: [1000, -1000, 7, -1000, 1000] }, expected: { kind: 'int', value: 2 }, coverage: '正负元素取值达到边界，左右抵消；返回 2 而不是中心值 7。' },
  { id: '724-maximum-total', input: { nums: Array.from({ length: 10000 }, () => 1000) }, expected: { kind: 'int', value: -1 }, coverage: '10000 项及最大总和 10000000；偶数个相同非零值没有中心，Java int 足够。' },
  { id: '724-maximum-last', input: { nums: [...Array.from({ length: 9999 }, () => 0), 1000] }, expected: { kind: 'int', value: 9999 }, coverage: '10000 项且直到最后才平衡，检查全部候选；真实判题不受 30 项演示限制。' },
];

export const WRONG_INCLUDE_CENTER_SOURCE = `class Solution {
    public int pivotIndex(int[] nums) {
        int total = 0;
        for (int value : nums) total += value;
        int left = 0;
        for (int i = 0; i < nums.length; i++) {
            left += nums[i];
            int right = total - left;
            if (left == right) return i;
        }
        return -1;
    }
}
`;

export const WRONG_LAST_PIVOT_SOURCE = `class Solution {
    public int pivotIndex(int[] nums) {
        int total = 0;
        for (int value : nums) total += value;
        int left = 0;
        int answer = -1;
        for (int i = 0; i < nums.length; i++) {
            int right = total - left - nums[i];
            if (left == right) answer = i;
            left += nums[i];
        }
        return answer;
    }
}
`;

const guidedSum = `class Solution {
    public int pivotIndex(int[] nums) {
        int total = 0;
        for (int j = 0; j < nums.length; j++) {
            // TODO：把 nums[j] 计入总和。
        }
        int left = 0;
        for (int i = 0; i < nums.length; i++) {
            int right = total - left - nums[i];
            if (left == right) return i;
            left += nums[i];
        }
        return -1;
    }
}
`;

const guidedSides = `class Solution {
    public int pivotIndex(int[] nums) {
        int total = 0;
        for (int j = 0; j < nums.length; j++) {
            total += nums[j];
        }
        int left = 0;
        for (int i = 0; i < nums.length; i++) {
            int right = /* TODO：只计算严格右侧的和 */;
            if (left == right) return i;
            // TODO：比较失败后，为下一个候选更新 left。
        }
        return -1;
    }
}
`;

export const lesson724 = {
  schemaVersion: 1, id: '724', slug: 'find-pivot-index', title: '寻找数组中心下标', order: 29,
  lessonVersion: PROBLEM_META['724'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分中心下标与几何中点，正确处理中心排除、空侧和与最左答案。',
    '从两侧重复求和推导 total、left 与 right 的关系，并验证扫描不变量。',
    '按 Java 语句顺序管理累计和与局部作用域，独立编写方法并真实运行本站用例。',
  ],
  source: { platform: 'LeetCode', number: 724, url: 'https://leetcode.com/problems/find-pivot-index/' },
  taskSemantics: '给定整数数组 nums，把下标 i 作为候选：严格位于它左边的元素和，与严格位于它右边的元素和相同，i 就是中心下标。nums[i] 不计入任一侧；某侧没有元素时，其和为 0。返回最左的合法下标，若不存在则返回 -1。中心不一定在数组中间，数组可以有负数、零和重复值。题意参考 LeetCode 724，本站题面、例子、推导与代码为原创表达，无官方关联。',
  siteLimits: { description: '本站真实判题接受 1—10000 个整数，各项为 -1000—1000；空数组不属于本题。总和与两侧和的绝对值最多 10000000，Java int 足够。参考演示最多 30 项，超过会明确拒绝生成演示；31—10000 项仍可真实执行。', inputSchemaId: 'PivotIndexInputSchema' },
  steps: [
    { id: '724-syntax-values', kind: 'syntax', title: 'Java 必要语法 · 引用参数与整数局部变量', body: 'public int pivotIndex(int[] nums) 返回整数下标。nums 保存数组引用值；Java 方法按值传递该引用值，不会自动复制数组对象。nums[i]、total、left、right、i 都是 int 基本值，不是对象引用。total += nums[j] 相当于更新 total 的整数值，不修改数组。局部变量要明确赋值后才能读取，不能因 int[] 新建时元素默认 0 就断言局部 int 自动为 0。本站调用器负责 main 与传参，输出文本不能代替 return。', relatedIds: ['J1', 'J2', 'J3'] },
    { id: '724-syntax-loops', kind: 'syntax', title: 'Java 必要语法 · 循环、比较与作用域', body: '数组长度写 nums.length，合法下标为 0…length-1。for (int i=0; i<nums.length; i++) 先初始化、判断，再执行循环体，最后 i++。== 比较整数，= 是赋值。return i 立即退出整个方法，因此从左到右第一次相等就是最左答案。j 只在第一个 for 中有效；right 在第二个循环体内声明，每轮重新计算。到下一轮条件判断时，上一轮 right 已不在作用域内。', relatedIds: ['J2', 'J8'] },
    { id: '724-understand', kind: 'understanding', title: '读题 · 中心由和决定，不由位置决定', body: '输入 {"nums":[3,1,2,6,2,4]}，选择下标 3 时左和为 3+1+2=6，右和为 2+4=6，所以输出 3，而不是中心元素 6。对 [9,2,-2]，下标 0 左侧为空、右和为 0，因此输出 0。对单项 [7]，两侧都是空，输出 0。负数可抵消正数；不要求两边长度相同，也不要求中心值为 0。', relatedIds: ['724-middle', '724-left-edge', '724-single-positive'] },
    { id: '724-manual', kind: 'understanding', title: '手算 · 每个候选都排除自己', body: '对 [3,1,2,6,2,4] 先累加得到 total=18。i=0 时 left=0，right=18-0-3=15，不等后 left=3；i=1 时 right=18-3-1=14，不等后 left=4；i=2 时 right=18-4-2=12，不等后 left=6；i=3 时 right=18-6-6=6，相等，返回 3。不要在比较前把 nums[i] 加入 left；也不要把 18-left 当作 right，因为那还含中心元素。', relatedIds: ['middle-balance', '724-middle', '724-predict-right'] },
    { id: '724-derive', kind: 'derivation', title: '推导 · 总和能拆成三个互不重叠部分', body: '最直接的办法是枚举每个候选，再用两个循环各算左右和，O(n²) 时间、O(1) 额外空间，适合作为手算校验。相邻候选的左侧只差一个元素，可用 left 累加。预先求出 total 后，每个候选都满足 total=left+nums[i]+right，因此 right=total-left-nums[i]。相减可以避免重复扫描右侧，不需要额外前后缀数组。负数不会破坏这个等式，但会破坏累计和的单调性，不能因某轮 left>right 就停止查找。', relatedIds: ['724-negative', '724-cancellation'] },
    { id: '724-invariant', kind: 'derivation', title: '不变量 · 比较之前，left 只含严格左侧', body: '第一个循环在检查 j 时，total 是 [0,j) 的和；处理完 j 后才包含 nums[j]。第二个循环检查候选 i 前，total 已固定为全数组和，left 恰为 [0,i) 的和，且更小下标都已失败。先计算 right 并比较；若成功立即返回，保证最左；失败才执行 left+=nums[i]，为 i+1 建立不变量。最后没有匹配返回 -1。两趟线性扫描共 O(n) 时间，固定数量的 int 变量为 O(1) 额外空间；复杂度来自循环次数，不由少量运行时间证明。', relatedIds: ['724-many-pivots', '724-absent'] },
    { id: '724-predict', kind: 'prediction', title: '先预测，再揭示右侧和与返回值', body: '先预测当前输入第一个候选的严格右侧和，再预测方法最终返回值。预测答案由当前轨迹生成；单元素和第一项即命中时仍有两次不同检查。预测是教学检查，不代表学生 Java 已被编译运行。', relatedIds: ['724-predict-right', '724-predict-result'] },
    { id: '724-reference', kind: 'reference-demo', title: '参考解法状态演示 · 一份快照驱动所有视图', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、数组下标、源码高亮和说明读取同一不可变快照。先显示求总和的 j，再显示候选 i；说明里的 [a,b) 是含 a 不含 b 的教学区间。left 更新后 right 仍是本轮旧值，不会自动变化；下轮清除并重新计算。上一步恢复原快照，切换输入重新生成轨迹。参考答案默认折叠；学生修改源码不会改变参考状态，真实执行通过独立 Docker javac/java 通道。', relatedIds: demoInputs.map(demo => demo.id) },
    { id: '724-guided-intro', kind: 'guided-code', title: '引导编写 · 累加、排除中心、完整实现', body: '第一阶段补总和累加，第二阶段补右侧公式和比较之后的 left 更新，第三阶段从方法骨架完成全部算法。各阶段都提供完整 Java 文件供编辑，最后提交完整源码到真实 runner。静态练习确认只记录教学过程，不能以填入某个字符串代替通过本站测试。', relatedIds: ['724-guided'] },
    { id: '724-independent', kind: 'independent-code', title: '独立编码 · 用边界反例定位失败', body: '从空方法骨架出发，先检查单项、中心在左端或右端、全零、多解、负数和无解。编译错误检查 ==、分号和局部作用域；运行异常检查 i 是否越过 length-1；错误答案检查是否排除了中心、是否在比较前更新 left、是否返回最左；超时检查循环递增与是否重复求和。Docker 不可用返回 RUNNER_UNAVAILABLE，参考演示仍明确是非执行模式。修正后重新运行，新源码不能继承旧源码的成功结果。', relatedIds: ['J8', '724-single-positive', '724-right-edge', '724-all-zero'] },
    { id: '724-summary', kind: 'summary', title: '复盘 · 三部分分解与更新时机', body: '请解释总和如何拆成左侧、中心与右侧，为什么比较后才累加，为什么第一个相等就是最左答案。独立通过本站测试不等于通过 LeetCode 官方评测。预测、使用提示、查看答案、引导通过和独立通过分别记录；刷新可恢复两种模式各自草稿与进度，浏览页面或播放动画不等于掌握。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '7f7f9980fc5693d81d01da3c270f0389915a8193f193e7ccf350e3ad6b5b0944', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '724-hint-1', level: 1, body: '中心两边不含中心元素；空侧和是 0。先用单项与最左端平衡的数组检查你对题意的理解。' },
    { id: '724-hint-2', level: 2, body: '先算 total，再从左到右维护 left=sum(nums[0…i-1])。整个数组可拆为 left、nums[i]、right 三部分；当前元素什么时候才能计入 left？' },
    { id: '724-hint-3', level: 3, body: 'total=全数组和，left=0；从 i=0 到 n-1：right=total-left-nums[i]；若 left==right 返回 i；否则 left+=nums[i]。全部候选失败返回 -1。' },
  ],
  predictionChecks: [
    { id: '724-predict-right', checkpointId: 'first-right', prompt: '默认输入总和 18，i=0、left=0，第一个 right 为多少？', answer: { kind: 'int', value: 15 }, explanation: '右侧不含 nums[0]=3，所以 right=18-0-3=15。' },
    { id: '724-predict-result', checkpointId: 'final-result', prompt: '默认输入 [3,1,2,6,2,4] 最终返回什么？', answer: { kind: 'int', value: 3 }, explanation: '下标 3 左右两侧和均为 6，且前面所有下标都不平衡，所以返回最左下标 3。' },
  ],
  guided: { id: '724-guided', finalCheck: 'real-java-submit', stages: [
    { id: '724-guided-sum', instruction: '支架 1 / 3：补齐 total 累加，并解释本轮 j 尚未被计入与已计入的区别。', scaffoldSource: guidedSum, checkKind: 'static-practice' },
    { id: '724-guided-sides', instruction: '支架 2 / 3：补右侧和公式与 left 更新，检查 [7] 和 [1,2,3] 的结果。', scaffoldSource: guidedSides, checkKind: 'static-practice' },
    { id: '724-guided-whole', instruction: '支架 3 / 3：从骨架写完整算法，提交完整 Java 到真实 runner 验证。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '724-error-include-center', description: '比较前先把当前元素加进 left，把中心算入左侧。', counterexampleInputId: '724-absent', explanation: '[1,2,3] 不存在中心；错误程序在下标 1 把左和算成 1+2=3，与右侧 3 相等而返回 1。正确左和只有 1。' },
    { id: '724-error-forget-center', description: '写 right=total-left，忘记从右侧扣掉中心。', counterexampleInputId: '724-single-positive', explanation: '[7] 两侧都空，应返回 0；错误右和为 7，会误报 -1。' },
    { id: '724-error-last', description: '相等后只保存下标并继续覆盖，最后返回最右答案。', counterexampleInputId: '724-many-pivots', explanation: '[-1,0,0,0,-1] 的下标 1、2、3 都平衡；覆盖答案会返回 3，正确最左答案为 1。' },
    { id: '724-error-edge', description: '只枚举下标 1 到 n-2，误以为中心必须有非空两侧。', counterexampleInputId: '724-right-edge', explanation: '[2,-2,9] 的答案在右端下标 2：左和 0、空右和 0。端点也必须检查。' },
    { id: '724-error-value', description: '找到后返回 nums[i]，把元素值当作下标。', counterexampleInputId: '724-value-boundary', explanation: '[1000,-1000,7,-1000,1000] 在下标 2 平衡，返回 7 不符合方法的输出含义。' },
  ],
  testSuite: { version: PROBLEM_META['724'].testSuiteVersion, cases, wrongFixtures: [
    { id: '724-wrong-include-center', source: WRONG_INCLUDE_CENTER_SOURCE, targetedCaseIds: ['724-single-positive', '724-absent', '724-middle'] },
    { id: '724-wrong-last-pivot', source: WRONG_LAST_PIVOT_SOURCE, targetedCaseIds: ['724-all-zero', '724-many-pivots'] },
  ] },
  visualization: { modelId: '724-total-and-left-sum', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson724;
