import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TreeLesson = Extract<Lesson, { id: '94' }>;

function rightSkewedRoot(depth: number): TreeInput['root'] {
  const root: TreeInput['root'] = depth === 0 ? [] : [1];
  for (let index = 1; index < depth; index++) root.push(null, 1);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'balanced-tree', title: '左子树完成后才轮到根', input: { root: [8, 4, 12, 2, 6, 10, 14] } },
  { id: 'compact-null', title: '有空孩子的紧凑层序树', input: { root: [1, null, 2, 3] } },
  { id: 'repeated-values', title: '节点值相同，身份仍不同', input: { root: [5, 5, 5, 5, null, null, 5] } },
  { id: 'empty-tree', title: '空树直接返回空列表', input: { root: [] } },
];

const cases: TreeLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'int-array', values: [] }, coverage: 'root 为 null 时不创建节点值，也不把 null 当成占位整数。' },
  { id: 'singleton-case', input: { root: [7] }, expected: { kind: 'int-array', values: [7] }, coverage: '单节点的两个空子树都不追加值，根只加入一次。' },
  { id: 'balanced-case', input: demoInputs[0]!.input, expected: { kind: 'int-array', values: [2, 4, 6, 8, 10, 12, 14] }, coverage: '完整平衡树的左根右顺序，能抓出先序和后序。' },
  { id: 'compact-null-case', input: demoInputs[1]!.input, expected: { kind: 'int-array', values: [1, 3, 2] }, coverage: '紧凑层序 [1,null,2,3] 中，3 是节点 2 的左孩子，不能按堆下标解析。' },
  { id: 'repeated-values-case', input: demoInputs[2]!.input, expected: { kind: 'int-array', values: [5, 5, 5, 5, 5] }, coverage: '值相同的五个节点有不同身份，不可用 Set 合并。' },
  { id: 'left-skew-case', input: { root: [1, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [4, 3, 2, 1] }, coverage: '连续左孩子必须逐层走到底，再逆着递归返回访问祖先。' },
  { id: 'right-skew-case', input: { root: [1, null, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [1, 2, 3, 4] }, coverage: '只有右孩子时仍每节点访问一次，不能只走左侧。' },
  { id: 'negative-values-case', input: { root: [0, -2, 3, null, -1, 1, null] }, expected: { kind: 'int-array', values: [-2, -1, 0, 1, 3] }, coverage: '负数与零都是节点的 int 值，不代表空引用。' },
  { id: 'asymmetric-case', input: { root: [9, 1, 8, null, 2, 7, null, null, 3] }, expected: { kind: 'int-array', values: [1, 2, 3, 9, 7, 8] }, coverage: '左右形状不同，检验整个左子树先于根、整个右子树后于根。' },
  { id: 'trailing-null-case', input: { root: [1, 2, 3, null, null] }, expected: { kind: 'int-array', values: [2, 1, 3] }, coverage: '末尾明确给出的空孩子不形成节点，也不会进入列表。' },
  { id: 'depth-limit-case', input: { root: rightSkewedRoot(128) }, expected: { kind: 'int-array', values: Array(128).fill(1) as number[] }, coverage: '本站深度 128 边界参与真实 Java 判题；参考演示单独限制深度 8。' },
];

export const ROOT_FIRST_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
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
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        visit(node.right, result);
        result.add(node.val);
        visit(node.left, result);
    }
}
`;

export const lesson94 = {
  schemaVersion: 1,
  id: '94',
  slug: 'binary-tree-inorder-traversal',
  title: '二叉树的中序遍历',
  order: 38,
  lessonVersion: PROBLEM_META['94'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 引用、节点对象、对象中的 int 值与递归调用帧；相同数值不代表同一节点。',
    '从“左→根→右”推导中序递归，手算不对称树的输出顺序。',
    '先预测参考快照，再从 Java 骨架完成方法并以真实执行检验。',
  ],
  source: { platform: 'LeetCode', number: 94, url: 'https://leetcode.com/problems/binary-tree-inorder-traversal/' },
  taskSemantics: '给定二叉树根节点 root，返回按左子树、当前节点、右子树顺序访问所得的整数列表；空树返回空列表。题意参考 LeetCode 94；本站题面、讲解、示例及代码均为原创，不代表原平台。',
  siteLimits: {
    description: '本站接受至多 1000 个非 null 节点、深度至多 128、节点值 -100—100。输入为紧凑队列式层序数组，null 不入队；空数组为空树。参考演示最多 30 节点、深度 8；超出演示上限的有效输入仍可交给真实 Java 判题。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-tree-list', kind: 'syntax', title: 'J1 / J3 / J5 · 方法、List<Integer> 与对象引用',
      body: 'public List<Integer> inorderTraversal(TreeNode root) 是需要完成的方法，可信调用器负责创建 TreeNode 和调用它，不必写 main。root、left、right 保存引用值或 null；节点的 val 是 int 基本值。List<Integer> 的 Integer 是 int 包装类型，result.add(node.val) 把 int 自动装箱后追加到 ArrayList 对象。返回的是 List，不是输入树的层序数组。两个节点的 val 即使相等，也依然是两个对象。',
      relatedIds: ['J1', 'J3', 'J5'],
    },
    {
      id: 'syntax-recursion', kind: 'syntax', title: 'J7 · 基例、辅助方法与按值传递',
      body: 'visit(node,result) 收到的是两个引用值的副本，不会复制节点或结果列表对象。各递归调用拥有独立的 node 参数和调用帧，多个帧的 result 仍可引用同一个 List，所以 add 会累积结果；把某一帧的 result 重新赋值并不能替换调用者的变量。遇到 node==null 就直接 return；随后才可访问 node.left、node.val、node.right。教学中的节点 ID tN 与调用帧 ID fN 含义不同，也不代表 JVM 地址。',
      relatedIds: ['J7'],
    },
    {
      id: 'understanding-inorder', kind: 'understanding', title: '读题与手算 · 左边做完才到当前节点',
      body: '画出根 8、左右孩子 4 和 12、叶节点 2、6、10、14 的树。从 8 出发先进入 4，再进入 2；2 没有左孩子，于是先写 2，返回写 4，再写 6。整棵左子树结束后写 8，右子树得到 10、12、14，结果 [2,4,6,8,10,12,14]。这棵树恰好像排序结果，但中序并不要求任意输入树已排序；[1,null,2,3] 的结果是 [1,3,2]。null 只表示没有孩子，不进入结果。',
      relatedIds: [],
    },
    {
      id: 'derivation-left-root-right', kind: 'derivation', title: '推导 · add 放在两次递归之间',
      body: '约定 visit(node,result) 把以 node 为根的整棵子树按中序接到已有列表末尾。空子树无需动作；非空时先 visit(node.left,result)，然后 result.add(node.val)，最后 visit(node.right,result)。把 add 移到左调用之前会变成前序；先右后左会颠倒结果。递归展开与返回保证左子树所有节点先于当前节点，且每个节点只添加一次；时间 O(n)，递归栈最多 O(h)，结果列表 O(n)。遍历不修改任何节点字段。',
      relatedIds: [],
    },
    {
      id: 'prediction-inorder', kind: 'prediction', title: '先预测，再揭示 · 空引用与返回顺序',
      body: '第一个检查点预测最外层 visit 的 node 是否为 null；第二个检查点预测完整返回列表。切换演示输入后答案随输入改变：默认树第一个判断为否、结果 [2,4,6,8,10,12,14]，空树第一个判断为是、结果 []。这些是参考算法的教学预测，不能作为学生 Java 已运行的证据。',
      relatedIds: ['predict-root-null', 'predict-result-order'],
    },
    {
      id: 'reference-inorder-demo', kind: 'reference-demo', title: '参考解法 · 对象图、调用帧与结果前缀',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。t0、t1 等是稳定节点身份，f0、f1 等是每次调用的帧；结果前缀以 List 的整数内容显示。推进到 call-left 时当前节点尚未加入列表；左调用结束后 visit-node 才追加当前值。所有变量、树字段、调用帧、结果和代码高亮来自同一不可变快照；后退不会改变之前状态。学生编辑源码不会生成这条参考轨迹。',
      relatedIds: [],
    },
    {
      id: 'guided-inorder', kind: 'guided-code', title: '引导编写 · 基例、顺序、完整方法',
      body: '第一步去掉空子树错误的占位值；第二步将“先根后左”改为“先左后根”；第三步撤去支架，从方法骨架实现完整遍历。中间是静态练习，最终提交的是完整 Solution.java，由真实 Java runner 编译并运行本站用例后才记录引导通过。',
      relatedIds: ['guided-base-fix'],
    },
    {
      id: 'independent-inorder', kind: 'independent-code', title: '独立挑战 · 从骨架写到真实判定',
      body: '独立编辑器从只有签名和 TODO 的骨架开始。先用 [1,null,2,3] 检查 [1,3,2]，再测试空树、左斜树和重复值树。若得到 [1,2,3]，检查是否把 add 写在左递归之前；若空树输出 0，检查 null 基例；若只留下一个 5，检查是否错误去重。运行失败后修改源码并重新提交，只有当前源码的真实结果通过才记录独立通过本站测试。',
      relatedIds: [],
    },
    {
      id: 'summary-inorder', kind: 'summary', title: '复盘 · 访问顺序与证据分层',
      body: '能否解释为何根 8 要等左子树输出 2、4、6 后才加入？为何相同值的节点都要保留？为何 result 参数按值传递引用值仍能向同一列表追加？预测、查看答案、引导通过和独立通过本站测试分别记录；参考状态演示不是学生代码的 JVM 调试，通过本站测试也不宣称通过原平台评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'fc3517965c3236f914f2a67b2bdc2699a1556418b6ee83f0dda96990ffc35ef5',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-empty-base', level: 1, body: '一个 null 孩子是否有可访问的值？让它直接结束这一次辅助调用。' },
    { id: 'hint-order-rule', level: 2, body: '固定 visit 的三段顺序：完整处理左子树，追加当前节点值，再完整处理右子树。' },
    { id: 'hint-pseudocode', level: 3, body: '外层创建 result，visit(root,result)，返回 result。visit 中 if(node==null) return；随后 visit(left)、add(val)、visit(right)。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null', prompt: '默认树的最外层 visit 收到的 node 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，node 为 null' }, { id: 'not-null', label: '否，node 指向根节点' }],
      explanation: '默认输入的 root 指向 t0；切换为空树后此答案会变成“是”。',
      checkpointId: 'root-null-check',
    },
    {
      id: 'predict-result-order', prompt: '默认树的中序结果是什么？按 [1,2] 格式填写。',
      answer: { kind: 'text', value: '[2,4,6,8,10,12,14]' },
      explanation: '先完成左子树得到 2、4、6，再写 8，最后右子树得到 10、12、14；切换输入后动态变化。',
      checkpointId: 'result-return',
    },
  ],
  guided: {
    id: 'guided-94',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-base-fix',
        instruction: '支架 1 / 3：空孩子不是值为 0 的节点。修正 null 分支，并用空树与单节点真实运行。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (node == null) return;', 'if (node == null) { result.add(0); return; } // TODO：空子树不产生输出'),
      },
      {
        id: 'guided-order-fix',
        instruction: '支架 2 / 3：现有顺序是先根后左。把当前节点加入列表的动作挪到左递归之后，再用不对称树检查。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('visit(node.left, result);\n        result.add(node.val);', 'result.add(node.val); // TODO：应在左子调用完成后加入\n        visit(node.left, result);'),
      },
      {
        id: 'guided-whole-method',
        instruction: '支架 3 / 3：从方法骨架实现完整 Java 解法；提交到真实 runner，全部本站用例通过才算引导通过。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'wrong-root-first', description: '把当前值加入放在左递归之前，误写成前序。', counterexampleInputId: 'compact-null-case', explanation: '[1,null,2,3] 的中序是 [1,3,2]，前序会给出 [1,2,3]。' },
    { id: 'wrong-right-first', description: '先进入右子树再访问左子树。', counterexampleInputId: 'asymmetric-case', explanation: '根 9 的左侧 1、2、3 必须先完成，右侧 7、8 在根之后。' },
    { id: 'wrong-null-placeholder', description: '把 null 当值 0 追加。', counterexampleInputId: 'empty-case', explanation: '空树没有节点，输出必须为 []，不能出现任何占位值。' },
    { id: 'wrong-deduplicate', description: '用 Set 或节点值当作身份，合并相同值节点。', counterexampleInputId: 'repeated-values-case', explanation: '五个值为 5 的节点仍须各访问一次，正确列表有五项。' },
    { id: 'wrong-sort', description: '把节点值排序当作中序。', counterexampleInputId: 'compact-null-case', explanation: '[1,null,2,3] 的中序 [1,3,2] 并非有序数组；顺序由树边决定。' },
  ],
  testSuite: {
    version: PROBLEM_META['94'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-root-first', source: ROOT_FIRST_SOURCE, targetedCaseIds: ['balanced-case', 'compact-null-case', 'left-skew-case'] },
      { id: 'fixture-right-first', source: RIGHT_FIRST_SOURCE, targetedCaseIds: ['compact-null-case', 'asymmetric-case', 'negative-values-case'] },
    ],
  },
  visualization: {
    modelId: '94-recursive-inorder', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
