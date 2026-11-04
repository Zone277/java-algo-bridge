import {
  PROBLEM_META,
  RemoveLinkedListElementsInputSchema,
  expectedOutput,
  type Lesson,
  type RemoveLinkedListElementsInput,
} from '@jab/contracts';
import {
  ALGORITHM_VERSION,
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_ADVANCE_AFTER_DELETE_SOURCE,
  WRONG_ONLY_FIRST_SOURCE,
} from './reference.js';

type Lesson203 = Extract<Lesson, { id: '203' }>;
type Case203 = Lesson203['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: RemoveLinkedListElementsInput }[] = [
  { id: '203-demo-mixed', title: '头、中、尾都有目标值', input: { head: [6, 1, 6, 2, 6], val: 6 } },
  { id: '203-demo-consecutive', title: '连续目标节点', input: { head: [1, 2, 2, 2, 3], val: 2 } },
  { id: '203-demo-repeated-kept', title: '重复保留值与不同身份', input: { head: [5, 5, 6, 5], val: 6 } },
  { id: '203-demo-empty', title: '空链表', input: { head: [], val: 1 } },
];

function testCase(id: string, rawInput: RemoveLinkedListElementsInput, coverage: string): Case203 {
  const input = RemoveLinkedListElementsInputSchema.parse(rawInput);
  const expected = expectedOutput('203', input);
  if (expected.kind !== 'int-array') throw new Error('203 可信期望必须是 int-array');
  return { id, input, expected, coverage };
}

const cases: Case203[] = [
  testCase('203-case-empty', { head: [], val: 1 }, '空链表：dummy.next 与返回值均为 null，不能读取 head.val。'),
  testCase('203-case-single-remove', { head: [7], val: 7 }, '单节点命中：删除唯一头节点后返回空链。'),
  testCase('203-case-single-keep', { head: [7], val: 6 }, '单节点不命中：返回值序列仍为 [7]。'),
  testCase('203-case-val-zero-no-match', { head: [1, 2, 3], val: 0 }, 'val 可为 0 而节点值最小为 1，因此没有节点命中。'),
  testCase('203-case-leading-run', { head: [4, 4, 4, 1, 2], val: 4 }, '连续三个头节点都应删除；检验 dummy 统一处理头部。'),
  testCase('203-case-trailing-run', { head: [1, 2, 9, 9, 9], val: 9 }, '连续尾部命中；删除后 curr.next 变为 null 并安全退出。'),
  testCase('203-case-consecutive-middle', { head: [1, 2, 2, 2, 3], val: 2 }, '中间连续命中时删除后不能移动 curr，否则会漏检新的 curr.next。'),
  testCase('203-case-alternating', { head: [8, 1, 8, 2, 8, 3, 8], val: 8 }, '目标与保留节点交替出现，反复覆盖跳过和移动两条分支。'),
  testCase('203-case-all-remove', { head: [5, 5, 5, 5], val: 5 }, '所有节点值相同且全部删除；相同值节点仍是四个不同对象。'),
  testCase('203-case-repeated-kept', { head: [5, 5, 6, 5], val: 6 }, '重复值 h0、h1、h3 均保留，不能因值相同合并身份。'),
  testCase('203-case-classic-mixed', { head: [1, 2, 6, 3, 4, 5, 6], val: 6 }, '经典混合位置：同时删除中间与尾部目标节点。'),
  testCase('203-case-value-bounds', { head: [1, 50, 1, 50], val: 50 }, '覆盖节点值上界 50、下界 1 和交替删除。'),
  testCase('203-case-one-late-match', { head: [3, 4, 5, 6, 7, 8], val: 7 }, '较晚才出现一次目标，击穿只检查首节点的错误实现。'),
  testCase('203-case-length-boundary', { head: Array.from({ length: 10000 }, (_, index) => index % 50 + 1), val: 25 }, '本站 10000 节点上限；验证完整扫描并保留其余节点原有顺序。'),
];

export const lesson203 = {
  schemaVersion: 1,
  id: '203',
  slug: 'remove-linked-list-elements',
  title: '移除链表元素',
  order: 57,
  lessonVersion: PROBLEM_META['203'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J6', 'J8'],
  objectives: [
    '区分 int 基本值、ListNode 引用变量、节点对象身份与 next 引用字段。',
    '用 dummy 与 curr 统一处理头节点和中间节点，保持“curr.next 是下一个待检查节点”的不变量。',
    '解释为什么删除后 curr 不移动、保留后 curr 才沿 next 移动，并能手算连续命中。',
    '从方法骨架完成 Java 解法，并通过空链、重复值、连续删除和输入上限的真实本站测试。',
  ],
  source: { platform: 'LeetCode', number: 203, url: 'https://leetcode.com/problems/remove-linked-list-elements/' },
  taskSemantics: '给定单链表头引用 head 和整数 val，移除链表中所有节点值等于 val 的节点，返回处理后的链表头引用。输出中其余节点的值与相对次序保持不变。题意参考 LeetCode 203；题面、解释、图形与代码为本站原创表达。本站按返回链的无环值序列判定，不要求学生必须采用与参考解法相同的原节点复用策略。',
  siteLimits: {
    description: '本站真实判题允许 0—10000 个节点，节点值 1—50，val 为 0—50。参考状态演示最多 30 个节点、2000 个不可变快照；超过演示上限的合法输入仍可由真实 Java runner 判定。',
    inputSchemaId: 'RemoveLinkedListElementsInputSchema',
  },
  steps: [
    {
      id: '203-step-syntax', kind: 'syntax', title: 'Java 前置 · 基本值、引用值与对象字段',
      body: '方法签名是 public ListNode removeElements(ListNode head, int val)。val 是 int 基本类型变量，保存整数值；head、dummy、curr 是 ListNode 引用变量，保存某个节点对象的引用值或 null，并非所有 Java 变量都保存对象引用。节点对象有 int val 与 ListNode next 两个字段。curr = curr.next 只改变 curr 的变量绑定；curr.next = curr.next.next 修改 curr 当前所指对象的 next 字段。Java 参数按值传递：head 收到调用者引用值的副本，通过节点引用修改 next 仍会改变共享对象。',
      relatedIds: ['J1', 'J2', 'J3', 'J6'],
    },
    {
      id: '203-step-understanding', kind: 'understanding', title: '读题与手算 · 删除值，不混淆对象身份',
      body: '输入 head=[6,1,6,2,6]、val=6 时，值序列由 6→1→6→2→6 变为 1→2。教学图把五个原节点标为 h0…h4；h0、h2、h4 的值都为 6，却是三个不同对象，必须分别检查。返回空链时返回 null，而不是值为 0 的节点。本站比较最终无环链的值序列；参考动画同时保留稳定 ID，用来准确说明哪一条 next 边改变。',
      relatedIds: ['203-demo-mixed', '203-case-all-remove'],
    },
    {
      id: '203-step-dummy', kind: 'derivation', title: '推导 · 用 d0 消除“删除头节点”的特判',
      body: '若只从 head 开始，删除第一个节点会改变结果头，连续多个头节点又会重复同样的边界处理。参考解法创建辅助节点 d0，令 d0.next=head，再让 curr=d0。此后待检查节点始终是 curr.next：命中时把 curr.next 改接到下下个节点，不命中时让 curr 前进。最终统一返回 d0.next。d0 是教学中的辅助对象，不属于结果值序列；它的值 0 不参与比较。',
      relatedIds: ['create-dummy', 'link-head', 'init-curr'],
    },
    {
      id: '203-step-invariant', kind: 'derivation', title: '循环不变量 · curr 停在保留前缀末尾',
      body: '每轮 while 开始时，从 d0.next 到 curr 是已经检查且全部保留的前缀，原相对顺序不变；curr.next 是第一个尚未检查的节点，其后仍是原输入的未处理后缀；整条 d0 可达链无环。若 curr.next.val==val，改写 curr.next 跳过它，curr 原地不动，于是新的 curr.next 仍待检查。若值不同，当前候选应保留，curr 才移动过去。每轮消耗一个待处理节点，最终 curr.next==null。时间 O(n)，参考解法额外空间 O(1)；单次计时不能证明复杂度。',
      relatedIds: ['check-loop', 'check-value', 'skip-node', 'move-curr'],
    },
    {
      id: '203-step-prediction', kind: 'prediction', title: '先预测 · 第一个决定与边的去向',
      body: '第一个检查点先判断当前候选是跳过、保留还是根本不存在；第二个检查点再预测第一次处理后 d0.next 指向哪个稳定节点 ID；若输入为空，则改为预测直接退出循环并返回前的 d0.next。默认输入第一个 h0 值为 6，所以先跳过，d0.next 改为 h1。切换演示输入后答案随输入轨迹变化。这些是参考模型的教学检查，不会编译或执行学生 Java。',
      relatedIds: ['203-predict-first-decision', '203-predict-first-link'],
    },
    {
      id: '203-step-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）',
      body: '对象图分别显示变量当前引用、对象的 next 字段引用、对象的 int 值和 h0…稳定身份。相同值不会合并为一个节点。被跳过的对象仍保留在教学快照里，只是不再从 d0 可达；这不表示或预测 JVM 已回收它。所有变量表、边、解释和代码高亮读取同一份不可变快照，因此上一步、下一步、播放、暂停、重置和输入切换都不会靠反向修改旧状态。演示只描述预置参考算法，不是学生代码的执行轨迹或 JVM 调试器。',
      relatedIds: ['203-demo-consecutive', '203-demo-repeated-kept', '203-demo-empty'],
    },
    {
      id: '203-step-guided', kind: 'guided-code', title: '引导编写 · 判断、改边、移动',
      body: '第一段支架补 dummy 初始化和循环条件；第二段支架补命中时的 next 改写与未命中时的 curr 移动；第三段只留方法骨架。静态补全只用于组织思路，不通过源码字符串匹配判正确。引导最终必须把完整 Solution.java 提交真实 runner，由 javac、java、可信适配器与本站测试给出结构化反馈。',
      relatedIds: ['203-guided'],
    },
    {
      id: '203-step-independent', kind: 'independent-code', title: '独立挑战 · 用连续命中定位错误',
      body: '独立草稿从方法骨架开始，与引导草稿分开保存。先运行空链、单节点删除、三个连续头节点、连续中间节点和全部删除：若只少了一个目标值，检查是否只处理一次；若连续目标还残留，检查删除后是否错误移动 curr；若运行异常，检查 curr 或 curr.next 是否为 null。修改源码后旧请求结果不得用于新源码，只有当前完整源码通过才记录“通过本站测试”。',
      relatedIds: ['203-case-empty', '203-case-single-remove', '203-case-leading-run', '203-case-consecutive-middle'],
    },
    {
      id: '203-step-summary', kind: 'summary', title: '复盘 · 用变量绑定和对象字段准确表达',
      body: '请说明：head 与 val 各保存什么？dummy.next=head 改了什么？curr=curr.next 又改了什么？为什么删除后 curr 不动？h0 与 h1 值相同时为什么仍是两个对象？变量不再引用某个对象为何不能等同于对象已被垃圾回收？预测完成、提示使用、看过答案、引导通过与独立通过本站测试分别记录；本站通过不代表 LeetCode 官方评测。',
      relatedIds: ['J6', 'J8'],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '9e186ef1bc41ba75c56719a4dea8d9f14973b796394b9e2466ca27a44923381c',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: [...REFERENCE_STEP_MAP],
  },
  hints: [
    { id: '203-hint-concept', level: 1, body: '让一个辅助节点指向 head，并让 curr 指向“已处理保留前缀的最后一个节点”；每轮真正检查的是 curr.next。' },
    { id: '203-hint-invariant', level: 2, body: '命中 val 时修改 curr.next 跳过候选，但 curr 不动，因为新的 curr.next 还没检查；不命中时才让 curr 沿 next 前进。' },
    { id: '203-hint-pseudocode', level: 3, body: 'dummy.next=head，curr=dummy；while(curr.next!=null)：若 curr.next.val==val，curr.next=curr.next.next，否则 curr=curr.next；返回 dummy.next。' },
  ],
  predictionChecks: [
    {
      id: '203-predict-first-decision', prompt: '默认输入第一次检查 h0 时，应跳过、保留还是已经结束？',
      answer: { kind: 'choice', optionId: 'remove' },
      options: [{ id: 'remove', label: '值等于 val，跳过' }, { id: 'keep', label: '值不等于 val，保留' }, { id: 'done', label: '没有待检查节点' }],
      explanation: '默认输入 h0.val=6，val=6，因此参考解法跳过 h0；其他演示输入会动态生成自己的答案。',
      checkpointId: 'first-decision',
    },
    {
      id: '203-predict-first-link', prompt: '默认输入第一次跳过 h0 后，d0.next 指向哪个节点？',
      answer: { kind: 'text', value: 'h1' },
      explanation: '执行 d0.next=h0.next 后，d0.next 指向 h1；h0 对象仍在快照中，但已不从 d0 可达。',
      checkpointId: 'first-action',
    },
  ],
  guided: {
    id: '203-guided',
    finalCheck: 'real-java-submit',
    stages: [
      {
        id: '203-guided-setup', instruction: '支架 1 / 3：创建 dummy，让 dummy.next 指向 head，初始化 curr，并补全“还有待检查节点”的循环条件。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = /* TODO：输入头引用 */;
        ListNode curr = /* TODO：从辅助节点开始 */;
        while (/* TODO：curr 后面还有节点 */) {
            if (curr.next.val == val) curr.next = curr.next.next;
            else curr = curr.next;
        }
        return dummy.next;
    }
}
`,
      },
      {
        id: '203-guided-branches', instruction: '支架 2 / 3：保留 dummy 与循环，请补全命中时的 next 改写和未命中时的 curr 移动；注意两条分支不能都移动 curr。', checkKind: 'static-practice',
        scaffoldSource: `class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode curr = dummy;
        while (curr.next != null) {
            if (curr.next.val == val) {
                // TODO：修改 curr 所指对象的 next，跳过候选。
            } else {
                // TODO：候选保留，让 curr 变量移动过去。
            }
        }
        return dummy.next;
    }
}
`,
      },
      { id: '203-guided-whole', instruction: '支架 3 / 3：从方法骨架独立完成完整解法，再提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: '203-error-only-first', description: '只用一次 if 检查第一个节点，没有遍历整条链。', counterexampleInputId: '203-case-one-late-match', explanation: '目标值 7 到第五个节点才出现；只看首节点会原样返回，必须让循环逐个消耗待处理后缀。' },
    { id: '203-error-advance-after-delete', description: '跳过目标节点后仍无条件执行 curr=curr.next。', counterexampleInputId: '203-case-consecutive-middle', explanation: '跳过第一个 2 后，新的 curr.next 仍是 2；若 curr 立即前进，就会把这个新候选当成已处理节点而漏删，尾部删除还可能让 curr 变为 null。' },
    { id: '203-error-head-special-case', description: '直接从 head 开始，只能删除中间节点，连续头节点处理不完整。', counterexampleInputId: '203-case-leading-run', explanation: '三个开头的 4 都要删除。dummy 提供始终位于候选之前的节点，让删除头部与删除中间使用同一条 next 改写。' },
    { id: '203-error-value-as-identity', description: '把相同 val 的节点当作同一个对象，或按值去重保留节点。', counterexampleInputId: '203-case-repeated-kept', explanation: 'h0、h1、h3 都保存 5，但它们是三个独立节点且都应保留；本题只删除值等于目标 6 的节点。' },
  ],
  testSuite: {
    version: PROBLEM_META['203'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: '203-wrong-only-first', source: WRONG_ONLY_FIRST_SOURCE, targetedCaseIds: ['203-case-one-late-match', '203-case-classic-mixed', '203-case-all-remove'] },
      { id: '203-wrong-advance-after-delete', source: WRONG_ADVANCE_AFTER_DELETE_SOURCE, targetedCaseIds: ['203-case-single-remove', '203-case-consecutive-middle', '203-case-trailing-run', '203-case-all-remove'] },
    ],
  },
  visualization: {
    modelId: '203-dummy-filter-reference-graph', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson203;

export { WRONG_ADVANCE_AFTER_DELETE_SOURCE, WRONG_ONLY_FIRST_SOURCE } from './reference.js';
