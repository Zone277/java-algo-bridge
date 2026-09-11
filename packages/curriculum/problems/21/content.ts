import { MergeListsInputSchema, PROBLEM_META, expectedMergedList, type Lesson, type MergeListsInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_CYCLE_SOURCE, WRONG_MISSING_REMAINDER_SOURCE, WRONG_NEW_NODES_SOURCE } from './reference.js';

type Lesson21 = Extract<Lesson, { id: '21' }>;
type Case21 = Lesson21['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: MergeListsInput }[] = [
  { id: 'interleave', title: '交替接入：[1,4,7] 与 [2,3,8]', input: { list1: [1, 4, 7], list2: [2, 3, 8] } },
  { id: 'duplicates', title: '同值不同对象：[1,2,2] 与 [1,2,3]', input: { list1: [1, 2, 2], list2: [1, 2, 3] } },
  { id: 'both-empty', title: '两条链都为空', input: { list1: [], list2: [] } },
  { id: 'left-empty', title: 'list1 为空，直接接 list2', input: { list1: [], list2: [1, 3] } },
];

function testCase(id: string, input: MergeListsInput, coverage: string): Case21 {
  const parsed = MergeListsInputSchema.parse(input);
  return { id, input: parsed, expected: expectedMergedList(parsed), coverage };
}

const cases: Case21[] = [
  testCase('both-empty', demoInputs[2]!.input, '两条空链返回 null；不能读取 null.val 或 null.next。'),
  testCase('left-empty', demoInputs[3]!.input, 'list1 为空，返回并复用完整 b 链；检查循环外剩余段。'),
  testCase('right-empty', { list1: [-2, 4], list2: [] }, 'list2 为空，返回并复用完整 a 链。'),
  testCase('single-each', { list1: [1], list2: [2] }, '两个单节点，只比较一次并连接剩余节点。'),
  testCase('interleave', demoInputs[0]!.input, '两条链多次交替选择，逐步覆盖 tail.next 和移动来源变量。'),
  testCase('duplicates', demoInputs[1]!.input, '相同数值来自不同 a*/b* 对象；不能按值合并身份。'),
  testCase('all-equal', { list1: [5, 5], list2: [5, 5, 5] }, '五个相同值仍须保留五个不同节点；跨链相等顺序可以不同。'),
  testCase('negative', { list1: [-5, -1, 2], list2: [-4, 0, 3] }, '负数、零和正数交替合并。'),
  testCase('one-dominates', { list1: [1, 2, 3], list2: [10, 11] }, '一条链全部较小，循环后必须接上另一条完整剩余链。'),
  testCase('value-bounds', { list1: [-100, 100], list2: [-100, 0, 100] }, '本站值域两端和跨链重复边界值。'),
];

export const lesson21 = {
  schemaVersion: 1,
  id: '21',
  slug: 'merge-two-sorted-lists',
  title: '合并两个有序链表',
  order: 7,
  lessonVersion: PROBLEM_META['21'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J6', 'J8'],
  objectives: [
    '区分 ListNode 对象身份、next 对象字段和引用变量绑定。',
    '使用哑节点和 tail 维护已合并前缀，并复用全部输入节点。',
    '用重复值、空链、剩余链段和成环反例验证结构，而非只看值序列。',
  ],
  source: { platform: 'LeetCode', number: 21, url: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  taskSemantics: '给定两条分别按非降序排列的单链表，复用其全部原节点，把它们重连成一条非降序、无环的链并返回头引用。相等值跨两条输入链的先后顺序不限，但每条原链内部相对顺序保持。题意参考 LeetCode 21；本站内容原创且无官方关联。',
  siteLimits: { description: '本站每条输入链 0—50 个节点，节点总数最多 100，值为 -100—100，输入链分别非降序。演示最多显示 30 个对象；真实判题仍覆盖本站公布范围。', inputSchemaId: 'MergeListsInput' },
  steps: [
    {
      id: 'syntax-list-node', kind: 'syntax', title: 'J6 · ListNode、null 与对象身份',
      body: '平台提供 ListNode：每个节点对象有基本类型字段 int val 和引用类型字段 ListNode next。list1、list2、tail 等变量保存引用值；并非所有 Java 变量都保存引用。null 表示变量或字段当前不引用对象，读取 null.val 会抛 NullPointerException。\n教学图用 a0、a1…标识 list1 原节点，用 b0、b1…标识 list2 原节点。a0.val 和 b0.val 即使都为 1，它们仍是两个对象。稳定 ID 只是教学编号，不是内存地址，也不表示 JVM 或 GC 状态。',
      relatedIds: ['J6'],
    },
    {
      id: 'syntax-reference', kind: 'syntax', title: 'J3 / J6 · 引用赋值与 next 字段修改',
      body: 'ListNode tail = dummy; 复制 dummy 的引用值，不复制对象。tail = tail.next; 只改变 tail 变量绑定。tail.next = list1; 则修改 tail 当前引用对象的 next 字段。Java 方法参数按值传递引用值：list1 = list1.next 不会修改调用者变量，但通过 list1.next 写字段会修改共享节点对象。\n静态预测：tail 与 dummy 都引用 d0，执行 tail = a0 后，dummy 仍引用 d0；若执行 dummy.next = a0，才把 d0 的字段改为引用 a0。此处没有执行 Java。',
      relatedIds: ['J3', 'J6'],
    },
    {
      id: 'syntax-dummy', kind: 'syntax', title: '为什么使用哑节点 d0',
      body: '第一个输出节点尚未确定时，直接维护结果头会产生额外分支。ListNode dummy = new ListNode(0); 创建辅助对象 d0，tail 初始引用它。每次统一写 tail.next，最终返回 dummy.next。d0.val=0 从不参与比较，也不是输入节点；本站允许这个辅助节点存在，但最终返回链必须只含 a*/b* 原节点，d0 不能出现在结果中。空链表用 null 表示，不需要造一个值为 0 的“空节点”。',
      relatedIds: [],
    },
    {
      id: 'understanding', kind: 'understanding', title: '原创题面与手工模拟 · 比较当前链头',
      body: '想象两列已经排好序的编号卡片，每张卡片还带着通向下一张的线。每次比较两列最前面的卡片，把较小的那个原对象接到输出尾部，再让对应输入变量前进；不能只抄数字创建一列新卡片。\n例：a0(1)→a1(4)→a2(7)，b0(2)→b1(3)→b2(8)。开始 d0.next=null、tail=d0。先令 d0.next=a0，再移动 list1=a1、tail=a0；随后令 a0.next=b0，移动 list2=b1、tail=b0；再接 b1、a1、a2。此时 list1=null，循环结束，把 tail.next 一次接到剩余 b2，返回 d0.next=a0。两个输入都空时返回 null。',
      relatedIds: ['interleave', 'both-empty'],
    },
    {
      id: 'derivation', kind: 'derivation', title: '合并不变量 · 前缀、两个后缀和 tail',
      body: '可以把所有值复制到数组、排序并新建节点，但这既增加 O(n+m) 额外对象，也违反本站复用原节点身份的要求。利用两条输入链各自有序，只需比较当前头。\n每轮循环边界的不变量是：从 dummy.next 到 tail（包含 tail）是已经确定的非降序前缀；list1 与 list2 分别引用两条尚未消费的有序后缀；这三部分包含全部原节点且互不重叠。选择较小头节点后依次做四件事：选择来源 → 修改 tail.next 接入该对象 → 移动对应来源变量 → tail 沿新边移动。修改 tail.next 后、来源变量移动前，所选对象会暂时同时被来源变量和新边引用，这是正常别名状态，不能在该微步骤强套循环边界分区。\n至少一条链为空后，另一条本来已经有序且所有值不小于已合并尾部，可整段接入。每个节点至多比较和移动一次，时间 O(n+m)，除辅助 d0 和固定引用变量外额外空间 O(1)。教学快照保存历史不计入参考 Java 算法空间。',
      relatedIds: [],
    },
    {
      id: 'prediction', kind: 'prediction', title: '先预测接入边，再预测 tail 绑定',
      body: '默认输入第一次比较 1 与 2，因此模型固定选择 a0。先预测执行 tail.next=list1 后 d0.next 指向哪个稳定 ID，再预测完成本轮后 tail 变量引用谁。答案填写对象 ID 而不是节点值。切换输入后检查点按新对象图计算；这是教学预测，不是 Java 执行结果。',
      relatedIds: ['predict-first-link', 'predict-first-tail'],
    },
    {
      id: 'reference-demo', kind: 'reference-demo', title: '参考对象图 · 字段边与变量绑定分层显示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。对象框中的 val 与 next 是对象状态；单独的绑定区显示 list1、list2、dummy、tail 当前引用谁。a*/b* 身份和位置不随相同值合并，d0 始终注明为辅助对象。下一步、上一步和重置只选择不可变快照，所以后退会恢复当时的 next 字段和所有变量绑定。变量不再直接指向某对象，不表示对象已被回收。',
      relatedIds: [],
    },
    {
      id: 'guided-code', kind: 'guided-code', title: '引导编写 · 从接一条边到完整方法',
      body: '第一阶段补循环条件、来源选择和 tail.next；第二阶段自己写完整循环，注意来源变量与 tail 分别移动；第三阶段回到方法骨架，补哑节点、剩余链和返回值。静态自检不判断源码字符串是否等于参考答案，最后完整 Java 必须提交真实 runner 并通过结构判定。',
      relatedIds: ['guided-21'],
    },
    {
      id: 'independent-code', kind: 'independent-code', title: '独立挑战 · 从方法骨架真实运行',
      body: '独立模式只给方法骨架，与引导草稿分开保存。先运行两条空链、单边为空、重复值和交替输入；值顺序看似正确仍可能新建了节点、丢了剩余段或形成环。编译错误看 javac 行列，运行异常检查 null，超时检查环，错误答案查看对象身份和 next 反馈。只有当前完整提交通过才记录“通过本站测试”。',
      relatedIds: [],
    },
    {
      id: 'summary', kind: 'summary', title: '复盘 · 用对象和引用语言解释',
      body: '请解释：d0 为什么不属于结果？tail.next=list1 改了什么？list1=list1.next 改了什么？为什么相同值节点不能合并？循环外为什么能整段接剩余链？\n本站分别记录预测、提示、看过答案、引导通过和独立模式通过。页面访问或动画播放不等于掌握；通过本站测试也不代表 LeetCode 官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: 'f232fbdaa27b98b4e710899b78fb0d340c981fbc0125c5d80f85dc07319f81f2', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-concept', level: 1, body: '每次只看两条剩余链的当前头，较小节点一定是整个剩余集合的最小值。接的是原节点对象，不是它的 val。' },
    { id: 'hint-invariant', level: 2, body: '让 dummy.next 到 tail 表示已合并前缀，list1/list2 表示两个未消费后缀。每轮接入一个节点后，来源变量与 tail 都要各移动一次。' },
    { id: 'hint-pseudocode', level: 3, body: 'dummy、tail←d0；两链都非空时比较 val，把 tail.next 接到较小头，移动该输入变量，再 tail←tail.next；循环后 tail.next 接非空剩余链；返回 dummy.next。' },
  ],
  predictionChecks: [
    { id: 'predict-first-link', prompt: '默认输入第一次选择 a0。执行 d0.next=list1 后，d0.next 指向谁？', answer: { kind: 'text', value: 'a0' }, explanation: '修改的是 d0 的 next 字段，它开始引用原节点 a0；list1 此刻也仍引用 a0。', checkpointId: 'first-link' },
    { id: 'predict-first-tail', prompt: '第一次接入 a0 并移动来源变量后，tail=tail.next 会让 tail 引用谁？', answer: { kind: 'text', value: 'a0' }, explanation: 'd0.next 已是 a0，因此 tail 从 d0 沿这条新边移动到 a0。', checkpointId: 'first-tail' },
  ],
  guided: {
    id: 'guided-21',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-attach', instruction: '支架 1 / 3：补 while 条件、比较条件和两个 tail.next 右侧表达式；每次必须接入原节点。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (/* TODO：两条剩余链都非空 */) {
            if (/* TODO：选择较小头，相等时任选稳定规则 */) {
                tail.next = /* TODO：list1 当前节点 */;
                list1 = list1.next;
            } else {
                tail.next = /* TODO：list2 当前节点 */;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
` },
      { id: 'guided-loop', instruction: '支架 2 / 3：保留哑节点，请自己完成循环、来源变量移动、tail 移动和剩余链连接；删除异常。', checkKind: 'static-practice', scaffoldSource: `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        // TODO：逐个接入较小节点，再一次接上剩余链。
        throw new UnsupportedOperationException("请完成合并循环");
    }
}
` },
      { id: 'guided-whole', instruction: '支架 3 / 3：从方法骨架写完整解法，最终把完整 Solution 提交真实 Java runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: 'error-new-nodes', description: '按正确值顺序 new 新节点，值看似正确但没有复用输入身份。', counterexampleInputId: 'all-equal', explanation: '五个值都是 5 也仍对应 a0、a1、b0、b1、b2。本站检查实际返回对象身份，新节点不会冒充原节点。' },
    { id: 'error-remainder', description: 'while 结束后直接返回，漏接仍非空的剩余链。', counterexampleInputId: 'one-dominates', explanation: '接完 1、2、3 后 list2 仍指向 10→11；它已整体有序，应令 tail.next 指向该后缀。' },
    { id: 'error-tail', description: '接入后忘记 tail=tail.next，下一轮覆盖同一条边并丢节点。', counterexampleInputId: 'interleave', explanation: '若 tail 始终停在 d0，反复写 d0.next 只保留最后一次接入的入口，前面节点从返回头不可达。' },
    { id: 'error-cycle', description: '把 tail.next 指回 tail 或已合并前缀，产生环。', counterexampleInputId: 'single-each', explanation: '值序列无法完整遍历；可信调用器有界检测对象身份和 next，环会失败而不是无限序列化。' },
  ],
  testSuite: {
    version: PROBLEM_META['21'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-new-nodes', source: WRONG_NEW_NODES_SOURCE, targetedCaseIds: ['left-empty', 'single-each', 'duplicates', 'all-equal'] },
      { id: 'wrong-missing-remainder', source: WRONG_MISSING_REMAINDER_SOURCE, targetedCaseIds: ['left-empty', 'right-empty', 'one-dominates'] },
      { id: 'wrong-cycle', source: WRONG_CYCLE_SOURCE, targetedCaseIds: ['both-empty', 'single-each', 'interleave'] },
    ],
  },
  visualization: { modelId: '21-dummy-merge', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson21;
