import { PROBLEM_META, type Lesson, type SameTreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type SameTreeLesson = Extract<Lesson, { id: '100' }>;

const rightChain = (depth: number, value: number): (number | null)[] => {
  const tokens: (number | null)[] = [value];
  for (let level = 1; level < depth; level++) tokens.push(null, value);
  return tokens;
};

export const demoInputs: { id: string; title: string; input: SameTreeInput }[] = [
  { id: 'same-sparse', title: '空位与数值都一致', input: { p: [1, 2, 3, null, 4], q: [1, 2, 3, null, 4] } },
  { id: 'deep-value-difference', title: '根相同，深层值不同', input: { p: [1, 2, 3, null, 4], q: [1, 2, 3, null, 5] } },
  { id: 'repeated-shape-difference', title: '重复值相同，位置不同', input: { p: [1, 7, 7, 7], q: [1, 7, 7, null, null, 7] } },
  { id: 'both-empty', title: '两棵空树', input: { p: [], q: [] } },
];

const depthBoundary = rightChain(128, 6);
const cases: SameTreeLesson['testSuite']['cases'] = [
  { id: 'both-empty-case', input: demoInputs[3]!.input, expected: { kind: 'boolean', value: true }, coverage: '两边根引用都为 null；空树与空树结构和值均相同。' },
  { id: 'only-p-empty-case', input: { p: [], q: [1] }, expected: { kind: 'boolean', value: false }, coverage: 'p 为 null、q 有节点；必须在访问 val 前识别结构差异。' },
  { id: 'only-q-empty-case', input: { p: [1], q: [] }, expected: { kind: 'boolean', value: false }, coverage: 'q 为 null 的另一种单空方向，避免只检查一个形参。' },
  { id: 'single-same-case', input: { p: [42], q: [42] }, expected: { kind: 'boolean', value: true }, coverage: '两个对象身份不同但根值相同，左右孩子又同时为空。' },
  { id: 'single-value-difference-case', input: { p: [42], q: [41] }, expected: { kind: 'boolean', value: false }, coverage: '结构相同但根节点基本值不同，应立即返回 false。' },
  { id: 'complete-same-case', input: { p: [8, 4, 12, 2, 6, 10, 14], q: [8, 4, 12, 2, 6, 10, 14] }, expected: { kind: 'boolean', value: true }, coverage: '完整三层树验证左右子树都要逐位置比较。' },
  { id: 'left-right-shape-case', input: { p: [1, 2], q: [1, null, 2] }, expected: { kind: 'boolean', value: false }, coverage: '节点值集合相同但 2 分别是左孩子和右孩子，结构不同。' },
  { id: 'deep-value-difference-case', input: demoInputs[1]!.input, expected: { kind: 'boolean', value: false }, coverage: '根和第一层都相同，只有更深的 4/5 不同；只比较根会漏判。' },
  { id: 'repeated-values-same-case', input: { p: [1, 7, 7, 7, null, 7], q: [1, 7, 7, 7, null, 7] }, expected: { kind: 'boolean', value: true }, coverage: '多个值为 7 的节点仍是不同对象，逐位置对应后结果为 true。' },
  { id: 'repeated-shape-difference-case', input: demoInputs[2]!.input, expected: { kind: 'boolean', value: false }, coverage: '两边值序列都由 1 和三个 7 组成，但第三个 7 的父子位置不同。' },
  { id: 'signed-values-case', input: { p: [0, -9, 9, -10000, null, null, 10000], q: [0, -9, 9, -10000, null, null, 10000] }, expected: { kind: 'boolean', value: true }, coverage: '覆盖负数、零与本站节点值上下边界；null 不等于数值 0。' },
  { id: 'boundary-root-difference-case', input: { p: [-10000], q: [10000] }, expected: { kind: 'boolean', value: false }, coverage: '相反的节点值边界必须按 int 值精确比较。' },
  { id: 'depth-limit-case', input: { p: [...depthBoundary], q: [...depthBoundary] }, expected: { kind: 'boolean', value: true }, coverage: '真实判题覆盖本站深度 128 边界；该大输入不进入较小的参考演示。' },
];

export const ROOT_ONLY_SOURCE = `class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null || q == null) return p == q;
        return p.val == q.val;
    }
}
`;

export const NULL_AS_EQUAL_SOURCE = `class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null || q == null) return true;
        if (p.val != q.val) return false;
        return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }
}
`;

export const lesson100 = {
  schemaVersion: 1,
  id: '100',
  slug: 'same-tree',
  title: '相同的树',
  order: 51,
  lessonVersion: PROBLEM_META['100'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 引用值、对象身份、节点 int 值和 left/right 字段。',
    '从“相同位置成对比较”推导两棵树结构与数值都相同的递归条件。',
    '用不可变参考快照预测递归状态，再独立写出可由真实 Java runner 判定的方法。',
  ],
  source: { platform: 'LeetCode', number: 100, url: 'https://leetcode.com/problems/same-tree/' },
  taskSemantics: '给定两棵二叉树的根引用 p 和 q。只有每个对应位置都同时为空，或都存在且节点值相同，并且左右子树继续满足同样条件时，才返回 true。题意参考 LeetCode 100；本站题面、手算、图形与代码均为原创，无官方合作。',
  siteLimits: {
    description: 'p、q 分别使用紧凑队列式层序序列；每棵树最多 1000 个非 null 节点、深度最多 128，节点值 -10000—10000。空数组构造 null 根。参考演示每棵树最多 30 个节点、深度 8、总计最多 2000 个快照；真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'SameTreeInputSchema',
  },
  steps: [
    {
      id: 'syntax-tree-pairs', kind: 'syntax', title: 'J1 / J3 · 两个引用不要求对象身份相同',
      body: '学生实现 class Solution 中的 public boolean isSameTree(TreeNode p, TreeNode q)，不写 main。可信调用器从两份输入分别创建对象图。p、q、left、right 保存 TreeNode 引用值或 null；val 保存 int 基本值。p0 与 q0 是两个对象，即使它们的 val 都为 1；本题比较对应结构和 val，不要求两个形参指向同一个对象。Java 调用方法时按值复制 p、q 的引用值，不复制整棵树。给形参重新赋值只改变当前调用的变量绑定；修改 left/right 才会改对象，本参考解法不改树。',
      relatedIds: ['J1', 'J3'],
    },
    {
      id: 'syntax-null-recursion', kind: 'syntax', title: 'J2 / J7 · null 基例与 && 短路',
      body: '每次递归调用有独立的 p、q 形参与栈帧。先处理两个都 null，再处理恰有一个 null；只有两个引用都指向对象时才能读取 p.val。表达式 left && right 会先算左侧，左侧为 false 时右侧不会执行。参考图中的 p0、q0 是稳定的教学 ID，不是 JVM 物理地址，也不表示对象何时被垃圾回收。',
      relatedIds: ['J2', 'J7'],
    },
    {
      id: 'understanding-same-tree', kind: 'understanding', title: '理解题意 · 值相同还不够',
      body: '手算 p=[1,2,3,null,4] 与 q=[1,2,3,null,4]：根 1 对根 1，左侧 2 对 2，2 的左空位对空位、右孩子 4 对 4，右侧 3 对 3，所以 true。若 q 改成 [1,2,3,4]，两边仍可能出现同一组数值，但 4 所在的 left/right 位置不同，结果是 false。数组只是构造输入的表示，学生方法实际收到 TreeNode 引用。',
      relatedIds: [],
    },
    {
      id: 'derivation-paired-recursion', kind: 'derivation', title: '推导 · 当前节点对保持相同位置不变量',
      body: '定义调用 isSameTree(p,q) 的不变量：p 与 q 代表两棵树中的同一条左右路径。两者都 null 表示该位置都缺失，返回 true；单空表示结构不同；都有节点但 val 不同表示数值不同。通过这三关后，比较 p.left/q.left 与 p.right/q.right。两个子结果都为 true，当前子树才相同。每对可达节点至多比较一次，时间 O(n)，递归栈最多 O(h)，n 为先出现差异前访问的节点对数，h 为树高。',
      relatedIds: [],
    },
    {
      id: 'prediction-pairs', kind: 'prediction', title: '先预测，再揭示 · 根节点关系与最终结果',
      body: '第一处检查最外层 p/q 是双空、单空、根值相同还是根值不同；第二处在参考方法结束时预测 true/false。切换演示输入后，答案由新输入的状态模型重新计算。预测题只验证理解，不代表学生 Java 已编译或执行。',
      relatedIds: ['predict-root-pair', 'predict-final-result'],
    },
    {
      id: 'reference-paired-demo', kind: 'reference-demo', title: '参考解法 · 双对象图与节点对调用栈',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。左图节点使用 p0…，右图使用 q0…；变量“当前 p/当前 q”显示当前引用分别指向哪个对象，连线显示每个对象自己的 left/right 字段，节点内部显示 val。所有视图读取同一份不可变快照。播放、暂停、前进、后退、重置与输入切换只选择快照，不执行学生源码；左侧失败后，轨迹会按 Java 的 && 短路跳过右侧。',
      relatedIds: [],
    },
    {
      id: 'guided-same-tree', kind: 'guided-code', title: '引导补全 · 判空、当前值与两侧递归',
      body: '支架一修正双空/单空次序，支架二补全两个对应子树的递归方向，支架三从方法骨架重写完整解法。静态补全只记录练习过程；最后提交完整 Solution.java，真实 runner 通过 javac 和 java 调用该方法并比较 boolean 结果。打印 PASS 或写出与参考答案相似的字符串都不能通过。',
      relatedIds: ['guided-null-order'],
    },
    {
      id: 'independent-same-tree', kind: 'independent-code', title: '独立编写 · 从方法签名开始',
      body: '独立模式只给 isSameTree 骨架。先真实运行双空、单空、同根异深层、同值异结构，再提交本站测试。若出现 NullPointerException，检查是否在判空前读取 val；若重复值错位仍返回 true，检查是否把同一方向的孩子成对比较并保留 null 结构。只有当前源码的真实结果通过本站测试，才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-same-tree', kind: 'summary', title: '复盘 · 对应位置同时满足结构和值',
      body: '请用自己的话解释：两个不同对象何时仍算相同节点位置？为什么两个 null 返回 true、单空返回 false？为什么先比较左侧可能跳过右侧？引用值副本与对象字段有什么区别？本站分别记录预测、提示、查看答案、引导通过与独立通过；参考动画不是学生代码轨迹，本站测试也不是原平台官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '31805617e206fae53680c81f5f19e44d9e2b536c3e610dfe6fa7c7da553c4bc2',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-pair-base', level: 1, body: '把一次调用想成比较同一位置的一对候选，先不要递归：双空、单空、双节点分别应该怎样处理？' },
    { id: 'hint-pair-fields', level: 2, body: '两个对象都存在时先比较 val；接着保持方向一致，left 对 left、right 对 right。' },
    { id: 'hint-pair-recipe', level: 3, body: '两空 true；单空 false；值不同 false；否则返回 isSameTree(p.left,q.left) && isSameTree(p.right,q.right)。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-pair', prompt: '默认“空位与数值都一致”输入的最外层 p/q 属于哪种情况？',
      answer: { kind: 'choice', optionId: 'values-equal' },
      options: [
        { id: 'both-null', label: '两者都是 null' }, { id: 'one-null', label: '恰好一者为 null' },
        { id: 'values-equal', label: '都有节点且根值相同' }, { id: 'values-differ', label: '都有节点但根值不同' },
      ],
      explanation: 'p0 与 q0 是不同对象，但它们的 val 都是 1，因此当前根值相同，仍需继续比较左右子树。', checkpointId: 'root-pair',
    },
    {
      id: 'predict-final-result', prompt: '默认输入的两棵树最终是否相同？',
      answer: { kind: 'choice', optionId: 'same' },
      options: [{ id: 'same', label: 'true，相同' }, { id: 'different', label: 'false，不同' }],
      explanation: '两棵树每个对应位置的空缺与节点值都一致，所有递归节点对均返回 true。', checkpointId: 'final-result',
    },
  ],
  guided: {
    id: 'guided-100', finalCheck: 'real-java-submit', stages: [
      {
        id: 'guided-null-order', instruction: '支架 1 / 3：修复单空分支，保证一个引用为 null 时不会读取 val。', checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (p == null || q == null) return false;', 'if (p == null || q == null) return true; // TODO：单空时结构相同吗？'),
      },
      {
        id: 'guided-child-pairs', instruction: '支架 2 / 3：判空与值比较已有；修正对应孩子的配对方向。', checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('isSameTree(p.left, q.left) && isSameTree(p.right, q.right)', 'isSameTree(p.left, q.right) && isSameTree(p.right, q.left) /* TODO：相同树不是镜像树 */'),
      },
      {
        id: 'guided-full-method', instruction: '支架 3 / 3：从方法骨架补全全部基例与两次递归；提交完整 Java 到真实 runner。', checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'compare-root-only', description: '只比较两个根节点的 val，没有继续比较孩子。', counterexampleInputId: 'deep-value-difference-case', explanation: '根与第一层相同，深层 4/5 不同；根相等只是递归继续的条件。' },
    { id: 'ignore-null-shape', description: '只收集或排序数值，忽略 null 所代表的结构位置。', counterexampleInputId: 'left-right-shape-case', explanation: '两棵树都有 1 和 2，但 2 分别位于左侧和右侧，因此结构不同。' },
    { id: 'null-means-equal', description: '任意一侧为 null 都返回 true。', counterexampleInputId: 'only-p-empty-case', explanation: '只有两个引用都为 null 才表示该位置一致；单空必须返回 false。' },
    { id: 'mirror-child-pairs', description: '把 p.left 与 q.right 配对，误写成镜像比较。', counterexampleInputId: 'left-right-shape-case', explanation: '本题要求相同方向、相同位置；交叉配对解决的是对称树而非相同树。' },
  ],
  testSuite: {
    version: PROBLEM_META['100'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-root-only', source: ROOT_ONLY_SOURCE, targetedCaseIds: ['deep-value-difference-case', 'left-right-shape-case', 'repeated-shape-difference-case'] },
      { id: 'wrong-null-as-equal', source: NULL_AS_EQUAL_SOURCE, targetedCaseIds: ['only-p-empty-case', 'only-q-empty-case', 'left-right-shape-case'] },
    ],
  },
  visualization: {
    modelId: '100-recursive-pairs', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
