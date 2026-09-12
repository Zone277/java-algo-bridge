import { PROBLEM_META, type Lesson, type TwoSumInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TwoSumLesson = Extract<Lesson, { id: '1' }>;

export const demoInputs: { id: string; title: string; input: TwoSumInput }[] = [
  { id: 'basic-pair', title: '补数命中：2 与 7', input: { nums: [2, 7, 11, 15], target: 9 } },
  { id: 'duplicate-pair', title: '重复值、不同数组位置', input: { nums: [3, 3], target: 6 } },
  { id: 'late-pair', title: '较晚命中：4 与 10', input: { nums: [1, 2, 3, 4, 10], target: 14 } },
];

const cases: TwoSumLesson['testSuite']['cases'] = [
  { id: 'basic-pair', input: demoInputs[0]!.input, expected: { kind: 'int-array', values: [0, 1] }, coverage: '基本命中；参考顺序为旧下标在前，但真实判定接受 [1,0]。' },
  { id: 'negative-values', input: { nums: [-3, 4, 3, 90], target: 0 }, expected: { kind: 'int-array', values: [0, 2] }, coverage: '负数补数与中间位置命中。' },
  { id: 'duplicate-pair', input: demoInputs[1]!.input, expected: { kind: 'int-array', values: [0, 1] }, coverage: '值相同但下标不同；抓住先 put 后查导致 [0,0] 的错误。' },
  { id: 'zero-pair', input: { nums: [0, 4, 0], target: 0 }, expected: { kind: 'int-array', values: [0, 2] }, coverage: '两个零构成答案，不能把一个下标复用两次。' },
  { id: 'mixed-order', input: { nums: [10, -2, 4, 8], target: 6 }, expected: { kind: 'int-array', values: [1, 3] }, coverage: '数组无序，补数在较早位置；不能套用有序双指针。' },
  { id: 'value-bounds', input: { nums: [-1000000000, 0, 1000000000], target: 0 }, expected: { kind: 'int-array', values: [0, 2] }, coverage: '本站元素值域两端，和值仍在 Java int 范围。' },
  { id: 'late-pair', input: demoInputs[2]!.input, expected: { kind: 'int-array', values: [3, 4] }, coverage: '答案靠近数组末尾，Map 已积累多个不匹配元素。' },
  { id: 'negative-target', input: { nums: [-8, -3, 5, 9], target: -11 }, expected: { kind: 'int-array', values: [0, 1] }, coverage: '负 target 与首对元素命中。' },
  { id: 'interior-pair', input: { nums: [14, 2, 8, -5, 20], target: 3 }, expected: { kind: 'int-array', values: [2, 3] }, coverage: '答案位于中部，前面存在干扰项。' },
  { id: 'two-elements', input: { nums: [5, -1], target: 4 }, expected: { kind: 'int-array', values: [0, 1] }, coverage: '最小合法长度，第二次循环必须命中第一次记录。' },
];

export const PUT_BEFORE_LOOKUP_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            seen.put(nums[i], i);
            if (seen.containsKey(complement)) return new int[]{seen.get(complement), i};
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
`;

export const RETURN_VALUES_SOURCE = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) return new int[]{complement, nums[i]};
            seen.put(nums[i], i);
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
`;

export const lesson1 = {
  schemaVersion: 1, id: '1', slug: 'two-sum', title: '两数之和', order: 4,
  lessonVersion: PROBLEM_META['1'].lessonVersion, prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: ['读写返回 int[] 的 Java 方法。', '用补数 Map 把双循环推导为一次扫描。', '解释先查后存为何保证两个下标不同，并用真实用例修正错误。'],
  source: { platform: 'LeetCode', number: 1, url: 'https://leetcode.com/problems/two-sum/' },
  taskSemantics: '给定一个无序整数数组 nums 和 target，返回两个不同下标，使对应元素之和等于 target。本站有效输入恰有一个无序下标对；返回 [i,j] 或 [j,i] 都正确。题意参考 LeetCode 1，文字、例子、图形与代码均为本站原创，与原平台无官方关联。',
  siteLimits: { description: '本站教学输入上限：数组长度 2—10000，元素和 target 为 -10^9—10^9，并保证恰有一个由不同下标组成的无序解。演示最多 30 项；无解或多解输入在 API 前被拒绝，不判为学生错误。', inputSchemaId: 'TwoSumInput' },
  steps: [
    { id: 'syntax-array-return', kind: 'syntax', title: 'J1 / J2 · int[]、length 与返回数组', body: '方法签名是 public int[] twoSum(int[] nums, int target)。参数 nums 保存数组引用值，target 是 int 基本值；Java 仍按值传递这两个值。nums.length 是数组项数，没有括号，合法下标是 0 到 length-1。返回类型 int[] 表示要交回一个整数数组，而不是打印两个数字。命中后可写 return new int[]{oldIndex, i};：new int[]{...} 创建结果数组，return 交回它的引用值并结束方法。题目要的是下标，不是 nums[oldIndex] 和 nums[i] 的元素值。可信调用器读取真实 int[] 返回值；打印 PASS 不参与判定。', relatedIds: [] },
    { id: 'syntax-map', kind: 'syntax', title: 'J5 · HashMap<Integer,Integer> 的最小用法', body: 'Map<Integer,Integer> seen = new HashMap<>(); 创建从“已见元素值”到“下标”的表。Map 是接口类型，HashMap 是本题使用的实现。泛型不能写基本类型 int，所以写 Integer；把 int 交给 put、containsKey 或 get 时，Java 会在本题需要的位置自动装箱或拆箱。seen.put(value,index) 写入或更新映射；seen.containsKey(key) 判断键是否存在；seen.get(key) 取得保存的下标。HashMap 的迭代顺序不作为算法依据，参考演示只为讲解固定显示插入顺序。', relatedIds: ['J5'] },
    { id: 'understanding-pair', kind: 'understanding', title: '读题与手算 · 值相加，交回位置', body: '输入 nums=[2,7,11,15]、target=9。答案元素是 2 和 7，但必须返回它们的位置 [0,1]；[1,0] 同样合法。两个位置必须不同。输入 [3,3]、target=6 时答案是 [0,1]，不能返回 [0,0]：两个位置上的值虽然相同，仍是两项。\n手工扫描：i=0 时当前值2，需要补数7；此前没有元素，记录2→0。i=1 时当前值7，需要补数2；Map 中已有2→0，返回 [0,1]。不要先把7放入 Map 再查，因为“当前项”不属于此前处理的部分。', relatedIds: [] },
    { id: 'derivation-complement', kind: 'derivation', title: '推导 · 从双循环到补数 Map', body: '直接办法是枚举 i，再枚举 i 后面的 j，检查 nums[i]+nums[j]。它清楚但最坏比较约 n²/2 次，时间 O(n²)，额外空间 O(1)。\n一次扫描时，把问题改写为：来到 i，所需补数 complement=target-nums[i] 是否在此前出现过？循环开始处理 i 时维持不变量：seen 只记录下标 0..i-1 中已处理元素的“值→某个旧下标”；当前下标 i 尚未写入。若补数命中，get 得到的旧下标必小于 i，因此两个下标不同；若未命中，才执行 seen.put(nums[i],i)，为未来元素服务。\n每项至多做固定次数 Map 操作，按 HashMap 的通常平均情形说明为 O(n) 时间；最坏实现细节不能仅由本站毫秒数证明。Map 最多保存 O(n) 项，额外空间 O(n)。题目不保证数组有序，排序后再用双指针会丢失原下标，除非额外保存身份；这不是本课选用的状态。', relatedIds: [] },
    { id: 'prediction-map', kind: 'prediction', title: '先预测 complement，再预测旧下标', body: '默认输入从空 Map 开始。先预测 i=0、nums[0]=2 时 complement；继续到 i=1 时，观察 Map 中的 2→0，再预测命中后返回数组的第一个下标。答案按所选输入动态生成，提交后才揭示对应快照。预测属于参考模型教学检查，不会记录 Java 代码通过。', relatedIds: ['predict-complement', 'predict-hit-index'] },
    { id: 'reference-map-demo', kind: 'reference-demo', title: '参考算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。数组下标、变量表和 Map 表都读取同一个不可变快照。每个快照表示高亮语句执行后的状态；在 check-complement 快照中，Map 不含当前 i。切换输入会重新生成轨迹，返回或前进只选择已有快照，不反推或执行学生源码。参考答案默认折叠；展开会记录已查看答案。', relatedIds: [] },
    { id: 'guided-map-code', kind: 'guided-code', title: '引导编写 · 逐步撤去 Map 支架', body: '第一步补 complement 表达式，第二步补先查后存与返回数组，第三步从方法骨架完成整个算法。静态自检只帮助你整理代码；最终必须把完整 Solution 提交到真实 Java runner。runner 按两个不同合法下标的谓词判定，不要求返回顺序与参考答案相同，也不比较源码字符串。', relatedIds: ['guided-1'] },
    { id: 'independent-two-sum', kind: 'independent-code', title: '独立挑战 · 从方法骨架开始', body: '独立模式只给 import、Solution 和 twoSum 方法骨架，不预填完整循环。先用一个输入真实运行，再提交全部本站用例。若 [3,3] 返回 [0,0]，检查 put 与 containsKey 的顺序；若返回 [2,7]，重新分清元素值和下标。当前源码真实 submit 全通过才记录独立模式通过，提示和答案查看记录仍如实保留。', relatedIds: [] },
    { id: 'summary-two-sum', kind: 'summary', title: '复盘 · Map 保存什么', body: '请用自己的话回答：Map 的键和值分别是什么？处理 i 之前 Map 允许有哪些下标？为什么先查后存保证不同下标？为什么 [1,0] 与 [0,1] 都能通过？\n本站分别保存预测、提示、答案查看、引导通过和独立模式通过；播放演示或完成静态练习不等于通过。本站测试不是 LeetCode 官方评测，也不能单凭几次运行证明复杂度。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '682511b312a9da962f1d3a2e3e267483ff95515460f8335d7e34680dbd2d651c', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-complement', level: 1, body: '来到 nums[i] 时，不必寻找所有搭档；先算 target-nums[i]，问题就变成“这个补数以前出现过吗？”' },
    { id: 'hint-map-invariant', level: 2, body: '让 Map 保存“已处理元素值→旧下标”。检查 complement 时当前 i 还不能放进去；命中得到的下标自然小于 i。' },
    { id: 'hint-map-pseudocode', level: 3, body: '建空 Map；从左到右取 i；算 complement；若 Map 含 complement，返回 [Map.get(complement),i]；否则 put(nums[i],i)。' },
  ],
  predictionChecks: [
    { id: 'predict-complement', prompt: '默认输入 nums=[2,7,11,15]、target=9。i=0 时 complement 是多少？', answer: { kind: 'int', value: 7 }, explanation: 'complement=target-nums[0]=9-2=7。此时 Map 仍为空。', checkpointId: 'first-complement' },
    { id: 'predict-hit-index', prompt: '继续到 i=1，Map 为 {2→0}，当前值7、补数2。返回数组的第一个下标是多少？', answer: { kind: 'int', value: 0 }, explanation: 'seen.get(2)=0，旧下标0小于当前下标1，因此返回 [0,1]。', checkpointId: 'first-hit-index' },
  ],
  guided: { id: 'guided-1', finalCheck: 'real-java-submit', stages: [
    { id: 'guided-complement-expression', instruction: '支架 1 / 3：把 complement 的占位值改成 target 与当前元素的差。完成后用默认输入真实运行，观察错误是否消失。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('int complement = target - nums[i];', 'int complement = 0; // TODO：计算当前元素需要的补数') },
    { id: 'guided-lookup-store', instruction: '支架 2 / 3：Map 与循环已给出。补上查补数、返回两个下标和未命中后的 put；务必保持先查后存。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            // TODO：先查 complement；命中返回旧下标和 i，未命中再记录 nums[i]。
            throw new UnsupportedOperationException("请补先查后存");
        }
        throw new IllegalStateException("valid input has one pair");
    }
}
` },
    { id: 'guided-whole-map', instruction: '支架 3 / 3：从方法骨架写完整算法。自行创建 Map、维护循环不变量并返回 int[]；完整源码真实提交通过后才记录引导通过。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'put-before-lookup', description: '先 put 当前元素再查 complement，可能把同一位置用两次。', counterexampleInputId: 'duplicate-pair', explanation: 'nums=[3,3]、target=6 时，i=0 若先写3→0，随后查补数3会错误返回 [0,0]。正确顺序先查空 Map，再在第二次循环用旧下标0与当前下标1。' },
    { id: 'return-element-values', description: '返回组成 target 的元素值，而不是它们的下标。', counterexampleInputId: 'basic-pair', explanation: '输入 [2,7,11,15] 应返回 [0,1] 或 [1,0]；返回 [2,7] 类型仍是 int[]，但内容不是合法下标，真实判定会拒绝。' },
    { id: 'assume-sorted', description: '直接把无序数组当成升序数组移动双指针。', counterexampleInputId: 'mixed-order', explanation: '[10,-2,4,8] 没有按值排序。直接比较首尾无法安全排除；原地排序还会丢失原下标。补数 Map 保留输入位置。' },
    { id: 'fixed-return-order', description: '把参考的 [旧下标,当前下标] 当成唯一合法顺序。', counterexampleInputId: 'negative-values', explanation: '本站判定检查两个下标不同、合法且元素和为 target；[0,2] 与 [2,0] 都正确，不做固定数组相等判断。' },
  ],
  testSuite: { version: PROBLEM_META['1'].testSuiteVersion, cases, wrongFixtures: [
    { id: 'wrong-put-before-lookup', source: PUT_BEFORE_LOOKUP_SOURCE, targetedCaseIds: ['duplicate-pair', 'zero-pair'] },
    { id: 'wrong-return-values', source: RETURN_VALUES_SOURCE, targetedCaseIds: ['basic-pair', 'negative-values', 'mixed-order'] },
  ] },
  visualization: { modelId: '1-complement-map', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
