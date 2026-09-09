import { LESSON_VERSION, STARTER_SOURCE, TEST_SUITE_VERSION, type BinarySearchInput, type Lesson } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

export const demoInputs: { id: string; title: string; input: BinarySearchInput }[] = [
  { id: 'found', title: '命中：寻找 7', input: { nums: [-8, -2, 3, 7, 12], target: 7 } },
  { id: 'missing', title: '未命中：寻找 6', input: { nums: [-8, -2, 3, 7, 12], target: 6 } },
  { id: 'singleton-hit', title: '边界：只有一个元素', input: { nums: [4], target: 4 } },
];

const cases: Lesson['testSuite']['cases'] = [
  { id: 'found', input: demoInputs[0]!.input, expected: { kind: 'int', value: 3 }, coverage: '奇数长度，第一次排除左半边后命中；返回下标而非元素值。' },
  { id: 'missing', input: demoInputs[1]!.input, expected: { kind: 'int', value: -1 }, coverage: '目标位于相邻元素之间，区间交叉后退出。' },
  { id: 'singleton-hit', input: { nums: [4], target: 4 }, expected: { kind: 'int', value: 0 }, coverage: 'left == right 时仍需检查唯一候选。' },
  { id: 'singleton-miss', input: { nums: [4], target: 5 }, expected: { kind: 'int', value: -1 }, coverage: '单元素未命中，必须缩小区间并终止。' },
  { id: 'first', input: { nums: [-7, -1, 2, 5], target: -7 }, expected: { kind: 'int', value: 0 }, coverage: '偶数长度与最左边界命中。' },
  { id: 'last', input: { nums: [-7, -1, 2, 5], target: 5 }, expected: { kind: 'int', value: 3 }, coverage: '最右边界命中。' },
  { id: 'below', input: { nums: [-7, -1, 2, 5], target: -8 }, expected: { kind: 'int', value: -1 }, coverage: '目标小于所有元素，right 可到 -1。' },
  { id: 'above', input: { nums: [-7, -1, 2, 5], target: 6 }, expected: { kind: 'int', value: -1 }, coverage: '目标大于所有元素，left 可到 length。' },
  { id: 'two-left', input: { nums: [0, 9], target: 0 }, expected: { kind: 'int', value: 0 }, coverage: '两元素时向下取整的中点命中。' },
  { id: 'two-right', input: { nums: [0, 9], target: 9 }, expected: { kind: 'int', value: 1 }, coverage: '两元素时移动 left 必须越过 mid。' },
  { id: 'zero-middle', input: { nums: [-9, -3, 0, 2, 8], target: 0 }, expected: { kind: 'int', value: 2 }, coverage: '首轮中点命中，含零和负数。' },
  { id: 'value-bounds', input: { nums: [-9999, 0, 9999], target: 9999 }, expected: { kind: 'int', value: 2 }, coverage: '本站值域两端合法输入。' },
  { id: 'max-length', input: { nums: Array.from({ length: 10000 }, (_, i) => i - 5000), target: 3777 }, expected: { kind: 'int', value: 8777 }, coverage: '本站数组长度上限 10000 的真实执行回归；不据此宣称证明复杂度。' },
];

export const lesson704 = {
  schemaVersion: 1, id: '704', slug: 'binary-search', title: '二分查找', order: 1,
  lessonVersion: LESSON_VERSION, prerequisites: ['J1', 'J2', 'J8'],
  objectives: ['把输入输出写成 Java 方法签名。', '用闭区间不变量解释每一次排除。', '根据失败用例修正边界并提交完整 Java。'],
  source: { platform: 'LeetCode', number: 704, url: 'https://leetcode.com/problems/binary-search/' },
  taskSemantics: '在严格升序且没有重复元素的整数数组中寻找 target；存在则返回从 0 开始的下标，否则返回 -1。题意参考 LeetCode 704；本站讲解、示例与代码为原创，与原平台无官方关联。',
  siteLimits: { description: '本站教学输入上限：数组长度 1—10000，严格升序且不重复，元素与 target 为 -9999—9999。演示最多 30 项；正式测试不包含空数组。超出本站限制属于输入限制，不代表算法错误。', inputSchemaId: 'BinarySearchInput' },
  steps: [
    { id: 'syntax-method', kind: 'syntax', title: 'J1 · 从 C 函数到 Java 方法', body: '你可能写过 C 函数 int search(int nums[], int n, int target)。Java 把本题方法放在 class Solution 中：\npublic int search(int[] nums, int target)\npublic 表示方法可被调用；int 表示返回一个整数；search 是方法名；括号内是参数。调用器把数组和目标交给你，返回值是下标，不是打印的文字。\n本站在容器内用可信调用器完成类似 new Solution().search(new int[]{-8, -2, 3, 7, 12}, 7) 的调用，再读取返回值，因此你不必写 main。System.out.println("PASS") 只是输出，不能表示答案正确。\n想一想：返回 3 时，表示第三个数，还是下标为 3 的第四个数？答案是第四个数，下标从 0 开始。此处是静态知识自检，并未执行 Java。', relatedIds: [] },
    { id: 'syntax-array', kind: 'syntax', title: 'J2 · int[]、length 与下标', body: 'int 是基本类型，int target 保存整数值。int[] 是引用类型；nums 保存指向数组对象的引用值，数组里的各项是 int 值。不是所有 Java 变量都保存对象引用。Java 方法按值传参；这里无需改变数组。\n与 C 常常另传长度不同，Java 数组有 length 字段：int n = nums.length; 注意没有括号。合法下标为 0 到 n - 1，nums[mid] 取得元素。长度为 5 时 nums[5] 越界；最后一项是 nums[4]。\n小练习：new int[]{2, 6, 10}.length 是多少？先自己算，再核对：3；最后一项下标是 2。这是静态知识自检。', relatedIds: [] },
    { id: 'syntax-loop', kind: 'syntax', title: 'J2 / J8 · while、比较与返回', body: 'C 和 Java 都用 while (条件) { 循环体 }。Java 条件必须是 boolean；left <= right 得到真假值，不能像某些 C 写法用 while (1)，若需要永真应写 true。== 比较值，= 是赋值。局部变量必须先初始化再读取。\nreturn mid; 立即结束整个方法并交回整数；它不是只跳出 while。return -1; 放在循环之后，表示所有候选都已排除。编译器要求返回 int 的方法不能正常走到末尾而没有返回值。\n若编译错误，先读 javac 行号与信息；若运行异常，查看越界位置；若错误答案，手算反例；若超时，检查每次循环是否严格减少候选。运行结果来自容器内 javac/java，静态练习不会给出通过本站测试。', relatedIds: [] },
    { id: 'understanding', kind: 'understanding', title: '读题 · 找的是位置', body: '设有一排按数值从小到大摆放的数字卡片 nums。给定 target，交回这张卡片的位置；没有这张卡片就交回 -1。数组保证不重复，因此命中的位置唯一。\n输入 nums = [-8, -2, 3, 7, 12]，target = 7。输出 3，因为 nums[3] == 7。若 target = 6，输出 -1，不能返回最接近的 3 或 7 的下标。\n先手算命中过程：候选 [0,4]，中点 2 的值为 3，小于 7，所以只保留 [3,4]；中点 3 的值为 7，返回 3。\n再手算未命中：找 6 时同样先到 [3,4]；中点 3 的值为 7，缩到 [3,2]。left > right，没有候选，返回 -1。区间边界是下标，不是数组元素值。', relatedIds: [] },
    { id: 'derivation', kind: 'derivation', title: '推导 · 为什么可以一次排除一半', body: '初始办法：从下标 0 到 n - 1 逐个比较；命中就返回下标，走完返回 -1。它容易写对，但最坏需检查 n 项，即 O(n) 时间。现在利用题目给出的严格升序。\n使用闭区间 [left,right]，两端都包含。循环边界的不变量是：如果 target 存在，它的下标一定还在 [left,right] 中；区间左侧都小于 target，区间右侧都大于 target。初始 left = 0，right = nums.length - 1，所有候选都在其中。\n当 left <= right 时还有候选。mid = left + (right - left) / 2；这里差值非负，Java 整数除法舍去小数，得到偏左中点。这样的写法避免一般大下标相加可能溢出；本站的小输入本身不会触发该溢出。\n若 nums[mid] == target，直接返回 mid。若 nums[mid] < target，则所有下标 ≤ mid 的值都太小，令 left = mid + 1。否则所有下标 ≥ mid 的值都太大，令 right = mid - 1。mid 已经比较过，必须排除它。每次未命中后候选数严格减少，不变量继续成立。\n更新边界的瞬间，旧 mid 可以在新区间之外；下轮重新计算 mid。不要错误要求所有快照中旧 mid 都处在新区间。循环结束时 left > right，不变量说明目标不存在。left == right 仍有一个候选，必须检查。\n每轮最多保留约一半候选，因此最坏 O(log n) 时间，只用固定几个整数变量，额外空间 O(1)。这是算法推导；少量运行毫秒数不能证明渐进复杂度。', relatedIds: [] },
    { id: 'prediction', kind: 'prediction', title: '先预测，再揭示', body: '使用默认输入，先预测第一次 mid 的下标，再预测比较后 left 的新值。提交自己的数字后才揭示快照，即使答错也会解释。切换输入后答案按新输入重新计算。预测是静态教学检查，不是 Java 编译执行；完成预测不会记录代码通过。', relatedIds: ['predict-mid', 'predict-boundary'] },
    { id: 'reference-demo', kind: 'reference-demo', title: '参考算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、区间图与代码高亮共同读取所选的不可变快照；快照表示标记步骤执行后的状态。上一步选择已有快照，未执行学生代码。你修改编辑器中的 Java，不会改变这份参考模型。展开参考源会记录“看过答案”；演示默认折叠完整源码。', relatedIds: [] },
    { id: 'guided-code', kind: 'guided-code', title: '引导编写 · 逐步撤去支架', body: '第一步只补循环条件，第二步自己补比较和边界更新，第三步只保留方法骨架与思考顺序。切换支架前保留或确认替换当前草稿。每一步都是写代码练习，最终必须把完整 Solution 类提交到真实 Java runner；本站不会以填入的文字和参考答案相同作为通过依据。', relatedIds: ['guided-704'] },
    { id: 'independent-code', kind: 'independent-code', title: '独立挑战', body: '从方法骨架重新写起，不自动复制引导答案。先运行一个输入检查思路，再提交本站测试。请解释一次失败用例，修正后重新提交；只有当前源码的真实完整提交通过，才记录独立模式通过本站测试。看过答案或提示的事实仍保留，不据此宣称独立掌握。', relatedIds: [] },
    { id: 'summary', kind: 'summary', title: '复盘 · 能解释比看过更重要', body: '离开前用自己的话回答：为什么 right 从 length - 1 开始？为什么 left == right 还要进入循环？为什么更新时要越过 mid？为什么返回 mid 而非 nums[mid]？\n本站分别保存预测、引导通过、独立模式通过、提示使用和答案查看记录；访问页面或播放动画不等于掌握。刷新会恢复本机草稿和进度。本站测试覆盖典型边界，不是 LeetCode 官方评测，也不能替代真实学习效果验证。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '30d065fee472a4ecbfd18b7db4023cc29ce9541d42ca0b3b4d4f780a725278c6', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-concept', level: 1, body: '有序数组中，一次比较能排除哪些位置？先把比 target 小的那一侧划掉；想清楚返回的是下标。' },
    { id: 'hint-invariant', level: 2, body: '维护包含两端的候选区间 [left,right]。只要 left <= right 就还有候选；每次未命中必须排除已经比较过的 mid，保留可能存在目标的那一侧。' },
    { id: 'hint-pseudocode', level: 3, body: '初始化左右端点；当区间非空：取偏左中点，相等则返回中点；中点值偏小则左端移到中点后一项，否则右端移到中点前一项；循环结束返回 -1。' },
  ],
  predictionChecks: [
    { id: 'predict-mid', prompt: '默认数组 [-8,-2,3,7,12]，left=0、right=4。第一次 mid 的下标是多少？', answer: { kind: 'int', value: 2 }, explanation: '0 + (4 - 0) / 2 = 2，这是下标；对应元素值为 3。', checkpointId: 'first-mid' },
    { id: 'predict-boundary', prompt: '仍找 target=7，第一次 mid=2，nums[2]=3。下一步 left 变成多少？', answer: { kind: 'int', value: 3 }, explanation: '3 < 7，下标 0 到 2 都不可能命中，因此 left = mid + 1 = 3。', checkpointId: 'first-boundary' },
  ],
  guided: { id: 'guided-704', finalCheck: 'real-java-submit', stages: [
    { id: 'guided-condition', instruction: '支架 1 / 3：只补 while 的闭区间条件。将 false 替换为你的条件；解释为什么单个候选仍要检查。可以真实运行检验，不要求与参考字符串相同。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('while (left <= right)', 'while (false /* TODO：填入还有候选时的条件 */)') },
    { id: 'guided-update', instruction: '支架 2 / 3：保留端点与中点，请独立补命中返回和两个边界更新。删除 TODO 下的异常，再写比较分支。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            // TODO：比较 nums[mid] 与 target；命中返回，否则缩小候选区间。
            throw new UnsupportedOperationException("请补比较和边界更新");
        }
        return -1;
    }
}
` },
    { id: 'guided-whole', instruction: '支架 3 / 3：从方法骨架写完整算法。自行初始化闭区间、写循环与分支，并处理未命中。最终提交完整 Java 到真实 runner，才能记录引导通过。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'exclusive-loop', description: '混用闭区间和 left < right，漏查最后一个候选。', counterexampleInputId: 'singleton-hit', explanation: 'nums=[4], target=4 时 left=right=0。若条件写成 left < right，循环一次也不执行并错误返回 -1。闭区间应在相等时继续检查。' },
    { id: 'stuck-boundary', description: '写 left = mid 或 right = mid，候选区间可能不再缩小。', counterexampleInputId: 'two-right', explanation: 'nums=[0,9], target=9，left=0、right=1、mid=0。若 left=mid，仍是 [0,1]，永远重复；mid 已确定不等于 target，应排除它。真实运行会命中超时，而不是预测检查通过。' },
    { id: 'length-endpoint', description: '把闭区间右端写成 nums.length，访问越界。', counterexampleInputId: 'above', explanation: 'nums=[-7,-1,2,5], target=6 时，错误右端 4 会最终访问 nums[4]；合法下标最大是 3。javac 可能允许编译，但 java 运行会抛数组越界异常。' },
    { id: 'return-value', description: '返回 nums[mid]，把元素值当成下标。', counterexampleInputId: 'found', explanation: '找到值 7 时应返回位置 3。返回 7 虽然类型同为 int，仍是错误答案；编译成功不能证明语义正确。' },
  ],
  testSuite: { version: TEST_SUITE_VERSION, cases, wrongFixtures: [
    { id: 'wrong-exclusive-loop', source: REFERENCE_SOURCE.replace('left <= right', 'left < right'), targetedCaseIds: ['singleton-hit', 'last', 'two-right'] },
    { id: 'wrong-element-value', source: REFERENCE_SOURCE.replace('return mid;', 'return nums[mid];'), targetedCaseIds: ['found', 'singleton-hit', 'first'] },
  ] },
  visualization: { modelId: '704-closed-interval', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(d => d.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
