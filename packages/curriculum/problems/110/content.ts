import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type BalancedLesson = Extract<Lesson, { id: '110' }>;

function leftChain(depth: number): TreeInput['root'] {
  if (depth === 0) return [];
  const root: TreeInput['root'] = [1];
  for (let index = 2; index <= depth; index++) root.push(1, null);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'balanced-branches', title: '两侧高度相差不超过一层', input: { root: [3, 9, 20, null, null, 15, 7] } },
  { id: 'hidden-imbalance', title: '根附近看似平衡，左侧内部失衡', input: { root: [1, 2, 3, 4, null, 6, 7, 5] } },
  { id: 'same-values', title: '相同数值、不同节点对象', input: { root: [1, 1, 1, 1, 1, null, 1] } },
  { id: 'empty-tree', title: '空树的高度是零', input: { root: [] } },
];

const cases: BalancedLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'boolean', value: true }, coverage: '空树高度为 0；本站接纳空树，且它没有失衡节点。' },
  { id: 'single-case', input: { root: [8] }, expected: { kind: 'boolean', value: true }, coverage: '一个节点的左右空子树高度都为 0，返回 true。' },
  { id: 'balanced-branches-case', input: demoInputs[0]!.input, expected: { kind: 'boolean', value: true }, coverage: '两侧孩子与叶子的高度差均不超过 1。' },
  { id: 'root-difference-one-case', input: { root: [1, 2, 3, 4] }, expected: { kind: 'boolean', value: true }, coverage: '根的左右高度差恰为 1，不能误判为失衡。' },
  { id: 'root-difference-two-case', input: { root: [1, 2, null, 3] }, expected: { kind: 'boolean', value: false }, coverage: '根左高度 2、右高度 0，差为 2。' },
  { id: 'hidden-left-imbalance-case', input: demoInputs[1]!.input, expected: { kind: 'boolean', value: false }, coverage: '左内部节点高度差为 2；只检查根节点会漏判。' },
  { id: 'hidden-right-imbalance-case', input: { root: [1, 2, 3, 4, 5, 6, null, null, null, null, null, 7] }, expected: { kind: 'boolean', value: false }, coverage: '右内部节点失衡但根左右整棵子树高度差为 1；忽略右子树的错解失败。' },
  { id: 'same-values-case', input: demoInputs[2]!.input, expected: { kind: 'boolean', value: true }, coverage: '多个值均为 1 的节点各有独立身份，按连接关系而非数值去重。' },
  { id: 'same-values-unbalanced-case', input: { root: [1, 1, 1, 1, null, null, null, 1] }, expected: { kind: 'boolean', value: false }, coverage: '相同值不能把不同深度的节点合并；左侧内部仍失衡。' },
  { id: 'negative-values-case', input: { root: [0, -1, -1, null, -2, -3] }, expected: { kind: 'boolean', value: true }, coverage: '节点值可为负数；平衡只由结构决定。' },
  { id: 'sparse-right-case', input: { root: [4, null, 5, null, 6] }, expected: { kind: 'boolean', value: false }, coverage: '紧凑层序 null 不入队；连续向右两层导致根失衡。' },
  { id: 'depth-limit-case', input: { root: leftChain(128) }, expected: { kind: 'boolean', value: false }, coverage: '本站深度 128 边界供真实 Java 判题；参考演示明确拒绝。' },
];

export const ROOT_ONLY_SOURCE = `class Solution {
    public boolean isBalanced(TreeNode root) {
        if (root == null) return true;
        return Math.abs(height(root.left) - height(root.right)) <= 1;
    }
    private int height(TreeNode node) {
        if (node == null) return 0;
        return 1 + Math.max(height(node.left), height(node.right));
    }
}
`;

export const LEFT_ONLY_SOURCE = `class Solution {
    public boolean isBalanced(TreeNode root) {
        return heightOrFail(root) != -1;
    }
    private int heightOrFail(TreeNode node) {
        if (node == null) return 0;
        int left = heightOrFail(node.left);
        if (left == -1) return -1;
        int right = height(node.right);
        if (Math.abs(left - right) > 1) return -1;
        return 1 + Math.max(left, right);
    }
    private int height(TreeNode node) {
        if (node == null) return 0;
        return 1 + Math.max(height(node.left), height(node.right));
    }
}
`;

export const lesson110 = {
  schemaVersion: 1,
  id: '110',
  slug: 'balanced-binary-tree',
  title: '平衡二叉树',
  order: 49,
  lessonVersion: PROBLEM_META['110'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 对象、引用值、节点的 int 值和递归帧中的局部高度。',
    '从每个节点都要检查的定义推导自底向上高度及 -1 失衡哨兵。',
    '预测中间高度与最终结果，编写完整 Java 并通过本站真实测试。',
  ],
  source: { platform: 'LeetCode', number: 110, url: 'https://leetcode.com/problems/balanced-binary-tree/' },
  taskSemantics: '给定二叉树的根引用 root，判断树中每个节点的左右子树高度差是否都不超过 1。高度按节点层数计，空子树为 0；只检查根节点不够。题意参考 LeetCode 110；本站的题面、讲解、示例与代码均为原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、深度最多 128，节点值 -100—100；root 为紧凑队列式层序，null 孩子不入队，空数组表示空树。参考演示最多 30 个节点、深度 8；真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-balanced-method', kind: 'syntax', title: 'J1 / J2 · boolean 方法、int 高度与返回值',
      body: 'public boolean isBalanced(TreeNode root) 只需要返回 true 或 false；无需自己写 main。辅助方法 heightOrFail 返回 int：非负值代表子树高度，-1 代表该子树某处已失衡。Math.abs(leftHeight-rightHeight) 取高度差的绝对值，比较的是 int 基本值；return 会结束当前递归调用。可信适配器负责构造树并调用 Solution。',
      relatedIds: ['J1', 'J2'],
    },
    {
      id: 'syntax-balanced-tree', kind: 'syntax', title: 'J3 / J7 · TreeNode、null、对象身份和递归帧',
      body: 'root、left、right 存节点引用值或 null；val 才是节点内的 int 基本值。两个 val 都为 1 的节点仍是两个不同对象，图上的 t 编号表示稳定教学身份，不是物理地址。递归调用复制引用值作为参数，每次调用的 leftHeight/rightHeight 是各自独立的局部 int；没有复制整棵树，也没有因变量失去引用就宣称对象已被回收。',
      relatedIds: ['J3', 'J7'],
    },
    {
      id: 'understanding-balanced', kind: 'understanding', title: '读题与手算 · 每个节点都要检查',
      body: '例如 [3,9,20,null,null,15,7]：9、15、7 的左右空子树高度都为 0，节点高度各是 1；20 的左右高度为 1 和 1，20 高度为 2；3 的左右高度为 1 和 2，差为 1，因此返回 true。再看 [1,2,3,4,null,6,7,5]：节点 2 左边 4→5 的高度为 2，右边为空为 0，它已失衡；即使根附近两侧高度看着接近，整棵树仍为 false。null 是缺少节点引用，不是数值为 0 的节点。',
      relatedIds: [],
    },
    {
      id: 'derivation-balanced', kind: 'derivation', title: '推导 · 一次后序遍历传回高度或失败',
      body: '直观办法是在每个节点重新计算左右高度并检查，重复计算可能耗时 O(n²)。改为后序：先得到左子树高度，若为 -1 立刻上传失败；再得到右子树高度，同样检查；二者有效时若差大于 1 返回 -1，否则返回 1+较大高度。由叶子向根归纳，每个非负返回值恰是该子树高度，并保证其中每个已访问节点平衡。任一子树返回 -1 时父节点无需再计算其他分支。最坏访问每个节点一次，时间 O(n)、调用栈 O(h)，不改树的字段。',
      relatedIds: [],
    },
    {
      id: 'prediction-balanced', kind: 'prediction', title: '先预测，再揭示 · 左高度与整树结果',
      body: '默认输入先预测根节点的左子树返回高度，再预测整个 isBalanced 的布尔结果。切换到内部失衡输入，可观察 -1 如何从节点 2 逐帧向上传播。预测只是参考模型的静态教学检查；不会声称是学生 Java 的运行状态。',
      relatedIds: ['predict-root-left-height', 'predict-final-balance'],
    },
    {
      id: 'reference-balanced', kind: 'reference-demo', title: '参考解法 · 递归帧、左右高度与失衡传播',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。同一不可变快照展示树节点稳定 ID、left/right 引用、递归帧、leftHeight、rightHeight 和返回值。前进或后退只切换快照，不修改旧状态。-1 是辅助方法的错误标记，不是树高度；失衡的左子树使 Java 提前返回，不再访问右子树。这一演示与学生源码和学生运行结果是不同通道。',
      relatedIds: [],
    },
    {
      id: 'guided-balanced', kind: 'guided-code', title: '引导编写 · 空树、局部检查、完整实现',
      body: '支架 1 修正空树高度，支架 2 修正“只检查根”的漏洞，支架 3 从方法骨架写出完整辅助方法。各支架仅是静态练习，不用填入字符串是否与参考答案相同来判通过。最后提交整份 Java 源码到真实 runner，javac 编译、java 执行和本站用例共同决定是否记录引导通过。',
      relatedIds: ['guided-null-height'],
    },
    {
      id: 'independent-balanced', kind: 'independent-code', title: '独立模式 · 从方法骨架开始',
      body: '独立模式最初仅有 Solution 和 isBalanced 方法签名，不预填完整答案。先试空树、单节点和根高度差为 2，再试根看似平衡但内部失衡、右侧内部失衡以及重复值。若输出错，用失败用例定位 null 基例、只看根、或 -1 未传播。编辑后必须重新运行当前源码，只有真实通过本站测试才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-balanced', kind: 'summary', title: '复盘 · 局部条件与向上传播',
      body: '请说明：为什么只比较根的两个子树高度不够？-1 为什么不能当成合法高度参与 Math.max？左子树已失衡时，为什么可以不访问右子树？树的引用与递归帧的局部 int 哪些会被复制？查看答案、引导通过、独立通过本站测试分别保存；播放参考动画不证明学生代码正确。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '66e38b6a1f40e020de79600c7dcbee4051b017cf0f5ecfba386db8ce834ae4f9', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-balanced-definition', level: 1, body: '题目要求每个节点都平衡。想一想父节点在判断自己前，需要从两个孩子那里获得什么。' },
    { id: 'hint-balanced-sentinel', level: 2, body: '辅助方法返回子树高度；用一个不可能的高度 -1 表示这棵子树内部已经失衡，并原样向上传。' },
    { id: 'hint-balanced-pseudocode', level: 3, body: '空节点返回 0；递归左，若为 -1 就返回 -1；递归右并同样检查；若高度差大于 1 返回 -1；否则返回 1+两者较大值。外层把结果是否不等于 -1 转成 boolean。' },
  ],
  predictionChecks: [
    { id: 'predict-root-left-height', prompt: '默认树的根节点左子树最终返回高度多少？', answer: { kind: 'int', value: 1 }, explanation: '根的左孩子 9 是叶子，左右空子树高度为 0，向上返回 1。', checkpointId: 'root-left-height' },
    { id: 'predict-final-balance', prompt: '默认整棵树的每个节点是否都平衡？', answer: { kind: 'choice', optionId: 'balanced' }, options: [{ id: 'balanced', label: '平衡' }, { id: 'unbalanced', label: '不平衡' }], explanation: '左子树高度 1，右子树高度 2；根差为 1，内部也均满足条件。', checkpointId: 'final-balance' },
  ],
  guided: {
    id: 'guided-110', finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-null-height', instruction: '支架 1 / 3：null 对应空子树，高度应为 0，不能与失衡哨兵 -1 混淆。修正空树分支，试空树与单节点。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('if (node == null) return 0;', 'if (node == null) return -1; // TODO：空树高度是多少？') },
      { id: 'guided-subtree-failure', instruction: '支架 2 / 3：若左子树已经失衡，父节点应立即传回 -1，不能只比较当前根的高度。', checkKind: 'static-practice', scaffoldSource: REFERENCE_SOURCE.replace('if (leftHeight == -1) return -1;', '// TODO：若左子树返回失衡标记，应立即传回') },
      { id: 'guided-full-method', instruction: '支架 3 / 3：从方法骨架自己写出高度或失败的辅助方法；整份源码提交真实 Java runner 后才记录引导通过。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-root-only', description: '只比较根节点左右子树高度，漏掉内部失衡。', counterexampleInputId: 'hidden-left-imbalance-case', explanation: '节点 2 的左右高度为 2 和 0；根的局部高度差并不能替它完成检查。' },
    { id: 'error-ignore-right-internals', description: '递归检查左子树，却只计算右子树高度而不检查其内部。', counterexampleInputId: 'hidden-right-imbalance-case', explanation: '节点 3 内部已经失衡；它的高度仍可使根左右高度差只有 1。' },
    { id: 'error-empty-height', description: '把空子树高度与失衡哨兵 -1 混淆。', counterexampleInputId: 'empty-case', explanation: '空树没有失衡节点，应返回 true。辅助方法对 null 返回 0；若误返回 -1，外层会把空树判成失衡。' },
    { id: 'error-equal-values', description: '用 val 当节点身份，合并同值节点。', counterexampleInputId: 'same-values-unbalanced-case', explanation: '多个值为 1 的节点对象不同，连接深度也不同；不能按值去重。' },
  ],
  testSuite: {
    version: PROBLEM_META['110'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-root-only', source: ROOT_ONLY_SOURCE, targetedCaseIds: ['hidden-left-imbalance-case', 'hidden-right-imbalance-case'] },
      { id: 'fixture-ignore-right-internals', source: LEFT_ONLY_SOURCE, targetedCaseIds: ['hidden-right-imbalance-case'] },
    ],
  },
  visualization: { modelId: '110-bottom-up-height', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
