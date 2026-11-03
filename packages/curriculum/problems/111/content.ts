import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type MinimumDepthLesson = Extract<Lesson, { id: '111' }>;

function rightChain(depth: number): TreeInput['root'] {
  const root: TreeInput['root'] = depth === 0 ? [] : [1];
  for (let level = 2; level <= depth; level++) root.push(null, 1);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'near-leaf', title: '最近叶在根的右侧', input: { root: [1, 2, 3, 4, null, null, null, 5] } },
  { id: 'one-child-chain', title: '空孩子不是叶节点', input: { root: [1, null, 2, 3] } },
  { id: 'repeated-values', title: '相同数值、不同节点身份', input: { root: [7, 7, 7, null, 7, null, null, 7] } },
  { id: 'empty-tree', title: '空树深度为零', input: { root: [] } },
];

const cases: MinimumDepthLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'int', value: 0 }, coverage: '空树没有根到叶路径，按本站契约返回 0。' },
  { id: 'single-case', input: { root: [8] }, expected: { kind: 'int', value: 1 }, coverage: '单节点本身就是叶节点，路径含一个节点。' },
  { id: 'near-leaf-case', input: demoInputs[0]!.input, expected: { kind: 'int', value: 2 }, coverage: '右孩子 3 是叶节点；左侧虽更深，最近叶距离仍是 2。' },
  { id: 'one-child-chain-case', input: demoInputs[1]!.input, expected: { kind: 'int', value: 3 }, coverage: '根的左引用为空但不是叶子，路径必须沿右孩子到节点 3。' },
  { id: 'only-left-case', input: { root: [1, 2, null, 3, 4] }, expected: { kind: 'int', value: 3 }, coverage: '根只有左孩子，不能用空右子树的深度 0 提前结束路径。' },
  { id: 'only-right-case', input: { root: [1, null, 2, null, 3, null, 4] }, expected: { kind: 'int', value: 4 }, coverage: '连续右链覆盖每层只有一个孩子的边界。' },
  { id: 'balanced-case', input: { root: [3, 9, 20, null, null, 15, 7] }, expected: { kind: 'int', value: 2 }, coverage: '左孩子 9 是较近叶子；与最大深度 3 明确区分。' },
  { id: 'two-equal-branches-case', input: { root: [1, 2, 3, 4, 5, null, 6] }, expected: { kind: 'int', value: 3 }, coverage: '左右最近叶深度相同，任一分支都得到 3。' },
  { id: 'repeated-values-case', input: demoInputs[2]!.input, expected: { kind: 'int', value: 2 }, coverage: '多个 val=7 的对象不能合并；右孩子是独立叶节点。' },
  { id: 'negative-values-case', input: { root: [-1, -2, -3, -4, null, null, -5] }, expected: { kind: 'int', value: 3 }, coverage: '节点值可为负，最小深度只取决于引用结构。' },
  { id: 'trailing-null-case', input: { root: [1, 2, 3, null, null] }, expected: { kind: 'int', value: 2 }, coverage: '末尾省略的 null 不生成节点，两个孩子都是叶节点。' },
  { id: 'depth-limit-case', input: { root: rightChain(128) }, expected: { kind: 'int', value: 128 }, coverage: '本站深度 128 边界用于真实判定；参考演示会明确拒绝过深输入。' },
];

export const NAIVE_MIN_SOURCE = `class Solution {
    public int minDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.min(minDepth(root.left), minDepth(root.right));
    }
}
`;

export const MAX_DEPTH_SOURCE = `class Solution {
    public int minDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(minDepth(root.left), minDepth(root.right));
    }
}
`;

export const lesson111 = {
  schemaVersion: 1,
  id: '111',
  slug: 'minimum-depth-of-binary-tree',
  title: '二叉树的最小深度',
  order: 54,
  lessonVersion: PROBLEM_META['111'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '正确区分 TreeNode 引用、节点对象、val 基本值、null 与叶节点。',
    '从根到最近叶的定义推导单孩子分支，避免把缺失孩子当成终点。',
    '预测递归帧的中间深度，并提交完整 Java 到真实 runner。',
  ],
  source: { platform: 'LeetCode', number: 111, url: 'https://leetcode.com/problems/minimum-depth-of-binary-tree/' },
  taskSemantics: '给定二叉树根引用 root，返回从根到最近叶节点路径上的节点数；叶节点必须同时没有左、右孩子，空树返回 0。题意参考 LeetCode 111；本站题面、讲解、示例、图形和代码均为原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、深度最多 128，节点值 -100—100；root 使用紧凑队列式层序，null 不进入父节点队列，空数组表示空树。参考演示最多 30 个节点、深度 8；真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-min-method', kind: 'syntax', title: 'J1 / J2 · int 方法、局部变量和 return',
      body: '只需实现 public int minDepth(TreeNode root)，无需 main、输入输出或重新声明 TreeNode。leftDepth、rightDepth 和返回值都是 int 基本值；return 会结束当前调用并把 int 值交给调用者。Math.min(a,b) 取较小 int，Math.max(a,b) 取较大 int。这里两者都会用到：孩子都存在时取 min，缺一侧时取 max 跳过 0。',
      relatedIds: ['J1', 'J2'],
    },
    {
      id: 'syntax-tree-identity', kind: 'syntax', title: 'J3 / J7 · 引用、对象、null 与递归帧',
      body: 'root、left、right 变量或字段保存 TreeNode 引用值或 null；val 才是 int 基本值。两个 val 同为 7 的节点仍是不同对象，图中的 t0、t1 是稳定教学身份，不是物理地址。调用 minDepth(root.left) 时，Java 按值复制 left 中的引用值到新参数；不会复制节点，也不会因某个变量不再指向节点就宣称对象已被回收。每次递归调用有独立的局部变量和返回位置。',
      relatedIds: ['J3', 'J7'],
    },
    {
      id: 'understanding-leaf', kind: 'understanding', title: '读题与手算 · null 孩子不等于叶节点',
      body: '叶节点是一个真实节点，并且它的 left 与 right 都为 null。对 [1,null,2,3]，根 1 只有右孩子 2；根的 null 左引用并不是叶节点，不能得到路径长度 1。节点 2 还有左孩子 3，所以最近叶是节点 3，路径 1→2→3 含 3 个节点。紧凑层序按队列给每个真实父节点读取左右孩子，null 自己不会入队。',
      relatedIds: [],
    },
    {
      id: 'derivation-min-depth', kind: 'derivation', title: '推导 · 只在两个孩子都存在时取较小值',
      body: '定义 minDepth(node) 为从 node 到最近叶的节点数，null 返回 0。非空节点先求左右深度：若一侧为 0，说明该侧没有可到达的叶，必须走另一侧，因此返回 1+Math.max(leftDepth,rightDepth)；若两侧都非零，才可选较近的一侧，返回 1+Math.min(leftDepth,rightDepth)。叶节点两侧都为 0，第一条组合式自然返回 1。每个节点访问一次，时间 O(n)，递归栈 O(h)，不修改树字段。',
      relatedIds: [],
    },
    {
      id: 'prediction-min-depth', kind: 'prediction', title: '先预测，再揭示 · 根引用与最近叶深度',
      body: '默认输入中，先预测最外层 root 是否为 null，再预测最终返回的最小深度。切换到单孩子链或空树时，答案会随不可变 trace 改变。预测只检查预置参考算法的状态，不能冒充学生源码编译或执行。',
      relatedIds: ['predict-root-null', 'predict-min-result'],
    },
    {
      id: 'reference-min-depth', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '同一份不可变快照同时展示稳定节点 ID、left/right 引用、递归帧、leftDepth、rightDepth 与返回值。下一步、上一步、播放、暂停、重置和输入切换只选择快照；不会执行或追踪学生 Java。特别观察单孩子节点：0 表示该方向没有节点，不是一个可选叶子，所以组合时取非零一侧。树对象图在整个演示中保持不变。',
      relatedIds: [],
    },
    {
      id: 'guided-min-depth', kind: 'guided-code', title: '引导编写 · 基例、缺失孩子和完整方法',
      body: '支架 1 修正空树基例，支架 2 补上缺失孩子分支，支架 3 从方法骨架完整重写。各阶段是静态练习，不用源码字符串与参考答案比较。最终必须把完整 Solution.java 送入真实 runner，由 javac、java 与本站全部用例判定；打印 PASS 不会让错误返回值通过。',
      relatedIds: ['guided-empty-base'],
    },
    {
      id: 'independent-min-depth', kind: 'independent-code', title: '独立模式 · 从 minDepth 方法骨架开始',
      body: '独立模式不预填完整算法。先真实运行空树、单节点、[1,null,2,3] 与左右都有孩子但最近叶较浅的树。若单孩子树返回 1，检查是否直接 Math.min；若总返回最大深度，检查是否无条件 Math.max；若空树异常，先处理 root==null 再访问字段。编辑源码后必须重新提交当前版本，旧请求不能证明新源码通过。',
      relatedIds: [],
    },
    {
      id: 'summary-min-depth', kind: 'summary', title: '复盘 · 最近叶必须是实际节点',
      body: '请解释：为什么 null 孩子不是叶？叶节点的两个子调用都返回 0 时为何自身返回 1？为什么只有一个孩子时取 Math.max、两个孩子都存在时取 Math.min？引用值和递归帧中的 int 分别如何传递？查看答案、引导通过与独立通过本站测试分别记录，播放参考演示不等于代码通过。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'bad37b26b2497a86652ca45fce04557e76f55220253955c88b487cb2fdbd1a34',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-leaf-definition', level: 1, body: '先确认“叶节点”是一个左右孩子都为空的真实节点。某一侧引用为空，不代表当前节点已经是叶。' },
    { id: 'hint-missing-side', level: 2, body: '左右递归结果中有一个为 0 时，最近叶只能在非零的一侧；两个都非零时才选较小值。' },
    { id: 'hint-min-pseudocode', level: 3, body: 'null 返回0；递归求 left 与 right；若 left==0 或 right==0，返回1+max(left,right)；否则返回1+min(left,right)。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null', prompt: '默认输入 [1,2,3,4,null,null,null,5] 的最外层 root 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，root 为 null' }, { id: 'not-null', label: '否，root 指向节点' }],
      explanation: '第一个元素创建根节点 t0，所以最外层参数保存指向 t0 的引用值。', checkpointId: 'root-null-check',
    },
    {
      id: 'predict-min-result', prompt: '默认树的 minDepth 最终返回多少？',
      answer: { kind: 'int', value: 2 },
      explanation: '根的右孩子 3 没有左右孩子，是深度 2 的叶；左侧叶更深。', checkpointId: 'root-return-depth',
    },
  ],
  guided: {
    id: 'guided-111', finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-empty-base', instruction: '支架 1 / 3：空树没有节点，修正错误的基例，并用空树和单节点验证。', checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (root == null) return 0;', 'if (root == null) return 1; // TODO：空树最小深度'),
      },
      {
        id: 'guided-missing-child', instruction: '支架 2 / 3：左右深度已求出。补上“一侧为 0 时沿非零孩子继续”的分支，再测单孩子链。', checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (leftDepth == 0 || rightDepth == 0) {\n            return 1 + Math.max(leftDepth, rightDepth);\n        }', '// TODO：若一侧没有节点，不能把 0 当作最近叶'),
      },
      {
        id: 'guided-whole-method', instruction: '支架 3 / 3：从方法骨架补出基例、两个递归调用与两种组合分支；完整源码提交真实 runner 后才记录引导通过。', checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-naive-min', description: '无条件返回 1+Math.min(leftDepth,rightDepth)。', counterexampleInputId: 'one-child-chain-case', explanation: '根的左侧 0 表示没有节点，不是距离为 0 的叶；应沿右链到真实叶，结果为 3。' },
    { id: 'error-use-maximum', description: '把最大深度算法直接改名，无条件使用 Math.max。', counterexampleInputId: 'balanced-case', explanation: '左孩子 9 在第二层已经是叶，最小深度是 2；Math.max 会沿更深右侧返回 3。' },
    { id: 'error-leaf-value', description: '按节点 val 判断叶或合并相同值节点。', counterexampleInputId: 'repeated-values-case', explanation: '叶由 left/right 是否为 null 决定，与 val 无关；同值节点仍有不同身份和连接关系。' },
    { id: 'error-empty-one', description: '把空树与单节点混淆，空树返回 1。', counterexampleInputId: 'empty-case', explanation: '空树没有节点，所以深度为 0；单节点才是深度 1 的叶。' },
  ],
  testSuite: {
    version: PROBLEM_META['111'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-naive-min', source: NAIVE_MIN_SOURCE, targetedCaseIds: ['one-child-chain-case', 'only-left-case', 'only-right-case'] },
      { id: 'fixture-max-depth', source: MAX_DEPTH_SOURCE, targetedCaseIds: ['near-leaf-case', 'balanced-case'] },
    ],
  },
  visualization: {
    modelId: '111-recursive-min-depth', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
