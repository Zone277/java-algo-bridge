import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TreeLesson = Extract<Lesson, { id: '101' }>;

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'mirror-sparse', title: '缺口也要左右交叉对应', input: { root: [1, 2, 2, null, 3, 3, null] } },
  { id: 'same-values-wrong-shape', title: '值成对相同，空位却不镜像', input: { root: [1, 2, 2, null, 3, null, 3] } },
  { id: 'full-mirror', title: '完整镜像的四个叶子', input: { root: [1, 2, 2, 3, 4, 4, 3] } },
  { id: 'empty-tree', title: '空树的约定', input: { root: [] } },
];

const cases: TreeLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'boolean', value: true }, coverage: '本站额外接纳空树；没有不匹配的节点对，结果为 true。' },
  { id: 'singleton-case', input: { root: [7] }, expected: { kind: 'boolean', value: true }, coverage: '根节点的两个空孩子互为镜像。' },
  { id: 'equal-children-case', input: { root: [1, 2, 2] }, expected: { kind: 'boolean', value: true }, coverage: '左右孩子值相同且下层空位相同。' },
  { id: 'unequal-children-case', input: { root: [1, 2, 3] }, expected: { kind: 'boolean', value: false }, coverage: '根下第一对节点值不相同，立即失败。' },
  { id: 'full-mirror-case', input: demoInputs[2]!.input, expected: { kind: 'boolean', value: true }, coverage: '完整两层必须交叉配对：左左与右右、左右与右左。' },
  { id: 'mirror-sparse-case', input: demoInputs[0]!.input, expected: { kind: 'boolean', value: true }, coverage: '紧凑层序中的 null 缺口镜像对应；不能按相同方向比较。' },
  { id: 'same-values-wrong-shape-case', input: demoInputs[1]!.input, expected: { kind: 'boolean', value: false }, coverage: '相同值的两个 3 都在右孩子位置，左空与右实节点不镜像。' },
  { id: 'one-child-case', input: { root: [1, null, 2] }, expected: { kind: 'boolean', value: false }, coverage: '一侧根孩子为空另一侧非空，不能直接访问 null 的 val。' },
  { id: 'repeated-value-wrong-shape-case', input: { root: [1, 5, 5, 5, null, 5, null] }, expected: { kind: 'boolean', value: false }, coverage: '重复值节点身份各异；值集合相同也不能遮蔽结构错位。' },
  { id: 'negative-values-case', input: { root: [0, -1, -1, null, 2, 2, null] }, expected: { kind: 'boolean', value: true }, coverage: '节点值可为负数或零，null 是引用缺失而非数值 0。' },
  { id: 'deep-value-mismatch-case', input: { root: [1, 2, 2, 3, 4, 4, 9] }, expected: { kind: 'boolean', value: false }, coverage: '根下值相同但更深层外侧值不同；只比较一层会误判。' },
];

export const SHALLOW_ONLY_SOURCE = `class Solution {
    public boolean isSymmetric(TreeNode root) {
        if (root == null) return true;
        if (root.left == null || root.right == null) return root.left == root.right;
        return root.left.val == root.right.val;
    }
}
`;

export const SAME_SIDE_SOURCE = `class Solution {
    public boolean isSymmetric(TreeNode root) {
        return root == null || same(root.left, root.right);
    }
    private boolean same(TreeNode a, TreeNode b) {
        if (a == null || b == null) return a == b;
        return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
    }
}
`;

export const lesson101 = {
  schemaVersion: 1,
  id: '101', slug: 'symmetric-tree', title: '对称二叉树', order: 45,
  lessonVersion: PROBLEM_META['101'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 对象身份、节点的 int 值以及 left/right 引用字段。',
    '从镜面配对推导两个树节点与空引用的递归比较规则。',
    '用参考快照预测配对状态，再从 Java 方法骨架写出可真实运行的解法。',
  ],
  source: { platform: 'LeetCode', number: 101, url: 'https://leetcode.com/problems/symmetric-tree/' },
  taskSemantics: '给定二叉树根节点，判断它从根的中心线向左右展开时是否镜像：对应位置的节点值相同，且空孩子位置也要镜像。本站另外接受空树，约定结果为 true。题意参考 LeetCode 101；本站题面、示例与代码均为原创，无官方合作。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、树深度最多 128、节点值 -100—100；输入是紧凑队列式层序，空数组表示空树，null 孩子不入队。参考演示最多 30 个节点、深度 8；真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    { id: 'syntax-tree-references', kind: 'syntax', title: 'J1 / J3 · TreeNode、int 与引用',
      body: '学生只需实现 class Solution 的 public boolean isSymmetric(TreeNode root)，不写 main；可信调用器构造树。root、left、right 的类型是 TreeNode，保存对象引用值或 null；val 的类型是 int，保存基本数值。两个节点都写 5，仍是两个独立对象。Java 传入 root 时复制的是引用值，不复制整棵树；给形参另赋值不会改写调用者变量，改写节点字段才会改变对象。此题只读取字段，不改树。', relatedIds: ['J1', 'J3'] },
    { id: 'syntax-null-recursion', kind: 'syntax', title: 'J2 / J7 · boolean 与递归基例',
      body: 'boolean 只能是 true 或 false，&& 左边为 false 时右边不会执行。辅助方法 mirror(TreeNode a,TreeNode b) 每次接收一对引用值，每次调用有自己的一组参数和栈帧。先判断两者都为 null，再判断恰好一者为 null；通过后才能访问 a.val 与 b.val，否则会抛 NullPointerException。空引用不是一个值为 null 的节点；可视化节点 ID 是教学身份，不是 JVM 地址或垃圾回收判断。', relatedIds: ['J2', 'J7'] },
    { id: 'understanding-mirror', kind: 'understanding', title: '理解输入输出 · 位置也要对称',
      body: '手算 [1,2,2,null,3,3,null]：根 1 两边的 2 对上；左侧 2 的左空位应对右侧 2 的右空位，左侧 2 的右节点 3 对右侧 2 的左节点 3，因此 true。若改成 [1,2,2,null,3,null,3]，两个 3 仍同值，但它们都在各自右边：左空位对右节点，返回 false。层序输入只用于构造树，学生方法收到的是 TreeNode。', relatedIds: [] },
    { id: 'derivation-mirror', kind: 'derivation', title: '推导 · 每个成对调用保持镜像不变量',
      body: '定义 mirror(a,b)：a 与 b 是同一镜像位置的一对候选。两者都 null 则匹配；恰有一个 null 则结构不匹配；两个实节点的 val 不等则不匹配。否则，外侧 a.left 对 b.right，内侧 a.right 对 b.left，两对都为 true 才返回 true。根为空直接 true；非空则比较 root.left 与 root.right。递归调用不修改树。每个节点至多参与一次配对，时间 O(n)，同时持有的调用帧 O(h)，h 为树高；短路可提前结束。', relatedIds: [] },
    { id: 'prediction-mirror', kind: 'prediction', title: '先预测，再揭示 · 第一对与最终布尔值',
      body: '第一处检查根左右孩子是否为镜像配对的两个实节点；第二处在参考方法返回前预测整棵树的 true/false。切换输入后，两处答案都从当前参考快照重新生成。预测只检查算法理解，不表示学生 Java 已编译运行。', relatedIds: ['predict-first-pair', 'predict-result'] },
    { id: 'reference-mirror-demo', kind: 'reference-demo', title: '参考解法 · 节点对与空位的状态演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。节点 t0…有稳定身份，连线显示各对象 left/right 字段；变量 a、b 显示当前一对引用，栈显示等待中的镜像配对。每个快照同时提供变量、对象图、栈与代码行，播放、暂停、前进、后退、重置只改变选中的不可变快照。它不追踪学生 Java 代码，也不表示没有变量指向某节点就已被垃圾回收。', relatedIds: [] },
    { id: 'guided-mirror', kind: 'guided-code', title: '引导补全 · 空树、交叉配对与完整方法',
      body: '支架一修复空树基例，支架二修复交叉方向，支架三仅给方法骨架。静态阶段只记录练习，不把所填字符串当判题依据；最终提交的是完整 Solution.java，真实 runner 会由 javac 编译、java 执行，并按返回的 boolean 判定。打印 PASS 不会通过。', relatedIds: ['guided-empty-root'] },
    { id: 'independent-mirror', kind: 'independent-code', title: '独立编写 · 从签名开始',
      body: '独立模式只提供 isSymmetric 方法骨架。先用空树、[1,2,2]、稀疏镜像和相同值但错位的反例真实运行，再提交本站所有测试。若单侧 null 抛异常，检查判空顺序；若两个 3 都同值却判 true，检查是否交叉比较。只有完整源码在真实 runner 通过本站测试，才记录独立通过。', relatedIds: [] },
    { id: 'summary-mirror', kind: 'summary', title: '复盘 · 值相等不代表镜像',
      body: '请解释：为什么 a.left 要对 b.right？两个 null 为什么匹配？一个 null 与一个节点为什么不匹配？为什么比较 val 之前必须判空？本站分别记录预测、提示、查看答案、引导通过与独立通过；播放参考动画不等于掌握，本站测试也不是原平台官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '71c543f665c83ce8b845019f71aae3d63e320f43a4023d1e9ba012063b410f87', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-mirror-base', level: 1, body: '先只处理“两个都没有节点”和“仅一侧没有节点”，不要急着比较数值。' },
    { id: 'hint-mirror-cross', level: 2, body: '想象中心竖着一面镜子：左子树的左孩子应和右子树的右孩子成对，另一对也要交叉。' },
    { id: 'hint-mirror-recipe', level: 3, body: '空根返回 true；mirror(a,b) 中两空 true、单空 false、值不同 false；最后返回 mirror(a.left,b.right) && mirror(a.right,b.left)。' },
  ],
  predictionChecks: [
    { id: 'predict-first-pair', prompt: '默认稀疏镜像输入的根左右孩子，是否都是实节点？', answer: { kind: 'choice', optionId: 'both-nodes' }, options: [{ id: 'both-nodes', label: '是，左右各有一个节点' }, { id: 'has-null', label: '否，至少一侧为 null' }], explanation: '根 1 的两个孩子均是值 2 的不同对象，首先比较这对，再检查外侧和内侧。', checkpointId: 'first-pair-check' },
    { id: 'predict-result', prompt: '默认稀疏镜像输入最终返回 true 还是 false？', answer: { kind: 'choice', optionId: 'true' }, options: [{ id: 'true', label: 'true，对称' }, { id: 'false', label: 'false，不对称' }], explanation: '左空对右空，左 3 对右 3；所有镜像位置均匹配，返回 true。', checkpointId: 'result-check' },
  ],
  guided: { id: 'guided-101', finalCheck: 'real-java-submit', stages: [
    { id: 'guided-empty-root', instruction: '支架 1 / 3：修复空树返回值，先真实运行空树与单节点。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('if (root == null) return true;', 'if (root == null) return false; // TODO：空树是否对称？') },
    { id: 'guided-cross-pairs', instruction: '支架 2 / 3：双空、单空与值比较已有；修复左右孩子的镜像配对方向。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('mirror(a.left, b.right) && mirror(a.right, b.left)', 'mirror(a.left, b.left) && mirror(a.right, b.right) /* TODO：交叉配对 */') },
    { id: 'guided-full-method', instruction: '支架 3 / 3：从方法骨架补全判空、值比较与两对子调用；提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'only-compare-root-children', description: '只看根左右孩子值，忽略深层结构。', counterexampleInputId: 'deep-value-mismatch-case', explanation: '根下两个 2 一样，但外侧 3 与 9 不一样；必须递归验证每一对。' },
    { id: 'compare-same-side', description: '把左子树的左孩子与右子树的左孩子比较。', counterexampleInputId: 'mirror-sparse-case', explanation: '稀疏镜像中左侧左空应对右侧右空；按同侧比较会把真实对称树判错。' },
    { id: 'ignore-null-shape', description: '只收集数值序列，忽略 null 所在位置。', counterexampleInputId: 'same-values-wrong-shape-case', explanation: '两个 3 虽然相同，但一对镜像位置是 null 与实节点；结构不匹配即 false。' },
    { id: 'dereference-before-null', description: '先访问 a.val 或 a.left，再判断 a 是否为 null。', counterexampleInputId: 'one-child-case', explanation: '单侧为空时不能访问空引用的字段；应先处理两空/单空。' },
  ],
  testSuite: { version: PROBLEM_META['101'].testSuiteVersion, cases, wrongFixtures: [
    { id: 'wrong-shallow-only', source: SHALLOW_ONLY_SOURCE, targetedCaseIds: ['same-values-wrong-shape-case', 'deep-value-mismatch-case'] },
    { id: 'wrong-same-side', source: SAME_SIDE_SOURCE, targetedCaseIds: ['mirror-sparse-case', 'full-mirror-case'] },
  ] },
  visualization: { modelId: '101-recursive-mirror', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
