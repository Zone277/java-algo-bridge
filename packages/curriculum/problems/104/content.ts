import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TreeLesson = Extract<Lesson, { id: '104' }>;

function rightSkewedRoot(depth: number): TreeInput['root'] {
  const root: TreeInput['root'] = depth === 0 ? [] : [1];
  for (let value = 2; value <= depth; value++) root.push(null, ((value - 1) % 201) - 100);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'compact-null', title: '紧凑层序：右子树再向左', input: { root: [1, null, 2, 3] } },
  { id: 'balanced-tree', title: '左右高度相同', input: { root: [3, 9, 20, null, null, 15, 7] } },
  { id: 'repeated-values', title: '重复值、不同节点身份', input: { root: [5, 5, 5, 5, null, null, 5] } },
  { id: 'empty-tree', title: '空树与 null 基例', input: { root: [] } },
];

const cases: TreeLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'int', value: 0 }, coverage: '空树直接命中 root==null 基例，深度是 0。' },
  { id: 'singleton-case', input: { root: [7] }, expected: { kind: 'int', value: 1 }, coverage: '单节点的两个子调用都返回 0，当前节点贡献一层。' },
  { id: 'balanced-case', input: demoInputs[1]!.input, expected: { kind: 'int', value: 3 }, coverage: '左右子树同深，验证完整递归和 Math.max。' },
  { id: 'compact-null-case', input: demoInputs[0]!.input, expected: { kind: 'int', value: 3 }, coverage: '紧凑队列层序中的 [1,null,2,3]；3 是节点 2 的左孩子，不能按堆下标解释。' },
  { id: 'repeated-values-case', input: demoInputs[2]!.input, expected: { kind: 'int', value: 3 }, coverage: '五个节点含重复值；值相同的节点仍有各自身份与字段。' },
  { id: 'left-skew-case', input: { root: [1, 2, null, 3, null, 4] }, expected: { kind: 'int', value: 4 }, coverage: '纯左偏斜树，最大深度沿连续左引用增长。' },
  { id: 'right-skew-case', input: { root: [1, null, 2, null, 3, null, 4] }, expected: { kind: 'int', value: 4 }, coverage: '纯右偏斜树，抓住只递归一侧或固定取左侧的错误。' },
  { id: 'asymmetric-case', input: { root: [8, 4, 12, 2, 6, null, 14, 1] }, expected: { kind: 'int', value: 4 }, coverage: '左右高度不同，必须取较大值，Math.min 会返回过小结果。' },
  { id: 'negative-values-case', input: { root: [-1, -2, -3, null, -4] }, expected: { kind: 'int', value: 3 }, coverage: '节点值可为负；深度只由引用结构决定。' },
  { id: 'trailing-null-case', input: { root: [1, 2, 3, null, null] }, expected: { kind: 'int', value: 2 }, coverage: '末尾 null 可省略，验证等价紧凑表示不会增加层数。' },
  { id: 'depth-limit-case', input: { root: rightSkewedRoot(128) }, expected: { kind: 'int', value: 128 }, coverage: '本站允许的最大深度边界；它用于真实判定，不放入可视化输入。' },
];

export const EDGE_COUNT_SOURCE = `class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return -1;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
`;

export const MIN_DEPTH_SOURCE = `class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);
        return 1 + Math.min(leftDepth, rightDepth);
    }
}
`;

export const lesson104 = {
  schemaVersion: 1,
  id: '104',
  slug: 'maximum-depth-of-binary-tree',
  title: '二叉树的最大深度',
  order: 8,
  lessonVersion: PROBLEM_META['104'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 变量、节点对象、left/right 字段和 null。',
    '从深度定义推导 null=0 与 1+max(左深度,右深度) 的递归解法。',
    '借助独立调用栈帧预测递归返回值，并用真实 Java runner 修正实现。',
  ],
  source: { platform: 'LeetCode', number: 104, url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  taskSemantics: '给定二叉树根节点 root，返回从根到最远叶子路径上的节点数；空树深度为 0。本站输入使用紧凑队列式层序序列，题意参考 LeetCode 104，文字、例子、图形与代码均为本站原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站树最多 1000 个非 null 节点、深度最多 128，节点值为 -100—100；空数组表示空树。输入按紧凑队列式层序解析，演示只接受深度不超过 8 的预置输入。真实 runner 由可信适配器创建 TreeNode 对象，学生只实现 maxDepth。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-tree-reference', kind: 'syntax', title: 'J1 / J3 · 方法、TreeNode 引用与 null',
      body: '方法签名是 public int maxDepth(TreeNode root)。root 是 TreeNode 类型的变量，保存一个引用值或 null；节点对象含 int val、TreeNode left、TreeNode right 三个字段。val 是基本类型值，left/right 分别保存另一个节点的引用值或 null。值相同不代表对象相同，例如两个 val 都为 5 的孩子仍是两个节点。把变量设为 null 只改变变量中的引用值，不能据此声称对象已被垃圾回收。平台已提供 TreeNode 类并构造输入，Solution.java 不要再声明 TreeNode、main 或读取控制台。',
      relatedIds: ['J1', 'J3'],
    },
    {
      id: 'syntax-recursion-frame', kind: 'syntax', title: 'J2 / J7 / J8 · 递归、独立栈帧与返回值',
      body: 'Java 方法参数按值传递：调用 maxDepth(root.left) 时，把 left 字段中的引用值复制给新调用的参数 root，并没有复制整棵子树。每次调用都有独立栈帧，分别保存自己的 root、leftDepth、rightDepth 和返回位置；子调用结束后，父调用从等待处恢复。return 0 会把 int 基本值交回调用者并结束当前帧。递归必须有能直接返回的基例，否则会不断调用直至 StackOverflowError。参考状态表按栈底到栈顶显示 f0、f1……；这些帧 ID 与节点 ID t0、t1……是两类身份。',
      relatedIds: ['J2', 'J7', 'J8'],
    },
    {
      id: 'understanding-compact-tree', kind: 'understanding', title: '读题与手算 · 紧凑队列层序不是堆下标',
      body: `本站用队列依次给每个“真实父节点”读取左、右孩子；null 不进入父节点队列。因此 [1,null,2,3] 表示：节点1左边为空、右边是节点2；接着给节点2读孩子，3 成为它的左孩子，所以最大深度是 3。不能套用数组堆的 2*i+1/2*i+2 下标，否则会把 3 误判为孤立数据。像 [1,null,null,2] 这样的输入在根已无待处理孩子后仍有 2，属于孤立数据，会在运行请求前被拒绝。
手算自底向上：节点3的两个空孩子都返回0，所以节点3返回1；节点2取 max(1,0) 再加1，返回2；节点1取 max(0,2) 再加1，返回3。这里数的是节点层数，不是边数。`,
      relatedIds: [],
    },
    {
      id: 'derivation-depth-recurrence', kind: 'derivation', title: '推导 · 先定义子问题，再组合返回值',
      body: `把 maxDepth(node) 定义成“以 node 为根的树的最大节点层数”。若 node==null，树中没有节点，答案为0，这同时终止递归。若 node 非空，最深路径要么经过左孩子，要么经过右孩子；两个子调用分别给出 leftDepth 与 rightDepth，当前节点再贡献一层，所以返回 1+Math.max(leftDepth,rightDepth)。
参考递归访问每个节点一次，时间 O(n)。同时存在的栈帧数量等于树高 h，额外调用栈空间 O(h)；本站不会根据一次运行的毫秒数宣称已经证明复杂度。TreeNode 的 left/right 字段在求深度时全程不修改。`,
      relatedIds: [],
    },
    {
      id: 'prediction-recursion-return', kind: 'prediction', title: '先预测 root 基例，再预测总返回值',
      body: '默认输入是 [1,null,2,3]。第一处检查点先判断最外层 root 是否为 null；第二处在左右递归返回后预测 f0 的最终 int 返回值。切换到空树时，同两个检查点会动态变为“是”和 0。必须先提交预测才会揭示答案；预测只核对参考状态，不表示学生 Java 已通过。',
      relatedIds: ['predict-root-null', 'predict-root-depth'],
    },
    {
      id: 'reference-recursion-demo', kind: 'reference-demo', title: '参考解法 · 树对象与调用栈演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。同一个不可变快照同时提供树节点、left/right 引用、变量和栈帧；前进、后退、播放、暂停或重置只是在快照间选择。节点 ID t0…按构造身份稳定，重复值不会合并。调用帧 ID f0…独立显示 enter、await-left、await-right、return；空子调用有自己的帧并返回0，却没有虚构节点。树对象字段从初始到结束不变，后退能恢复当时完整引用与帧状态。学生源码不能改变参考演示。',
      relatedIds: [],
    },
    {
      id: 'guided-recursive-code', kind: 'guided-code', title: '引导编写 · 从基例到完整方法',
      body: '第一步修正空树基例，第二步补左右深度的组合式，第三步撤去支架并从方法骨架重写。静态练习只检查你是否完成本阶段，不比较源码和参考答案。最后会把完整 Solution.java 交给真实 runner：可信适配器建立二叉树、调用 maxDepth 并按真实 int 返回值判定，stdout 中打印 PASS 不会通过。',
      relatedIds: ['guided-base-case'],
    },
    {
      id: 'independent-max-depth', kind: 'independent-code', title: '独立挑战 · 只从方法骨架开始',
      body: '独立模式只给 Solution 和 maxDepth 签名，不预填递归式。先用空树、单节点和 [1,null,2,3] 分别真实运行，再提交全部本站测试。若单节点返回0，你可能在数边；若偏斜树返回1，检查是否误用 Math.min；若出现 StackOverflowError，确认 null 分支在递归调用之前 return。只有完整源码真实提交全部通过才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-tree-depth', kind: 'summary', title: '复盘 · 对象图与调用栈各回答一个问题',
      body: `请用自己的话回答：为什么值相同的节点不能共用身份？为什么 null 子树深度是0？父调用等待左子调用时保存了哪些局部状态？为什么最终要加当前节点这一层？
本站分别记录预测、提示、查看答案、引导通过和独立模式通过。播放完参考动画不等于掌握，本站测试也不是 LeetCode 官方评测。`,
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '8b692e8ac034b6170355075c2c7642cb53889763dc3c27c35d514d5fcd5fd354',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-depth-base', level: 1, body: '先只考虑没有节点的子树：root==null 时路径上有几个节点？让这个答案同时成为递归终点。' },
    { id: 'hint-depth-combine', level: 2, body: '分别递归得到 root.left 与 root.right 的深度；最大深度应选较大的那一边，再计入当前 root。' },
    { id: 'hint-depth-pseudocode', level: 3, body: '若 root==null，return 0；否则 left=maxDepth(root.left)，right=maxDepth(root.right)，return 1+Math.max(left,right)。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null',
      prompt: '默认输入 [1,null,2,3] 中，最外层调用的 root 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，root 为 null' }, { id: 'not-null', label: '否，root 指向节点' }],
      explanation: '紧凑层序的第一个元素1创建根节点，所以 f0 的 root 指向 t0。切换为空数组后答案会动态变为“是”。',
      checkpointId: 'root-null-check',
    },
    {
      id: 'predict-root-depth',
      prompt: '默认输入 [1,null,2,3] 的最外层 maxDepth 最终返回多少？',
      answer: { kind: 'int', value: 3 },
      explanation: '节点3返回1，节点2返回2，节点1返回3；深度按节点层数计算。',
      checkpointId: 'root-return-depth',
    },
  ],
  guided: {
    id: 'guided-104',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-base-case',
        instruction: '支架 1 / 3：把错误的空树返回值 -1 改为按节点层数定义的基例。先真实运行空树和单节点。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (root == null) return 0;', 'if (root == null) return -1; // TODO：空树的节点层数'),
      },
      {
        id: 'guided-combine-depths',
        instruction: '支架 2 / 3：左右递归结果已经保存。把占位返回值改成“当前一层 + 较深子树”。',
        checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);
        return 0; // TODO：组合左右子树深度
    }
}
`,
      },
      {
        id: 'guided-whole-recursion',
        instruction: '支架 3 / 3：从方法骨架独立补出基例、两个子调用和返回式；完整源码真实提交通过后才记录引导通过。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    {
      id: 'edge-count-base', description: '把空树返回 -1，实际求得边数而题目要求节点层数。', counterexampleInputId: 'singleton-case',
      explanation: '单节点到自身包含1个节点却有0条边。null=-1 的写法让单节点返回0；本站定义要求 null=0、单节点=1。',
    },
    {
      id: 'minimum-instead-maximum', description: '使用 Math.min 选择较浅子树。', counterexampleInputId: 'compact-null-case',
      explanation: '[1,null,2,3] 的左深度0、右深度2。Math.min 会让根只返回1，必须用 Math.max 选择最远叶子路径。',
    },
    {
      id: 'add-subtree-depths', description: '把左右深度相加，误把两条分支拼成一条根到叶路径。', counterexampleInputId: 'balanced-case',
      explanation: '根到叶路径只能选择左或右一侧；平衡示例两边深度都是2，1+2+2 会错误返回5，正确结果是1+max(2,2)=3。',
    },
    {
      id: 'missing-null-return', description: '在检查 null 之前访问 root.left 或继续递归。', counterexampleInputId: 'empty-case',
      explanation: '空树的 root 没有对象可解引用，访问字段会抛 NullPointerException；不终止的递归还可能触发 StackOverflowError。',
    },
    {
      id: 'heap-index-parsing', description: '把紧凑队列层序误当成完全二叉树的堆数组下标。', counterexampleInputId: 'compact-null-case',
      explanation: '学生方法收到的已经是 TreeNode；无需解析数组。[1,null,2,3] 中3是节点2的左孩子，深度为3。',
    },
  ],
  testSuite: {
    version: PROBLEM_META['104'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-edge-count', source: EDGE_COUNT_SOURCE, targetedCaseIds: ['empty-case', 'singleton-case', 'balanced-case'] },
      { id: 'wrong-min-depth', source: MIN_DEPTH_SOURCE, targetedCaseIds: ['compact-null-case', 'asymmetric-case', 'left-skew-case'] },
    ],
  },
  visualization: {
    modelId: '104-recursive-tree-depth', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
