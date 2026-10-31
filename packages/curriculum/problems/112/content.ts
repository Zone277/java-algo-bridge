import { PROBLEM_META, type Lesson, type PathSumInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type PathSumLesson = Extract<Lesson, { id: '112' }>;

const exampleRoot = [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1] as const;
function rightSkewedRoot(depth: number): PathSumInput['root'] {
  const root: PathSumInput['root'] = depth === 0 ? [] : [1];
  for (let index = 2; index <= depth; index++) root.push(null, 1);
  return root;
}

export const demoInputs: { id: string; title: string; input: PathSumInput }[] = [
  { id: 'target-found', title: '左侧叶子达成目标 22', input: { root: [...exampleRoot], targetSum: 22 } },
  { id: 'nonleaf-match', title: '中途碰巧相等，但不能提前成功', input: { root: [5, 4, 8], targetSum: 5 } },
  { id: 'negative-path', title: '负节点值与负目标', input: { root: [1, -2, -3, 1, 3, -2, null, -1], targetSum: -1 } },
  { id: 'empty-tree', title: '空树即使目标为 0 也没有路径', input: { root: [], targetSum: 0 } },
];

const cases: PathSumLesson['testSuite']['cases'] = [
  { id: 'empty-case', input: demoInputs[3]!.input, expected: { kind: 'boolean', value: false }, coverage: '空树不存在根到叶路径；目标和 0 也不能使它为真。' },
  { id: 'single-zero-case', input: { root: [0], targetSum: 0 }, expected: { kind: 'boolean', value: true }, coverage: '单节点同时是根和叶；值为 0 时目标 0 成立。' },
  { id: 'single-miss-case', input: { root: [7], targetSum: 6 }, expected: { kind: 'boolean', value: false }, coverage: '单节点叶子只在自身值恰好等于目标时成立。' },
  { id: 'nonleaf-match-case', input: demoInputs[1]!.input, expected: { kind: 'boolean', value: false }, coverage: '根值已等于目标但根不是叶子；不能在中途提前返回 true。' },
  { id: 'left-found-case', input: demoInputs[0]!.input, expected: { kind: 'boolean', value: true }, coverage: '紧凑层序树的左侧路径 5+4+11+2=22，验证深入叶子后才成功。' },
  { id: 'right-found-case', input: { root: [...exampleRoot], targetSum: 26 }, expected: { kind: 'boolean', value: true }, coverage: '左侧全失败后右侧路径 5+8+13=26 成功，不能漏掉右分支。' },
  { id: 'all-miss-case', input: { root: [...exampleRoot], targetSum: 25 }, expected: { kind: 'boolean', value: false }, coverage: '多条分支都走到叶子却没有目标和，不能把跨分支节点拼接。' },
  { id: 'negative-case', input: demoInputs[2]!.input, expected: { kind: 'boolean', value: true }, coverage: '路径 1-2+1-1=-1；负数允许，不能按剩余目标符号剪枝。' },
  { id: 'zero-branch-case', input: { root: [0, 0, 0], targetSum: 0 }, expected: { kind: 'boolean', value: true }, coverage: '重复零节点具有不同身份；左侧成功后右侧可由 || 短路。' },
  { id: 'cross-branch-case', input: { root: [1, 2, 3, 4, 5], targetSum: 6 }, expected: { kind: 'boolean', value: false }, coverage: '1+2+3=6 只是跨兄弟分支拼接，不是一条完整根到叶路径。' },
  { id: 'right-only-case', input: { root: [1, 2, 3], targetSum: 4 }, expected: { kind: 'boolean', value: true }, coverage: '只有右侧叶子能达成目标；只递归左边的错解失败。' },
  { id: 'repeated-values-case', input: { root: [1, 1, 1, 1, null, null, 1], targetSum: 3 }, expected: { kind: 'boolean', value: true }, coverage: '多个节点同值但不合并，分别沿树引用组合路径。' },
  { id: 'depth-limit-case', input: { root: rightSkewedRoot(128), targetSum: 128 }, expected: { kind: 'boolean', value: true }, coverage: '本站允许的最大深度边界，供真实判题验证；参考演示会明确拒绝。' },
];

export const NONLEAF_MATCH_SOURCE = `class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        if (root.val == targetSum) return true;
        int remaining = targetSum - root.val;
        return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
    }
}
`;

export const LEFT_ONLY_SOURCE = `class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        int remaining = targetSum - root.val;
        if (root.left == null && root.right == null) return remaining == 0;
        return hasPathSum(root.left, remaining);
    }
}
`;

export const lesson112 = {
  schemaVersion: 1,
  id: '112',
  slug: 'path-sum',
  title: '路径总和',
  order: 46,
  lessonVersion: PROBLEM_META['112'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J7', 'J8'],
  objectives: [
    '分清 int 值、TreeNode 引用、null 孩子和独立递归调用帧。',
    '从根到叶的路径定义推导剩余目标值，识别只在叶子判定的必要性。',
    '预测参考状态并用真实 Java runner 检验、修正完整方法。',
  ],
  source: { platform: 'LeetCode', number: 112, url: 'https://leetcode.com/problems/path-sum/' },
  taskSemantics: '给定二叉树根节点 root 和整数 targetSum，判断是否存在一条从根一直走到某个叶节点的路径，使沿途节点值之和恰好等于 targetSum。叶节点的左右孩子都为 null；空树没有这样的路径。题意参考 LeetCode 112；本站题面、讲解、例子与代码均为原创，与原平台无官方关联。',
  siteLimits: {
    description: '本站最多 1000 个非 null 节点、深度最多 128，节点值 -100—100，targetSum 为 -1000—1000。root 使用紧凑队列式层序输入；空数组是空树。参考演示最多 30 节点、深度 8，真实 Java 判题接受本站全部有效输入。',
    inputSchemaId: 'PathSumInput',
  },
  steps: [
    {
      id: 'syntax-pathsum-method', kind: 'syntax', title: 'J1 / J2 · boolean 方法、int 和返回值',
      body: '方法签名是 public boolean hasPathSum(TreeNode root, int targetSum)。targetSum 是 int 基本类型值，return true/false 结束当前调用并交回布尔结果。算术表达式 targetSum - root.val 新建一个 int 值，不改写节点字段。Java 的 || 从左到右求值；左侧已经 true 时，右侧调用不会发生。可信适配器已构造输入并调用方法，只编写 Solution.java，不写 main 或读控制台。',
      relatedIds: ['J1', 'J2'],
    },
    {
      id: 'syntax-pathsum-tree', kind: 'syntax', title: 'J3 / J7 / J8 · TreeNode、null 与递归参数',
      body: 'root 保存 TreeNode 引用值或 null。节点对象的 val 是 int 基本值；left、right 字段分别存另一个节点的引用值或 null。两个 val 都为 1 的节点仍是两个对象。Java 方法参数按值传递：递归调用时复制孩子的引用值与新的 int 剩余目标，各帧有自己的 root 和 targetSum；没有复制整棵树，也没有修改父帧变量。对象图只是教学抽象，不承诺物理地址或垃圾回收时刻。',
      relatedIds: ['J3', 'J7', 'J8'],
    },
    {
      id: 'understanding-pathsum', kind: 'understanding', title: '读题与手算 · 完整路径才算数',
      body: '以 [5,4,8,11,null,13,4,7,2,null,null,null,1]、目标 22 为例：从根向左走 5→4→11→2，到叶子时和为 22，所以返回 true；5→8→13 的和是 26，不能和左边节点拼接。本站层序是“给队列中的真实父节点依次填左右孩子”，null 不入队，不能用堆下标推断引用。若输入 [5,4,8]、目标 5，根值虽已等于目标，但根还有孩子，结果必须为 false。空树即使目标为 0 也没有路径。',
      relatedIds: [],
    },
    {
      id: 'derivation-pathsum', kind: 'derivation', title: '推导 · 把剩余目标交给子树',
      body: '定义 hasPathSum(node,need)：判断从 node 出发到某个叶子的节点和是否为 need。null 没有完整路径，返回 false。非空节点先计算 remaining=need-node.val；若它是叶子，恰在 remaining==0 时返回 true；否则向左右孩子分别传 remaining，任一侧成功即可。只有在叶子判定 0，才不会把到中途节点的前缀误认为完整路径。即使 remaining 为负也不能剪枝，因为后续节点可能为负。最坏情况下访问每个节点一次，时间 O(n)，递归栈同时有 O(h) 帧；不改动原树字段。',
      relatedIds: [],
    },
    {
      id: 'prediction-pathsum', kind: 'prediction', title: '先预测，再揭示 · 空树与最终结果',
      body: '第一处检查点预测最外层 root 是否为 null，第二处预测这棵树是否真的存在满足目标的完整根到叶路径。默认示例的两次答案是“非空”和“存在”；切换到空树会变为“空树”和“不存在”。提交预测后才揭示参考快照；静态预测不能冒充学生 Java 编译和判题。',
      relatedIds: ['predict-root-null', 'predict-root-result'],
    },
    {
      id: 'reference-pathsum', kind: 'reference-demo', title: '参考解法 · 剩余目标与路径前缀演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。同一不可变快照展示稳定节点 ID、left/right 引用、当前调用帧、targetSum、remaining 和路径前缀；进入、返回、前进和后退都不会改变旧快照。左侧为 true 时右侧按 Java || 规则短路。重复值节点不能合并，null 不创建节点，也不意味着某个对象已被回收。这是预置参考算法的抽象状态，不是学生程序的执行轨迹。',
      relatedIds: [],
    },
    {
      id: 'guided-pathsum', kind: 'guided-code', title: '引导编写 · 空树、叶子、完整递归',
      body: '支架一先修正空树基例，支架二把“剩余目标为 0”限定到叶子，支架三撤去支架从方法骨架写全程。静态练习仅记录学习步骤，不比较你填入的源码字符串是否等于参考答案。最后必须把完整 Java 送入真实 runner，由 javac、java 和本站测试判定；打印 PASS 不会使错误返回值通过。',
      relatedIds: ['guided-empty-base'],
    },
    {
      id: 'independent-pathsum', kind: 'independent-code', title: '独立模式 · 从方法骨架开始',
      body: '独立模式只有 Solution 与方法签名，不预填参考解法。先试空树、单节点，再试根值等于目标却不是叶子的反例、只在右边成功以及负值路径。若空树返回 true，检查 null 基例；若 [5,4,8]、目标5返回 true，检查叶子条件；若右边成功而代码说 false，检查是否漏了右分支。改代码后重新运行，只有当前完整源码真实通过本站测试才记录独立通过。',
      relatedIds: [],
    },
    {
      id: 'summary-pathsum', kind: 'summary', title: '复盘 · 完整路径、短路与验证证据',
      body: '请解释：为什么在根值等于目标时仍可能返回 false？为什么负的 remaining 不能提前结束？左侧为 true 时 Java 为什么不调用右侧？递归中哪些值被复制、哪些树对象保持不变？查看答案、引导通过与独立通过本站测试分别记录；播放动画不代表学生 Java 已运行，本站测试也不等于原平台官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE, fileName: 'Solution.java',
    sourceHash: 'd35577774f26abe2a1dcff2bfb5662f08d944016f803988b35d0f5568e0fbe0d',
    algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: 'hint-path-null', level: 1, body: '先问“空树有没有根到叶路径”，再问到一个节点时还要减去谁的值。' },
    { id: 'hint-path-leaf', level: 2, body: '只在 left 和 right 都是 null 时比较剩余目标是否为 0；非叶节点应继续交给孩子。' },
    { id: 'hint-path-code', level: 3, body: '若 root==null 返回 false；计算 remaining=targetSum-root.val；若左右都为 null 返回 remaining==0；否则递归左或右，传入 remaining。' },
  ],
  predictionChecks: [
    {
      id: 'predict-root-null', prompt: '默认输入的最外层 root 是否为 null？',
      answer: { kind: 'choice', optionId: 'not-null' },
      options: [{ id: 'is-null', label: '是，空树' }, { id: 'not-null', label: '否，有根节点' }],
      explanation: '默认树从第一个数 5 构造根 t0；空数组才使 root 为 null。',
      checkpointId: 'root-null-check',
    },
    {
      id: 'predict-root-result', prompt: '默认输入中，是否存在和为 22 的完整根到叶路径？',
      answer: { kind: 'choice', optionId: 'yes' },
      options: [{ id: 'yes', label: '存在' }, { id: 'no', label: '不存在' }],
      explanation: '5→4→11→2 到叶子时和为 22。中途和相等、跨分支拼接都不算。',
      checkpointId: 'root-result',
    },
  ],
  guided: {
    id: 'guided-112', finalCheck: 'real-java-submit',
    stages: [
      {
        id: 'guided-empty-base',
        instruction: '支架 1 / 3：空树没有路径。修正错误的 null 分支，再运行空树和单节点。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (root == null) return false;', 'if (root == null) return true; // TODO：空树没有完整路径'),
      },
      {
        id: 'guided-leaf-condition',
        instruction: '支架 2 / 3：中途剩余目标为零不一定成功；把判断限定到左右孩子都为空的叶子。',
        checkKind: 'static-practice',
        scaffoldSource: REFERENCE_SOURCE.replace('if (root.left == null && root.right == null) return remaining == 0;', 'if (remaining == 0) return true; // TODO：只有叶子才能判定成功'),
      },
      {
        id: 'guided-full-method',
        instruction: '支架 3 / 3：从方法骨架自己写出 null 基例、减去当前值、叶子判断和递归；完整源码提交真实 Java runner 才记录引导通过。',
        checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE,
      },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-prefix-only', description: '中途节点值和目标相等就立即成功。', counterexampleInputId: 'nonleaf-match-case', explanation: '根值 5 等于目标5，但根还有两个孩子，根不是叶子；所有完整路径的和都不等于5。' },
    { id: 'error-ignore-right', description: '只递归左孩子，漏掉右侧可能的路径。', counterexampleInputId: 'right-only-case', explanation: '[1,2,3]、目标4 只有 1→3 的右侧路径成立。' },
    { id: 'error-null-zero', description: '把 null 当成值为 0 的叶子或认为空树在目标0时成功。', counterexampleInputId: 'empty-case', explanation: 'null 没有 TreeNode 对象，也没有根到叶路径。' },
    { id: 'error-negative-prune', description: '剩余目标小于 0 就停止递归。', counterexampleInputId: 'negative-case', explanation: '负值节点可以抵消前面的值；目标也可为负，不能用正数树的单调性。' },
    { id: 'error-cross-branch', description: '把不同分支节点凑成目标和。', counterexampleInputId: 'cross-branch-case', explanation: '1+2+3=6 跨越兄弟节点，不是一条由引用连续连接到叶子的路径。' },
  ],
  testSuite: {
    version: PROBLEM_META['112'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'fixture-prefix-only', source: NONLEAF_MATCH_SOURCE, targetedCaseIds: ['nonleaf-match-case'] },
      { id: 'fixture-left-only', source: LEFT_ONLY_SOURCE, targetedCaseIds: ['right-found-case', 'right-only-case'] },
    ],
  },
  visualization: {
    modelId: '112-recursive-remaining', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
