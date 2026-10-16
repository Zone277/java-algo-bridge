import { MergeSortedArrayInputSchema, PROBLEM_META, expectedOutput, type Lesson, type MergeSortedArrayInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type Lesson88 = Extract<Lesson, { id: '88' }>;
type Case88 = Lesson88['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: MergeSortedArrayInput }[] = [
  { id: 'interleaved-demo', title: '交错与重复：[1,2,3] + [2,5,6]', input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 } },
  { id: 'empty-first-demo', title: 'nums1 没有有效元素', input: { nums1: [0, 0, 0], m: 0, nums2: [-2, 0, 4], n: 3 } },
  { id: 'empty-second-demo', title: 'nums2 为空，原数组不变', input: { nums1: [1, 3, 5], m: 3, nums2: [], n: 0 } },
];

function testCase(id: string, raw: MergeSortedArrayInput, coverage: string): Case88 {
  const input = MergeSortedArrayInputSchema.parse(raw);
  const expected = expectedOutput('88', input);
  if (expected.kind !== 'int-array') throw new Error('88 expected output must be int-array');
  return { id, input, expected, coverage };
}

const cases: Case88[] = [
  testCase('88-interleaved', demoInputs[0]!.input, '两段有序数据交错且存在相等值；覆盖两种写入分支与从右向左推进。'),
  testCase('88-no-first', demoInputs[1]!.input, 'm=0，只有 nums2；不能读取 nums1[-1]，所有元素必须写回原数组。'),
  testCase('88-no-second', demoInputs[2]!.input, 'n=0，循环不进入，保留原 nums1 内容。'),
  testCase('88-single-second', { nums1: [0], m: 0, nums2: [7], n: 1 }, '最短合法输入，只需向原数组写入一个元素。'),
  testCase('88-single-first', { nums1: [-3], m: 1, nums2: [], n: 0 }, '最短合法输入且第二段为空。'),
  testCase('88-duplicate-values', { nums1: [2, 2, 0, 0], m: 2, nums2: [2, 2], n: 2 }, '四个相等值；比较相等时取 nums2 不影响排序或元素个数。'),
  testCase('88-negative-zero', { nums1: [-5, -1, 0, 0, 0], m: 2, nums2: [-4, 0, 3], n: 3 }, '负数与真正的零；预留零和有效零须由 m、n 区分。'),
  testCase('88-second-larger', { nums1: [1, 2, 3, 0, 0], m: 3, nums2: [4, 5], n: 2 }, 'nums2 全部较大，后两格写入后 nums1 前缀无需移动。'),
  testCase('88-second-smaller', { nums1: [4, 5, 0, 0], m: 2, nums2: [1, 2], n: 2 }, 'nums2 全部较小；必须先挪走 nums1 末尾，避免前向覆盖。'),
  testCase('88-valid-zero', { nums1: [0, 2, 0], m: 2, nums2: [0], n: 1 }, '有效元素本身可为零，不能把所有零当作预留格。'),
  testCase('88-extreme-values', { nums1: [-1000000000, 1000000000, 0, 0], m: 2, nums2: [-1000000000, 1000000000], n: 2 }, '本站值域上下界与重复值，比较不应靠相减避免整数溢出。'),
  testCase('88-max-length', { nums1: [...Array.from({ length: 100 }, (_, i) => i * 2), ...Array<number>(100).fill(0)], m: 100, nums2: Array.from({ length: 100 }, (_, i) => i * 2 + 1), n: 100 }, '本站 200 项上限；只进入真实判题，不纳入最多 30 项的演示。'),
];

export const WRONG_REBIND_SOURCE = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        int[] merged = new int[m + n];
        System.arraycopy(nums1, 0, merged, 0, m);
        System.arraycopy(nums2, 0, merged, m, n);
        java.util.Arrays.sort(merged);
        nums1 = merged;
    }
}
`;

export const WRONG_STOP_EARLY_SOURCE = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, write = m + n - 1;
        while (i >= 0 && j >= 0) {
            if (nums1[i] > nums2[j]) nums1[write--] = nums1[i--];
            else nums1[write--] = nums2[j--];
        }
    }
}
`;

export const WRONG_FORWARD_SOURCE = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        int i = 0, j = 0, write = 0;
        while (i < m && j < n) {
            if (nums1[i] <= nums2[j]) nums1[write++] = nums1[i++];
            else nums1[write++] = nums2[j++];
        }
        while (j < n) nums1[write++] = nums2[j++];
    }
}
`;

const guidedCondition = REFERENCE_SOURCE.replace('while (j >= 0)', 'while (false /* TODO：nums2 是否还有未合并的元素？ */)');
const guidedWrite = `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1;
        int j = n - 1;
        int write = m + n - 1;
        while (j >= 0) {
            // TODO：比较两段尚未放入结果的最大值，把较大者写到原 nums1[write]。
            // TODO：移动刚取走元素的指针，再令 write 向左移动。
            throw new UnsupportedOperationException("请补全逆向写入");
        }
    }
}
`;

export const lesson88 = {
  schemaVersion: 1,
  id: '88',
  slug: 'merge-sorted-array',
  title: '合并两个有序数组',
  order: 17,
  lessonVersion: PROBLEM_META['88'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分 nums1 的有效前缀与预留位置，并解释 m、n 与数组 length 的不同。',
    '证明逆向写入不会覆盖尚未读取的元素，维护已填后缀有序且已就位。',
    '实现 void 原地修改方法，理解重新绑定参数与修改原数组对象的区别。',
  ],
  source: { platform: 'LeetCode', number: 88, url: 'https://leetcode.com/problems/merge-sorted-array/' },
  taskSemantics: '给定非降序排列的 nums1 有效前 m 项和 nums2 的 n 项，nums1 总长恰为 m+n，末尾 n 格只是容量。把两个有序序列合并成非降序序列，直接写回传入的 nums1 数组对象；方法返回 void。题意参考 LeetCode 88；本站题面、示例、推导和代码均为原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题接受 m、n 各 0—200 且 1≤m+n≤200，整数在 -10^9—10^9；两段有效数据必须分别非降序，nums1 的预留格为 0。参考演示最多 30 项，较长合法输入仍可真实运行。', inputSchemaId: 'MergeSortedArrayInput' },
  steps: [
    { id: '88-syntax-method', kind: 'syntax', title: 'Java 必要语法 · void 方法与四个参数', body: 'public void merge(int[] nums1, int m, int[] nums2, int n) 的 void 表示方法没有返回值；平台在方法结束后检查传入的原 nums1 数组对象。int 类型的 m、n 保存基本整数值；int[] 变量保存数组对象的引用值。Java 调用时复制各参数的值：给 nums1[write] 赋值会改变共享数组对象，给局部参数 nums1 重新赋一个新数组只会改变该局部变量的绑定。无需打印 PASS、返回数组或写 main。', relatedIds: ['J1', 'J3'] },
    { id: '88-syntax-array', kind: 'syntax', title: 'Java 必要语法 · length、索引与循环', body: 'nums1.length 是整个容量 m+n，不是有效数据量 m；nums2.length 是 n。数组下标从 0 开始，已有末项是 nums1[m-1]，第二段末项是 nums2[n-1]，最终写入位置是 nums1[m+n-1]。当 m 或 n 为 0，相应末项下标是 -1，不能去读取它。while (j >= 0) 只在 nums2 还有待放入元素时执行，-- 使下标向左移动。', relatedIds: ['J2', 'J3'] },
    { id: '88-understand', kind: 'understanding', title: '读题 · 预留的零不是全部有效零', body: '例如 nums1=[1,2,3,0,0,0]、m=3；nums2=[2,5,6]、n=3。前 3 个数与 nums2 的 3 个数参与合并，后三个 0 是容量占位。方法结束后，同一个 nums1 应为 [1,2,2,3,5,6]。若 nums1=[0,2,0]、m=2，开头的 0 是真正的数，只有最后一格是预留位置；必须用 m、n 判定，不能过滤零。', relatedIds: ['88-interleaved', '88-valid-zero'] },
    { id: '88-manual', kind: 'understanding', title: '手工模拟 · 从空位的最右端写起', body: '从 [1,2,3,0,0,0] 与 [2,5,6] 出发，i=2 指向 3，j=2 指向 6，write=5。先写 6 到下标 5、5 到下标 4；接着比较 3 与 2，把 3 写到下标 3；再把第二段的 2 写到下标 2。j 变为 -1 时，原数组前缀 [1,2] 本来就在正确位置，可直接结束。演示中每次写入、移动来源指针、移动 write 分别有独立快照。', relatedIds: ['interleaved-demo'] },
    { id: '88-derive', kind: 'derivation', title: '算法推导 · 为何从后填不会覆盖未读数据', body: '若从 nums1[0] 向右写，写入 nums2 的较小数时可能覆盖尚未比较的 nums1 有效元素。另建合并数组再复制回来虽可行，但需 O(m+n) 额外空间。原 nums1 后 n 格已有空位，逆向写入时只需比较两段尚未放入结果的最大值。循环不变量：write 后面的后缀已是最终非降序合并序列对应位置，nums1[0..i] 与 nums2[0..j] 仍保留全部未处理值；write 总在未读 nums1 元素右侧或同位置，因此不会覆盖它们。较大者放到 write，移动其来源指针与 write；相等时任取一段都正确。nums2 用尽后，nums1 未处理前缀已经在原位。时间 O(m+n)，除固定几个指针外额外空间 O(1)；这是算法结构分析，不由一次运行耗时推断。', relatedIds: [] },
    { id: '88-predict', kind: 'prediction', title: '先预测，再揭示两个关键状态', body: '先预测 write 的初始下标，再根据当前两段末尾决定首次从哪个数组取数。切换输入时答案由新输入生成的快照重新计算；若 nums2 为空，则预测循环是否进入。预测只是预置参考算法的教学检查，不代表学生源码已编译执行。', relatedIds: ['88-predict-write', '88-predict-source'] },
    { id: '88-reference', kind: 'reference-demo', title: '参考解法 · 算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。两个数组、三个指针、解释和 Java 代码高亮都来自同一不可变快照。上一步会恢复之前的原数组内容；输入切换重建轨迹。这里演示的是预置参考算法，学生编辑的 Java 只在另一路 Docker runner 内真实编译与执行。', relatedIds: ['interleaved-demo', 'empty-first-demo', 'empty-second-demo'] },
    { id: '88-guided', kind: 'guided-code', title: '引导编写 · 撤去三段支架', body: '第一段补循环条件，第二段补比较、写入和指针移动，第三段从方法骨架重新写完整解法。各段提示是静态练习；最终必须把完整 Java Solution 提交到真实 runner，并按传入数组被修改后的结构判定，不要求源码与参考答案字符串相同。', relatedIds: ['88-guided-task'] },
    { id: '88-independent', kind: 'independent-code', title: '独立编写 · 从空方法骨架出发', body: '独立编辑器初始只有方法签名。先用 m=0、n=0、有效零、两段交错的输入试运行；失败时检查 javac 诊断、异常或实际 nums1 值。修正后重新提交本站测试；只有当前源码真实通过才记录独立通过。引导与独立草稿分别保存，刷新后可以恢复。', relatedIds: [] },
    { id: '88-summary', kind: 'summary', title: '复盘 · 对象身份与安全写入', body: '请解释为什么直接写 nums1[write] 有效、nums1 = merged 无效；为什么从后往前不会覆盖未读的 nums1 值；为什么 nums2 耗尽后可结束。提示、查看答案、引导通过和独立通过本站测试分别记录。本站测试不等于 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'b5bf28f6290b36fd6505b2c2349dffd7585d6292ae2bd568d8dbeaa3e70a55d9', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })) },
  hints: [
    { id: '88-hint-concept', level: 1, body: 'nums1 的末尾已经预留了空位。若从最右边开始放当前最大值，还会碰到尚未比较的 nums1 元素吗？' },
    { id: '88-hint-invariant', level: 2, body: '让 i、j 分别指向两段未处理部分的末尾，write 指向 nums1 尚未确定的最后一格。保持 write 右侧已是最终后缀，并且 write 不会位于 i 的左边。' },
    { id: '88-hint-pseudocode', level: 3, body: 'i=m-1，j=n-1，write=m+n-1；当 j>=0：若 i>=0 且 nums1[i]>nums2[j]，写 nums1[i] 并 i--，否则写 nums2[j] 并 j--；每轮 write--。' },
  ],
  predictionChecks: [
    { id: '88-predict-write', checkpointId: 'first-write-index', prompt: '默认输入 nums1 长度为 6。第一次写入前 write 是哪个 Java 下标？', answer: { kind: 'int', value: 5 }, explanation: 'nums1 总长度为 m+n=6，最后一个位置下标是 5。' },
    { id: '88-predict-source', checkpointId: 'first-choice', prompt: '默认输入第一次比较 nums1[i]=3 与 nums2[j]=6，应该从哪个数组取数？', answer: { kind: 'choice', optionId: 'nums2' }, options: [{ id: 'nums1', label: '取 nums1[i]' }, { id: 'nums2', label: '取 nums2[j]' }], explanation: '从右端写入时放较大的值；6 来自 nums2。' },
  ],
  guided: { id: '88-guided-task', finalCheck: 'real-java-submit', stages: [
    { id: '88-guided-loop', instruction: '支架 1 / 3：补 while 条件，仅当 nums2 尚有未放入元素时继续。', scaffoldSource: guidedCondition, checkKind: 'static-practice' },
    { id: '88-guided-write', instruction: '支架 2 / 3：在已经初始化的 i、j、write 基础上补比较、写入和指针移动，并删除 TODO 异常。', scaffoldSource: guidedWrite, checkKind: 'static-practice' },
    { id: '88-guided-whole', instruction: '支架 3 / 3：从方法骨架完整实现。提交整个 Solution 到真实 Java runner，检查原数组。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: '88-error-rebind', description: '创建合并好的新数组后只给局部参数 nums1 重新赋值。', counterexampleInputId: '88-interleaved', explanation: '参数里的数组引用值是按值传递的；调用器仍观察最初传入的数组对象，它没有被改好。' },
    { id: '88-error-stop-early', description: '用 i>=0 && j>=0 作循环条件，nums1 耗尽时提前结束。', counterexampleInputId: '88-no-first', explanation: 'm=0 时 i=-1，但 nums2 所有元素仍须写入原数组；循环应由 j>=0 控制。' },
    { id: '88-error-forward', description: '直接从 nums1[0] 开始写合并结果，覆盖尚未读取的有效值。', counterexampleInputId: '88-second-smaller', explanation: '[4,5,0,0] 与 [1,2] 合并时，先把 1 写到 nums1[0] 会覆盖尚未取出的 4。' },
    { id: '88-error-zero', description: '把 nums1 里的所有零都当作预留格而忽略。', counterexampleInputId: '88-valid-zero', explanation: 'm 指明有效前缀；前缀中的 0 是真实元素，必须保留。' },
  ],
  testSuite: { version: PROBLEM_META['88'].testSuiteVersion, cases, wrongFixtures: [
    { id: '88-wrong-rebind', source: WRONG_REBIND_SOURCE, targetedCaseIds: ['88-interleaved', '88-no-first', '88-second-smaller'] },
    { id: '88-wrong-stop-early', source: WRONG_STOP_EARLY_SOURCE, targetedCaseIds: ['88-no-first', '88-second-smaller'] },
    { id: '88-wrong-forward', source: WRONG_FORWARD_SOURCE, targetedCaseIds: ['88-second-smaller', '88-interleaved'] },
  ] },
  visualization: { modelId: '88-backward-merge', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson88;
