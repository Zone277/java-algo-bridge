import { PROBLEM_META, type Lesson, type TreeInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type TreeLesson = Extract<Lesson, { id: '144' }>;

function rightSkewedRoot(depth: number): TreeInput['root'] {
  const root: TreeInput['root'] = depth === 0 ? [] : [1];
  for (let index = 1; index < depth; index++) root.push(null, 1);
  return root;
}

export const demoInputs: { id: string; title: string; input: TreeInput }[] = [
  { id: 'balanced-tree', title: '根、左子树、右子树的完整顺序', input: { root: [8, 4, 12, 2, 6, 10, 14] } },
  { id: 'compact-null', title: '紧凑层序与空孩子', input: { root: [1, null, 2, 3] } },
  { id: 'repeated-values', title: '重复值但节点身份不同', input: { root: [5, 5, 5, 5, null, null, 5] } },
  { id: 'empty-tree', title: '空树与递归基例', input: { root: [] } },
];

const cases: TreeLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'int-array', values: [] }, coverage: '空树直接命中基例，返回空 List；不能加入 null 或占位整数。' },
  { id: 'singleton-case', input: { root: [7] }, expected: { kind: 'int-array', values: [7] }, coverage: '单节点只访问自己一次，两个空子调用不能重复加入值。' },
  { id: 'balanced-case', input: demoInputs[0]!.input, expected: { kind: 'int-array', values: [8, 4, 2, 6, 12, 10, 14] }, coverage: '左右分支齐全且值不同，能抓出中序、后序或先右后左。' },
  { id: 'compact-null-case', input: demoInputs[1]!.input, expected: { kind: 'int-array', values: [1, 2, 3] }, coverage: '紧凑队列层序 [1,null,2,3] 中，3 是节点2的左孩子，不能按堆下标解析。' },
  { id: 'repeated-values-case', input: demoInputs[2]!.input, expected: { kind: 'int-array', values: [5, 5, 5, 5, 5] }, coverage: '五个值相同但身份不同的节点都必须保留并访问一次。' },
  { id: 'left-skew-case', input: { root: [1, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [1, 2, 3, 4] }, coverage: '只有左边连续有节点，null 子调用不会截断后续左孩子。' },
  { id: 'right-skew-case', input: { root: [1, null, 2, null, 3, null, 4] }, expected: { kind: 'int-array', values: [1, 2, 3, 4] }, coverage: '只有右边连续有节点，能抓出只递归左侧的错误。' },
  { id: 'negative-values-case', input: { root: [0, -2, 3, null, -1, 1, null] }, expected: { kind: 'int-array', values: [0, -2, -1, 3, 1] }, coverage: '零和负值都是合法的 int 节点值，不代表 null，也不能按值排序。' },
  { id: 'asymmetric-case', input: { root: [9, 1, 8, null, 2, 7, null, null, 3] }, expected: { kind: 'int-array', values: [9, 1, 2, 3, 8, 7] }, coverage: '左右子树形状不对称，验证先完成整棵左子树，再进入右子树。' },
  { id: 'trailing-null-case', input: { root: [1, 2, 3, null, null] }, expected: { kind: 'int-array', values: [1, 2, 3] }, coverage: '末尾 null 可显式写出；它不产生节点，也不影响先序结果。' },
  { id: 'depth-limit-case', input: { root: rightSkewedRoot(128) }, expected: { kind: 'int-array', values: Array(128).fill(1) as number[] }, coverage: '本站允许的深度 128 边界进入真实判题；它超出参考演示上限，不能截断后假装完整演示。' },
];

export const INORDER_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        visit(node.left, result);
        result.add(node.val);
        visit(node.right, result);
    }
}
`;

export const RIGHT_FIRST_SOURCE = `import java.util.*;
class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        visit(root, result);
        return result;
    }
    private void visit(TreeNode node, List<Integer> result) {
        if (node == null) return;
        result.add(node.val);
        visit(node.right, result);
        visit(node.left, result);
    }
}
`;

export const lesson144 = {
  schemaVersion: 1,
  id: '144',
  slug: 'binary-tree-preorder-traversal',
  title: '二叉树的前序遍历',
  order: 37,
  lessonVersion: PROBLEM_META['144'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J7', 'J8'],
  objectives: [
    '区分 TreeNode 引用、节点对象、对象字段与节点的 int 值；重复值不合并对象。',
    '从“根→左→右”推导递归基例和访问顺序，并手算输出 List。',
    '用不可变参考快照预测访问结果，再独立写 Java 并通过真实本地测试。',
  ],
  source: { platform: 'LeetCode', number: 144, url: 'https://leetcode.com/problems/binary-tree-preorder-traversal/' },
  taskSemantics: '给定二叉树根节点 root，返回按根节点、左子树、右子树顺序访问得到的整数列表。空树返回空列表。题意参考 LeetCode 144；本站题面、示例、图形和代码为原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、深度最多 128、节点值 -100—100；空数组表示空树。输入按紧凑队列式层序解析，null 不入队。参考演示最多 30 节点、深度 8，真实 Java 判题仍接受本站全部有效输入。',
    inputSchemaId: 'TreeInput',
  },
  steps: [
    {
      id: 'syntax-tree-list', kind: 'syntax', title: 'J1 / J3 / J5 · 方法、List<Integer> 与引用',
      body: '签名 public List<Integer> preorderTraversal(TreeNode root) 表示返回整数列表。TreeNode 是对象类型；root 变量保存引用值或 null，节点的 val 是 int 基本值，left/right 字段保存引用值或 null。List<Integer> 中 Integer 是 int 的包装类型；result.add(node.val) 会自动装箱并把值追加到列表。new ArrayList<>() 创建列表对象；不能把 List 误写成 int[]。可信调用器已经提供 TreeNode 并建立输入树，Solution.java 只需实现方法，不写 main。',
      relatedIds: ['J1', 'J3', 'J5'],
    },
    {
      id: 'syntax-recursion-alias', kind: 'syntax', title: 'J7 · 辅助方法、按值传递与栈帧',
      body: 'visit(node, result) 的两个实参都是引用值，Java 把各自的引用值复制给新栈帧参数，不复制节点或列表对象。多个递归帧中的 result 可指向同一个 List，因此 add 修改的是该 List；只把某个帧的 result 重新赋值为 new ArrayList<>() 不会改变调用者变量指向的对象。void 辅助方法不返回列表，外层方法最后 return result。每个递归帧有自己的 node，遇到 null 必须立即 return；节点 ID tN 和调用帧 ID fN 不相同。',
      relatedIds: ['J7'],
    },
    {
      id: 'understanding-preorder', kind: 'understanding', title: '读题与手算 · 先访问根，再完整访问左边',
      body: '例如输入 [8,4,12,2,6,10,14]：先把根 8 加入结果；进入左子树，把 4 加入，再访问 2、6；左子树全部结束后才进入右子树，依次加入 12、10、14。结果为 [8,4,2,6,12,10,14]。列表的顺序是访问顺序，不是把节点值排序。本站输入中的 null 表示某个孩子引用为空；它不创建节点也不出现在返回列表。紧凑层序 [1,null,2,3] 中，3 是节点2的左孩子，不能用完全二叉树堆下标解读。',
      relatedIds: [],
    },
    {
      id: 'derivation-root-left-right', kind: 'derivation', title: '推导 · 在递归调用前追加当前值',
      body: '定义 visit(node,result) 为“把以 node 为根的子树按前序追加到同一个结果列表”。若 node==null，子树没有节点，直接返回；否则先 result.add(node.val)，再 visit(node.left,result)，最后 visit(node.right,result)。把 add 放在左调用之后会变成中序；把右调用放在左调用之前会变成根→右→左。每个真实节点恰好追加一次，时间 O(n)；递归同时存在的帧数至多树高 h，另外结果列表占 O(n) 空间。树的 left/right 字段在遍历时不修改。',
      relatedIds: [],
    },
    {
      id: 'prediction-root-output', kind: 'prediction', title: '先预测根是否为空，再预测完整输出顺序',
      body: '第一个检查点在最外层 visit 的 null 判断处，预测 node 是否为 null；第二个检查点在返回结果时，写出完整列表顺序。默认平衡树结果不是层序列表；切换到空树会动态得到“是”和 []。预测是参考算法的静态教学检查，不表示学生源码已编译执行。',
      relatedIds: ['predict-root-null', 'predict-result-order'],
    },
    {
      id: 'reference-preorder-demo', kind: 'reference-demo', title: '参考解法 · 对象图、递归帧与输出前缀',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。每一帧只记录当前 node 引用和访问阶段；t0、t1…是稳定的教学节点身份，即使值相同也分别显示。输出前缀以数组形状抽象展示 List 的当前内容，不是把树数组反转或声称在调试任意 Java。前进、后退、播放与切换输入都从同一不可变快照读取节点字段、帧和结果；对象图不因变量不再引用而消失。',
      relatedIds: [],
    },
    {
      id: 'guided-preorder-code', kind: 'guided-code', title: '引导编写 · 基例、顺序、完整方法',
      body: '第一步修正 null 分支，不把占位值 0 加入结果；第二步把 add 移到左子树调用之前；第三步撤去支架，从方法骨架补出 List 创建、辅助递归和 return。支架只辅助思考，静态阶段检查不把字符串相似性当作通过。最终必须将完整 Solution.java 送入真实 Java runner，经 javac、java 与本站全部用例判定。',
      relatedIds: ['guided-null-base'],
    },
    {
      id: 'independent-preorder', kind: 'independent-code', title: '独立挑战 · 从空方法骨架起步',
      body: '独立模式只有方法签名与 TODO。先用空树、单节点、平衡树真实运行，再提交本站全部测试。若结果出现 0，检查 null 分支是否追加了占位值；若平衡树顺序为 [2,4,6,8,10,12,14]，检查 add 是否写在左递归之后；若重复值只剩一个，检查是否用 Set 代替 List。只有真实执行的完整代码通过才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-preorder', kind: 'summary', title: '复盘 · 顺序、身份与执行证据',
      body: '解释为什么访问 8 后应先完成整棵左子树，为什么两个值为 5 的节点都必须输出，以及递归中传递 result 为何能持续追加到同一个列表。看过参考答案、完成预测、引导通过与独立通过本站测试是不同进度。参考演示不来自学生源码；本站测试通过也不等于 LeetCode 官方评测通过。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '00b7fc2076281a1369e8b2cb768530f93a0bd242ee5203b02f497f4d8a5f7262',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-preorder-base', level: 1, body: '先看空孩子：它不是节点，访问时应往结果列表添加什么？考虑让辅助方法直接返回。' },
    { id: 'hint-preorder-order', level: 2, body: '给 visit(node,result) 一个固定约定：先处理当前节点，再完整处理左子树，最后处理右子树；三个动作顺序不能交换。' },
    { id: 'hint-preorder-pseudocode', level: 3, body: '外层创建 result，调用 visit(root,result)，return result。visit 中若 node==null 则 return；否则先 add(node.val)，再 visit(left)，最后 visit(right)。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null', prompt: '默认树的最外层 visit 收到的 node 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，node 为 null' }, { id: 'not-null', label: '否，node 指向根节点' }],
      explanation: '默认树根值 8 对应节点 t0，最外层参数保存 t0 的引用值；空树时答案动态改为“是”。',
      checkpointId: 'root-null-check',
    },
    {
      id: 'predict-result-order', prompt: '默认树的完整前序结果是什么？按 [1,2] 格式填写。',
      answer: { kind: 'text', value: '[8,4,2,6,12,10,14]' },
      explanation: '先访问根 8，再完整访问左子树 4、2、6，最后右子树 12、10、14；切换输入后此预测动态变化。',
      checkpointId: 'result-return',
    },
  ],
  guided: {
    id: 'guided-144',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-null-base',
        instruction: '支架 1 / 3：空孩子不应在结果中留下 0。修正 null 分支，然后真实运行空树与单节点。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (node == null) return;', 'if (node == null) { result.add(0); return; } // TODO：空孩子不是节点'),
      },
      {
        id: 'guided-visit-order',
        instruction: '支架 2 / 3：当前代码先左后根，得到中序。把加入 node.val 的动作移到左递归之前，再用平衡树验证。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('result.add(node.val);\n        visit(node.left, result);', 'visit(node.left, result);\n        result.add(node.val); // TODO：改为先根后左'),
      },
      {
        id: 'guided-whole-method',
        instruction: '支架 3 / 3：从方法骨架重写整个递归遍历；提交完整 Java 经真实 runner 全部通过后才记录引导通过。',
        checkKind: 'static-practice',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'wrong-inorder', description: '先递归左子树再加入当前节点，写成中序遍历。', counterexampleInputId: 'balanced-case', explanation: '平衡树会得到 [2,4,6,8,10,12,14]，与根先出现的 [8,4,2,6,12,10,14] 不同。' },
    { id: 'wrong-right-first', description: '先访问右子树再访问左子树。', counterexampleInputId: 'asymmetric-case', explanation: '根 9 后应先输出左子树 1、2、3，再输出右子树 8、7；左右顺序颠倒会被此例发现。' },
    { id: 'wrong-null-placeholder', description: '遇到 null 时往结果中加入 0 或 null。', counterexampleInputId: 'empty-case', explanation: 'null 是没有节点的引用，不是值为 0 的节点；空树正确结果为空列表 []。' },
    { id: 'wrong-deduplicate', description: '用 Set 去重或按节点值合并对象。', counterexampleInputId: 'repeated-values-case', explanation: '五个 val=5 的节点身份不同，各访问一次；正确结果含五个 5。' },
    { id: 'wrong-list-reassignment', description: '在辅助方法里把 result 参数重绑定到新列表，误以为能替换调用者列表。', counterexampleInputId: 'singleton-case', explanation: 'Java 只复制 List 引用值给参数；重绑定局部参数不会修改外层 result 的绑定，外层仍返回原列表。' },
  ],
  testSuite: {
    version: PROBLEM_META['144'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-inorder', source: INORDER_SOURCE, targetedCaseIds: ['balanced-case', 'compact-null-case', 'asymmetric-case'] },
      { id: 'fixture-right-first', source: RIGHT_FIRST_SOURCE, targetedCaseIds: ['balanced-case', 'asymmetric-case', 'negative-values-case'] },
    ],
  },
  visualization: {
    modelId: '144-recursive-preorder', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
