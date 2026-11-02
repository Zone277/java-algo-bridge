import {
  LinkedListCycleInputSchema,
  PROBLEM_META,
  expectedOutput,
  type Lesson,
  type LinkedListCycleInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_COMPARE_FIRST_SOURCE,
  WRONG_UNSAFE_FAST_SOURCE,
} from './reference.js';

type Lesson141 = Extract<Lesson, { id: '141' }>;
type Case141 = Lesson141['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: LinkedListCycleInput }[] = [
  { id: '141-demo-middle-cycle', title: '尾部回到中间节点', input: { head: [3, 2, 0, -4], pos: 1 } },
  { id: '141-demo-acyclic', title: '普通无环链表', input: { head: [1, 2, 3, 4, 5], pos: -1 } },
  { id: '141-demo-self-cycle', title: '单节点自环', input: { head: [7], pos: 0 } },
  { id: '141-demo-empty', title: '空链表', input: { head: [], pos: -1 } },
  { id: '141-demo-repeated', title: '重复值与不同身份', input: { head: [5, 5, 5, 5], pos: 1 } },
];

function testCase(id: string, input: LinkedListCycleInput, coverage: string): Case141 {
  const parsed = LinkedListCycleInputSchema.parse(input);
  const expected = expectedOutput('141', parsed);
  if (expected.kind !== 'boolean') throw new Error('141 可信期望必须是 boolean');
  return { id, input: parsed, expected, coverage };
}

const cases: Case141[] = [
  testCase('141-case-empty', { head: [], pos: -1 }, '空链表：head 为 null，第一次 fast 安全检查即短路并返回 false。'),
  testCase('141-case-single-no-cycle', { head: [7], pos: -1 }, '单节点无环：fast 非 null 但 fast.next 为 null，验证第二个安全条件。'),
  testCase('141-case-single-self-cycle', { head: [7], pos: 0 }, '单节点自环：slow 和 fast 移动后仍引用 h0，应返回 true。'),
  testCase('141-case-two-no-cycle', { head: [1, 2], pos: -1 }, '两个节点无环：fast 一轮走到 null，不能因 slow 与 fast 初始相同而误判。'),
  testCase('141-case-three-no-cycle', { head: [1, 2, 3], pos: -1 }, '奇数长度无环：第二轮 fast 停在尾节点，必须先检查 fast.next 才能安全退出。'),
  testCase('141-case-two-cycle-to-head', { head: [1, 2], pos: 0 }, '两个节点构成环且入口是头节点，检查快慢指针相遇。'),
  testCase('141-case-entry-head', { head: [3, 2, 0, -4], pos: 0 }, '较长链尾回到头节点，整个可达图都是环。'),
  testCase('141-case-entry-middle', { head: [3, 2, 0, -4], pos: 1 }, '链尾回到中间节点，是默认手算与参考演示输入。'),
  testCase('141-case-entry-tail', { head: [1, 2, 3, 4], pos: 3 }, '尾节点 next 指向自己；入口位于最后一个节点。'),
  testCase('141-case-repeated-cycle', { head: [5, 5, 5, 5], pos: 1 }, '节点值全部相同但对象身份不同；不能用 val 相等判断相遇。'),
  testCase('141-case-repeated-acyclic', { head: [5, 5, 5, 5], pos: -1 }, '重复值无环，专门击穿“见过相同值就有环”的错误。'),
  testCase('141-case-long-acyclic', { head: Array.from({ length: 1000 }, (_, index) => index - 500), pos: -1 }, '本站 1000 节点上限且无环，检查终止与边界；不进入参考动画。'),
  testCase('141-case-long-cycle', { head: Array.from({ length: 1000 }, (_, index) => index % 11), pos: 317 }, '本站节点上限、重复值和深入口组合，检查线性过程与身份判定。'),
];

export const lesson141 = {
  schemaVersion: 1,
  id: '141',
  slug: 'linked-list-cycle',
  title: '环形链表',
  order: 52,
  lessonVersion: PROBLEM_META['141'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J6', 'J8'],
  objectives: [
    '区分 ListNode 变量中的引用值、节点对象身份、节点的 int val 与 next 字段引用。',
    '能手算 Floyd 快慢指针，并解释 && 的短路顺序为什么避免读取 null.next。',
    '用稳定节点 ID 判断相遇，不因值重复合并节点，也不把变量移走解释成对象回收。',
    '从方法骨架独立写出完整 Java，并经真实 runner 覆盖空链、无环、自环、深入口和重复值。',
  ],
  source: { platform: 'LeetCode', number: 141, url: 'https://leetcode.com/problems/linked-list-cycle/' },
  taskSemantics: '给定一个单链表的头引用 head，判断沿 next 不断前进是否会再次到达先前访问过的同一节点对象。输入中的 pos 只让本站可信平台把尾节点连接到指定下标；它不传入学生方法。返回 true 表示存在环，false 表示最终到达 null。题意参考 LeetCode 141，题面、示例、图形与代码均为本站原创表达。',
  siteLimits: {
    description: '本站真实判题允许 0—1000 个节点，节点值 -100000—100000；pos 为 -1 或有效下标。参考演示最多 30 个节点、2000 个不可变快照，超过演示上限的有效输入仍可进入真实 Java 判题。',
    inputSchemaId: 'LinkedListCycleInputSchema',
  },
  steps: [
    {
      id: '141-step-syntax', kind: 'syntax', title: 'Java 前置 · 引用变量、对象字段与按值传递',
      body: '方法签名是 public boolean hasCycle(ListNode head)。boolean 是基本类型；head、slow、fast 是 ListNode 引用变量，每个变量保存某个节点对象的引用值或 null。节点对象有 int val 和 ListNode next 两个字段：slow = fast 只复制引用值，不复制对象；slow = slow.next 改变 slow 的变量绑定，不修改节点字段；node.next = other 才会修改对象。Java 方法参数按值传递，所以 head 参数收到调用者所持引用值的副本。本站可信调用器负责创建 ListNode 与输入对象图，学生无需写 main，也看不到 pos 参数。',
      relatedIds: ['J1', 'J2', 'J3', 'J6'],
    },
    {
      id: '141-step-understanding', kind: 'understanding', title: '读题与手算 · pos 是构图说明，不是答案捷径',
      body: '以 head=[3,2,0,-4]、pos=1 为例，可信平台建立 h0(3)→h1(2)→h2(0)→h3(-4)，再令 h3.next 指向 h1。沿 next 会循环 h1→h2→h3→h1，因此返回 true。pos=-1 时尾节点 next 为 null，最终返回 false。学生方法只有 head，不能读取 pos；真实判定检查方法在实际对象图上的 boolean 返回值。两个 val 都为 5 的节点仍可分别是 h0 与 h1，值相等不能证明是同一个对象。',
      relatedIds: ['141-demo-middle-cycle', '141-demo-repeated'],
    },
    {
      id: '141-step-derivation', kind: 'derivation', title: '推导 · 快指针追上慢指针',
      body: '若没有环，fast 每轮走两条 next，必先到 null 或让 fast.next 为 null。若有环，slow 与 fast 都进入有限个环内节点后，fast 每轮相对 slow 多前进一个节点；二者的环内距离会逐轮变化并最终变为 0，于是引用同一对象。循环边界的不变量是：slow、fast 都是从 head 沿 next 可达的位置，slow 每完成一轮走 1 步，fast 走 2 步，算法从不修改任何 next。时间 O(n)，额外空间 O(1)；一次小输入计时不能单独证明复杂度。',
      relatedIds: ['move-slow', 'move-fast', 'compare-runners'],
    },
    {
      id: '141-step-safety', kind: 'understanding', title: '安全条件 · 先检查 fast，再读取 fast.next',
      body: '条件 fast != null && fast.next != null 从左到右求值。fast 为 null 时，&& 短路，右侧不会读取 null.next；fast 非 null 后才可检查 fast.next；两项都成立，fast.next.next 才是安全的，即使第二跳结果本身是 null 也没问题。不能只写 fast != null 后直接走两步，否则无环链表可能抛出 NullPointerException。',
      relatedIds: ['check-fast', 'check-fast-next'],
    },
    {
      id: '141-step-prediction', kind: 'prediction', title: '先预测 · 安全检查与最终结果',
      body: '第一个动态检查点问第一次 while 判断时 fast 是否非 null：普通链表成立，空链表不成立并短路。第二个检查点问参考方法最终是否判为有环。切换演示输入后，答案从该输入的不可变参考轨迹重新生成；这些预测是教学检查，不编译或执行学生 Java。',
      relatedIds: ['141-predict-first-safety', '141-predict-result'],
    },
    {
      id: '141-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '对象图固定显示 h0、h1…的 val 与 next；变量箭头分别显示 head、slow、fast 当前引用谁。变量箭头移动不等于对象消失，更不声称发生垃圾回收；next 边也不会因变量移动而变化。slow 走一步、fast 走两步、身份比较分别对应参考 Java 的真实代码行。所有图、变量、说明与高亮读取同一不可变快照，前进、后退与重置无需反向修改旧状态。该演示只描述预置参考算法，不是学生代码的 JVM 调试轨迹。',
      relatedIds: ['141-demo-acyclic', '141-demo-self-cycle', '141-demo-empty'],
    },
    {
      id: '141-step-guided', kind: 'guided-code', title: '引导编写 · 安全条件、双速移动、完整提交',
      body: '第一段支架补全 && 安全条件；第二段支架补 slow/fast 的不同移动步数与移动后的身份比较；第三段只保留方法骨架。静态练习用于搭支架，不用源码字符串相等判正确。最终必须把完整 Solution.java 提交到真实 Java runner，由 javac、java 和本站可信用例判定后才记录引导通过。',
      relatedIds: ['141-guided'],
    },
    {
      id: '141-step-independent', kind: 'independent-code', title: '独立挑战 · 用反例定位引用错误',
      body: '独立草稿从空方法骨架开始，与引导草稿分别保存。先真实运行空链、单节点无环、单节点自环、重复值无环：若非空输入全判 true，检查是否在移动前比较 slow==fast；若抛运行异常，检查 fast.next 安全条件；若重复值无环被判 true，检查是否比较了 val。修正后提交本站全部测试，读取结构化编译、运行或错误结果。',
      relatedIds: ['141-case-empty', '141-case-single-no-cycle', '141-case-single-self-cycle', '141-case-repeated-acyclic'],
    },
    {
      id: '141-step-summary', kind: 'summary', title: '复盘 · 身份、短路与真实执行证据',
      body: '说明为什么 pos 不在方法参数中，为什么 slow==fast 比较节点身份而不是值，为什么安全条件必须按 fast、fast.next 的顺序检查，以及快指针在有环时为何会追上慢指针。完成预测、使用提示、查看答案、引导通过与独立通过本站测试分别记录；参考动画不是学生执行，通过本站测试也不代表 LeetCode 官方评测。',
      relatedIds: ['J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'a7194ff100b9177ffb4721dbd5c6412abf24bb35fc36a5bbadf077684a1356c9',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP,
  },
  hints: [
    { id: '141-hint-concept', level: 1, body: '让两个引用变量从同一 head 出发，但每轮沿 next 前进不同步数。有环时它们会在同一个节点对象相遇；无环时较快者先到链尾。' },
    { id: '141-hint-invariant', level: 2, body: '每轮开始先确保 fast 和 fast.next 都非 null；随后 slow 走一步、fast 走两步，再比较 slow == fast。不要比较 val，也不要改任何 next 字段。' },
    { id: '141-hint-pseudocode', level: 3, body: 'slow=head，fast=head；while(fast!=null && fast.next!=null)：slow=slow.next；fast=fast.next.next；若 slow==fast 返回 true；循环结束返回 false。' },
  ],
  predictionChecks: [
    {
      id: '141-predict-first-safety', prompt: '默认输入第一次判断 while 时，fast != null 是否成立？',
      answer: { kind: 'choice', optionId: 'non-null' },
      options: [{ id: 'non-null', label: '成立，继续检查 fast.next' }, { id: 'is-null', label: '不成立，&& 短路' }],
      explanation: '默认输入 head 指向 h0，所以 fast 初始化为 h0；切换空链表后答案会动态变为不成立。',
      checkpointId: 'first-fast-safety',
    },
    {
      id: '141-predict-result', prompt: '默认输入最终会判定存在环吗？',
      answer: { kind: 'choice', optionId: 'cycle' },
      options: [{ id: 'cycle', label: '有环，返回 true' }, { id: 'no-cycle', label: '无环，返回 false' }],
      explanation: '默认输入的 h3.next 指向 h1，slow 与 fast 会在环内引用同一节点；切换输入后答案动态变化。',
      checkpointId: 'final-result',
    },
  ],
  guided: {
    id: '141-guided', finalCheck: 'real-java-submit',
    stages: [
      {
        id: '141-guided-safety', instruction: '支架 1 / 3：补全 while 的两个短路安全条件，保证只有两项都成立才读取 fast.next.next。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (/* TODO：先检查 fast，再检查 fast.next */) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
`,
      },
      {
        id: '141-guided-movement', instruction: '支架 2 / 3：补上慢指针一步、快指针两步，并在移动后比较对象身份。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            // TODO：slow 沿 next 走一步，fast 沿 next 走两步。
            // TODO：移动后若引用同一节点对象，返回 true。
        }
        return false;
    }
}
`,
      },
      { id: '141-guided-whole', instruction: '支架 3 / 3：从方法骨架独立完成全部代码，再提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '141-error-compare-first', description: '初始化后、移动前就比较 slow==fast。', counterexampleInputId: '141-case-two-no-cycle', explanation: '两个变量都从 head 出发，任何非空链表初始都相等；必须先按不同速度移动，再判断是否追上。' },
    { id: '141-error-unsafe-fast', description: '只检查 fast!=null 就直接读取 fast.next.next。', counterexampleInputId: '141-case-single-no-cycle', explanation: '单节点无环时 fast.next 为 null，继续读取 null.next 会抛 NullPointerException；&& 的第二项不可省略。' },
    { id: '141-error-compare-value', description: '用 slow.val==fast.val 代替 slow==fast。', counterexampleInputId: '141-case-repeated-acyclic', explanation: '不同节点可以保存相同 int 值；重复值无环链表不能被判为有环，必须比较引用是否指向同一对象。' },
    { id: '141-error-follow-head', description: '循环里让 fast 每次重新从 head 出发，或让两个指针都只走一步。', counterexampleInputId: '141-case-entry-middle', explanation: '快慢指针必须保留各自当前位置且速度不同；同速不会缩短环内距离，重复重置也破坏推导。' },
    { id: '141-error-mutate-next', description: '通过断开或标记 next 来判断环，意外修改输入对象图。', counterexampleInputId: '141-case-entry-tail', explanation: '本题只需读 next；Floyd 使用 O(1) 变量且不改节点字段，破坏输入会让后续遍历与状态失真。' },
  ],
  testSuite: {
    version: PROBLEM_META['141'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '141-wrong-compare-first', source: WRONG_COMPARE_FIRST_SOURCE, targetedCaseIds: ['141-case-two-no-cycle', '141-case-three-no-cycle', '141-case-repeated-acyclic'] },
      { id: '141-wrong-unsafe-fast', source: WRONG_UNSAFE_FAST_SOURCE, targetedCaseIds: ['141-case-single-no-cycle', '141-case-three-no-cycle'] },
    ],
  },
  visualization: {
    modelId: '141-floyd-reference-graph', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson141;
