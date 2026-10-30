import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TreeLesson = Extract<Lesson, { id: '145' }>;

function rightSkewedRoot(depth: number): TreeInput['root'] {
  const root: TreeInput['root'] = depth === 0 ? [] : [1];
  for (let index = 1; index < depth; index++) root.push(null, 1);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'balanced-tree', title: '先完成两边，再访问根', input: { root: [8, 4, 12, 2, 6, 10, 14] } },
  { id: 'compact-null', title: '空孩子不产生输出', input: { root: [1, null, 2, 3] } },
  { id: 'repeated-values', title: '相同值对应不同节点', input: { root: [5, 5, 5, 5, null, null, 5] } },
  { id: 'empty-tree', title: '空树的递归基例', input: { root: [] } },
];

const cases: TreeLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'int-array', values: [] }, coverage: '空树直接返回空 List；不能把 null 当作一个输出节点。' },
  { id: 'singleton-case', input: { root: [7] }, expected: { kind: 'int-array', values: [7] }, coverage: '单节点的两个子树先结束，然后才访问该节点一次。' },
  { id: 'balanced-case', input: demoInputs[0]!.input, expected: { kind: 'int-array', values: [2, 6, 4, 10, 14, 12, 8] }, coverage: '完整左右子树和根的顺序，区分后序与先序、中序。' },
  { id: 'compact-null-case', input: demoInputs[1]!.input, expected: { kind: 'int-array', values: [3, 2, 1] }, coverage: '紧凑层序 [1,null,2,3] 中，3 是节点 2 的左孩子，而非根的下标 3 孩子。' },
  { id: 'repeated-values-case', input: demoInputs[2]!.input, expected: { kind: 'int-array', values: [5, 5, 5, 5, 5] }, coverage: '五个独立节点可有相同值；不能用 Set 去重或以值当节点身份。' },
  { id: 'left-skew-case', input: { root: [1, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [4, 3, 2, 1] }, coverage: '单侧左链必须从叶子向根回溯输出。' },
  { id: 'right-skew-case', input: { root: [1, null, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [4, 3, 2, 1] }, coverage: '单侧右链也需要访问到叶子，防止只递归左子树。' },
  { id: 'negative-values-case', input: { root: [0, -2, 3, null, -1, 1, null] }, expected: { kind: 'int-array', values: [-1, -2, 1, 3, 0] }, coverage: '节点值可为零或负数；数值并不决定是否为空，也不决定访问顺序。' },
  { id: 'asymmetric-case', input: { root: [9, 1, 8, null, 2, 7, null, null, 3] }, expected: { kind: 'int-array', values: [3, 2, 1, 7, 8, 9] }, coverage: '不对称两边都必须完全结束，才可以追加根 9。' },
  { id: 'trailing-null-case', input: { root: [1, 2, 3, null, null] }, expected: { kind: 'int-array', values: [2, 3, 1] }, coverage: '显式末尾 null 是空孩子，不生成占位输出或节点。' },
  { id: 'depth-limit-case', input: { root: rightSkewedRoot(128) }, expected: { kind: 'int-array', values: Array(128).fill(1) as number[] }, coverage: '真实判题涵盖本站深度 128 边界；参考动画受较小显示上限约束。' },
];

export const PREORDER_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> postorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        result.add(node.val);
        visit(node.left, result);
        visit(node.right, result);
    }
}
`;

export const RIGHT_FIRST_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> postorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        visit(node.right, result);
        visit(node.left, result);
        result.add(node.val);
    }
}
`;

export const lesson145 = {
  schemaVersion: 1,
  id: '145',
  slug: 'binary-tree-postorder-traversal',
  title: '二叉树的后序遍历',
  order: 41,
  lessonVersion: PROBLEM_META['145'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J7', 'J8'],
  objectives: [
    '分清 int 节点值、TreeNode 引用和具有独立身份的树节点对象。',
    '从“左→右→根”推导递归基例和回溯时的输出顺序。',
    '预测参考快照后，从方法骨架写 Java，并用真实运行结果定位错误。',
  ],
  source: { platform: 'LeetCode', number: 145, url: 'https://leetcode.com/problems/binary-tree-postorder-traversal/' },
  taskSemantics: '给定二叉树根节点，返回按左子树、右子树、当前节点顺序访问得到的整数列表；空树返回空列表。题意参考 LeetCode 145；本站题面、讲解、示例和代码为原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、深度最多 128、节点值 -100—100。输入是紧凑队列式层序序列，空数组表示空树，null 孩子不入队。参考演示最多 30 节点、深度 8；真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-postorder-tree', kind: 'syntax', title: 'J1 / J3 / J5 · 方法、列表与树节点',
      body: '方法 public List<Integer> postorderTraversal(TreeNode root) 返回整数列表。root 保存一个 TreeNode 引用值或 null；节点对象的 val 是 int 基本值，left 和 right 是引用字段。两个节点可以都保存值 5，但仍是两个对象。List<Integer> 使用包装类型 Integer；result.add(node.val) 自动装箱后在列表尾部添加一个值。new ArrayList<>() 创建列表对象。可信调用器构造树并提供 TreeNode；这里只写 Solution.java 的方法，不写 main。',
      relatedIds: ['J1', 'J3', 'J5'],
    },
    {
      id: 'syntax-postorder-recursion', kind: 'syntax', title: 'J7 / J8 · 递归调用与返回',
      body: 'visit(node,result) 是 void 辅助方法。Java 把实参中的引用值复制给每个调用帧的形参：不复制树节点或列表对象；所有帧的 result 仍可指向同一个 List，因此 add 会持续追加。某一帧把 result 变量改指向另一个列表，不会重绑定调用者变量。每帧有自己的 node，遇到 null 立即 return，表示空子树无需访问。外层方法在 visit 结束后 return result。节点身份 tN 与调用帧身份 fN 是不同概念。',
      relatedIds: ['J7', 'J8'],
    },
    {
      id: 'understanding-postorder', kind: 'understanding', title: '读题与手算 · 根节点最后出现',
      body: '手算 [8,4,12,2,6,10,14]：左子树先得到 2、6、4；右子树得到 10、14、12；根 8 最后加入，所以返回 [2,6,4,10,14,12,8]。这不是层序输入的反向，也不是数值排序。对于 [1,null,2,3]，紧凑队列层序表示节点 2 的左孩子为 3；依次访问 3、2、1。null 只是空孩子引用，不创建节点。',
      relatedIds: [],
    },
    {
      id: 'derivation-postorder', kind: 'derivation', title: '推导 · 两侧完成后才追加当前节点',
      body: '约定 visit(node,result) 把 node 所在子树的后序值追加到同一个列表。若 node==null 就返回；否则完整执行 visit(node.left,result)，再完整执行 visit(node.right,result)，最后 result.add(node.val)。放在左、右调用之间变成中序；放在调用之前变成先序；先右后左会颠倒子树顺序。归纳地，每次追加一个真实节点时，它的左右后代都已追加且该节点只追加一次。时间 O(n)；递归同时持有的帧占 O(h)，结果列表另占 O(n)，h 是树高。算法不改写原树字段。',
      relatedIds: [],
    },
    {
      id: 'prediction-postorder', kind: 'prediction', title: '先预测，再揭示 · 空引用与最终顺序',
      body: '第一处在最外层 null 判断处先猜 node 是否为空；第二处在返回前先写完整输出。输入切换后答案随参考树重新计算，例如空树的答案是“是”和 []。预测是教学检查，不是学生 Java 的真实运行。',
      relatedIds: ['predict-root-null', 'predict-result-order'],
    },
    {
      id: 'reference-postorder-demo', kind: 'reference-demo', title: '参考解法 · 左、右、根的不可变状态快照',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表显示当前帧 node 指向哪个稳定 ID，树图保留各节点的 left/right 连接，输出前缀显示已追加值。即使两个节点同值也保留两个对象。快照在进入子树、检查 null、返回及追加时生成；前进、后退、播放、暂停、重置和切换输入读取同一份不可变状态。它不展示学生源码的执行轨迹，也不暗示变量不再指向对象就表示对象被回收。',
      relatedIds: [],
    },
    {
      id: 'guided-postorder', kind: 'guided-code', title: '引导补全 · 基例、访问位置、完整方法',
      body: '先修复空引用时错误添加 0；再把过早添加当前值的动作挪到左右递归之后；最后从方法骨架写出完整解法。每段支架用来聚焦一处推理，不能靠填入字符串和答案相同来宣称通过。最终提交完整 Solution.java 到真实 Java runner，由 javac、java 和本站测试判定引导通过。',
      relatedIds: ['guided-null-base'],
    },
    {
      id: 'independent-postorder', kind: 'independent-code', title: '独立编写 · 从方法骨架开始',
      body: '独立模式不预填完整参考答案。先想清楚空树返回什么，再在平衡树上观察根 8 是否最后输出；用重复值输入检查是否错误去重。若输出是 [8,4,2,6,12,10,14]，应检查 add 是否写在递归之前；若是 [10,14,12,2,6,4,8]，应检查左右子树顺序。编辑后重新运行，只有当前源码真实通过本站测试才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-postorder', kind: 'summary', title: '复盘 · 回溯、引用和证据',
      body: '能否说明为什么根必须在两边之后加入？为什么值相同的五个节点仍输出五次？为什么传递 result 引用能让不同递归帧持续修改同一个列表？查看答案、预测完成、引导通过与独立通过本站测试是不同学习记录。参考动画不是学生代码调试；本站测试结果不代表 LeetCode 官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'aff199590eb4c1b64d64c04cc4a5a7f4b8236c721add10be4816606279b058c9',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-postorder-base', level: 1, body: '先处理空孩子：它没有 val，也不占据结果列表的位置。辅助方法在这里应做什么？' },
    { id: 'hint-postorder-order', level: 2, body: '把“左子树全部结束”“右子树全部结束”“追加当前节点值”写成三个连续动作，根在最后。' },
    { id: 'hint-postorder-pseudocode', level: 3, body: '外层创建 result 并调用 visit(root,result)。visit 中先判断 null；非空时依次 visit(left)、visit(right)、add(node.val)，最后外层 return result。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null', prompt: '默认树的最外层辅助方法收到的 node 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，node 为 null' }, { id: 'not-null', label: '否，node 指向根节点' }],
      explanation: '默认输入根是独立节点 t0；切换到空树时，最外层参数为 null，预测答案会改变。',
      checkpointId: 'root-null-check',
    },
    {
      id: 'predict-result-order', prompt: '默认树的完整后序结果是什么？按 [1,2] 格式填写。',
      answer: { kind: 'text', value: '[2,6,4,10,14,12,8]' },
      explanation: '先完成左子树 2、6、4，再完成右子树 10、14、12，最后访问根 8；切换输入后动态变化。',
      checkpointId: 'result-return',
    },
  ],
  guided: {
    id: 'guided-145',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-null-base',
        instruction: '支架 1 / 3：空孩子不应该输出 0。修正 null 分支，再真实运行空树和单节点。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (node == null) return;', 'if (node == null) { result.add(0); return; } // TODO：空孩子不产生输出'),
      },
      {
        id: 'guided-visit-order',
        instruction: '支架 2 / 3：当前代码过早输出当前节点。把 add 移到左右递归之后，再用平衡树验证根是否最后出现。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('visit(node.right, result);\n        result.add(node.val);', 'result.add(node.val); // TODO：当前节点应在两侧之后追加\n        visit(node.right, result);'),
      },
      {
        id: 'guided-whole-method',
        instruction: '支架 3 / 3：从方法骨架补完整个递归算法；只有完整 Java 在真实 runner 通过本站用例才记录引导通过。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'wrong-preorder', description: '先追加当前节点再递归，误写成先序。', counterexampleInputId: 'balanced-case', explanation: '平衡树首项会变成 8，但后序根 8 应为最后一项。' },
    { id: 'wrong-right-first', description: '先递归右边再递归左边。', counterexampleInputId: 'asymmetric-case', explanation: '正确输出应先完成左侧的 3、2、1，再进入右侧 7、8。' },
    { id: 'wrong-null-placeholder', description: '把 null 当成值为 0 的节点追加。', counterexampleInputId: 'empty-case', explanation: '空树的结果是 []，null 不创建 TreeNode。' },
    { id: 'wrong-deduplicate', description: '按 val 去重，合并相同值的节点。', counterexampleInputId: 'repeated-values-case', explanation: '每个独立节点都访问一次，五个值为 5 的节点仍应输出五个 5。' },
    { id: 'wrong-list-rebinding', description: '在 visit 内将 result 重绑定到新的列表，误以为外层会跟着改变。', counterexampleInputId: 'singleton-case', explanation: 'Java 参数按值传递，重绑定局部引用变量不会改变外层 result 的绑定。' },
  ],
  testSuite: {
    version: PROBLEM_META['145'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-preorder', source: PREORDER_SOURCE, targetedCaseIds: ['balanced-case', 'compact-null-case', 'asymmetric-case'] },
      { id: 'fixture-right-first', source: RIGHT_FIRST_SOURCE, targetedCaseIds: ['balanced-case', 'asymmetric-case', 'negative-values-case'] },
    ],
  },
  visualization: {
    modelId: '145-recursive-postorder', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
