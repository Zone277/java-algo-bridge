import { expectedReversedList, LINKED_STARTER_SOURCE, type Lesson, type LinkedListInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

export const demoInputs: { id: string; title: string; input: LinkedListInput }[] = [
  { id: 'duplicates', title: '相同值，不同节点：5 → 5 → 8', input: { head: [5, 5, 8] } },
  { id: 'empty', title: '空链表', input: { head: [] } },
  { id: 'singleton', title: '一个节点', input: { head: [7] } },
  { id: 'two', title: '两个节点', input: { head: [2, 9] } },
];
const caseDefinitions = [
  { id: 'empty', head: [], coverage: '空输入返回 null，不读取 null.next。' },
  { id: 'singleton', head: [7], coverage: '单节点身份不变，next 仍为 null。' },
  { id: 'two', head: [2, 9], coverage: '反转一条边，旧头必须成为尾；暴露环与丢链。' },
  { id: 'duplicates', head: [5, 5, 8], coverage: '两个 5 具有不同身份 h0/h1，不能按值合并。' },
  { id: 'all-equal', head: [4, 4, 4, 4], coverage: '值序列不变，但节点身份顺序必须完全反转。' },
  { id: 'negative', head: [-4, -1, -8], coverage: '负值及非有序输入；无大小比较需求。' },
  { id: 'zero', head: [0, 3, 0, -2], coverage: '零和重复值保持，原节点无丢失。' },
  { id: 'value-bounds', head: [-5000, 0, 5000], coverage: '本站值域两端。' },
  { id: 'longer', head: Array.from({ length: 30 }, (_, i) => i % 7), coverage: '多轮断链与绑定恢复；演示长度上限。' },
];
const scaffold1 = `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = /* 保存后继 */;
            curr.next = /* 指向已反转部分 */;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
`;
const scaffold2 = `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            // 按顺序保存后继、反转字段、移动 prev、移动 curr。
        }
        return prev;
    }
}
`;
export const lesson206 = {
  schemaVersion: 1, id: '206', slug: 'reverse-linked-list', title: '反转链表', order: 6, lessonVersion: '206-v1',
  prerequisites: ['J1', 'J2', 'J3', 'J6', 'J8'],
  objectives: ['区分引用变量绑定和节点 next 字段。', '先保存后继再改链，复用每个原节点。', '用重复值身份与空链表反例检查自己的 Java。'],
  source: { platform: 'LeetCode', number: 206, url: 'https://leetcode.com/problems/reverse-linked-list/' },
  taskSemantics: '反转单链表，返回新头节点。本站按原对象身份检查：每个原节点恰好一次、值不变、边方向反转、无环且尾为 null。',
  siteLimits: { description: '本站判题 0—5000 个节点，值为 -5000—5000。演示至多 30 节点、2000 快照。空链表是合法输入。', inputSchemaId: 'LinkedListInput-v1' },
  steps: [
    { id: 'syntax-method', kind: 'syntax', title: 'J1 · 输入和返回都是引用值', body: 'public ListNode reverseList(ListNode head) 接收链表头的引用值，返回新头的引用值。平台提供 ListNode 类、创建输入链并调用方法，因此你不用编写 main 或重复声明 ListNode。int val 是基本类型字段，ListNode next 是引用类型字段；并非所有 Java 变量都保存引用。\nC 中常用结构体指针表达后继。Java 使用对象引用，不提供这里可操作的物理地址；null 表示未引用对象，读取 null.next 会发生 NullPointerException。', relatedIds: ['J1', 'J6'] },
    { id: 'syntax-reference', kind: 'syntax', title: 'J6 · 变量赋值与字段修改', body: 'ListNode curr = head; 复制的是引用值，不会复制节点。curr = curr.next; 只改变 curr 的绑定；curr.next = prev; 才修改 curr 引用的那个对象的 next 字段。\nJava 方法参数按值传递：head 是调用者传入引用值的副本。方法内 head = head.next 不会自动改变调用者变量，也不会自动删除或回收节点；修改 head.next 则可通过别名观察到对象字段变化。\n预测自检：a 和 b 都引用 h0，执行 a = null 后，b 仍引用 h0；此处是静态教学检查。引用图中的 h0 是稳定教学编号，不是内存地址，也不承诺 GC 或 JVM 内存布局。', relatedIds: ['J6'] },
    { id: 'understanding', kind: 'understanding', title: '读题与手工改链', body: '把一串带编号的小盒子串起来，每个盒子保存数字和通向下一个盒子的线。要让线反向，并返回新的起点，不能只把数字逆序写回。\n输入 head=[5,5,8] 对应 h0(5)→h1(5)→h2(8)→null；输出从 h2 出发：h2(8)→h1(5)→h0(5)→null。两个 5 是不同对象。\n手算第一轮：prev=null，curr=h0。先保存 next=h1，再令 h0.next=null，然后 prev=h0、curr=h1。第二轮保存 next=h2，令 h1.next=h0，移动 prev=h1、curr=h2。第三轮保存 next=null，令 h2.next=h1，移动 prev=h2、curr=null，返回 h2。空链表直接返回 null；单节点仍返回原节点。', relatedIds: ['duplicates', 'empty', 'singleton'] },
    { id: 'derivation', kind: 'derivation', title: '推导 · 为什么必须先保留后继', body: '可以用栈保存每个原节点引用，再依次弹出改链，时间 O(n)、额外空间 O(n)。本题迭代办法只需要 prev、curr、next 三个引用变量，额外空间 O(1)。新建一串值相同的节点不满足本站复用身份约束。\n循环边界不变量：prev 指向已处理前缀的反向链；curr 指向尚未处理后缀，两部分不重叠且覆盖全部原节点。初始 prev=null、curr=head。\n循环内分四步：① next=curr.next 保留后继；② curr.next=prev 改当前对象字段；③ prev=curr 扩展反向前缀；④ curr=next 前进到后缀。一轮后未处理节点数少一。第二步刚结束时 curr 仍指向刚改链节点，不能在这个瞬间强套循环边界的分区断言；剩余后缀由 next 保住。\n循环结束 curr=null，所有节点都在 prev 链。每个节点处理一次，时间 O(n)。对象图快照是教学实现，会存储多份状态，不是参考 Java 算法额外空间复杂度。', relatedIds: [] },
    { id: 'prediction', kind: 'prediction', title: '先预测引用，再揭示', body: '在默认重复值例子中，先预测保存后继后 next 的身份，再预测改链后 h0.next 的身份。填写 h1 或 null 等引用编号，不填写节点的数字值。答错后解释再揭示；这不是实际 Java 执行检查。', relatedIds: ['predict-save', 'predict-reverse'] },
    { id: 'reference-demo', kind: 'reference-demo', title: '参考对象图演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。图中对象始终保持原 ID 和位置，变量绑定单独一层显示，边是对象 next 字段。暂时不由某变量直接引用的节点仍显示，不能据此声称已被 GC。后退直接恢复同一历史快照的字段、绑定和高亮。', relatedIds: [] },
    { id: 'guided-code', kind: 'guided-code', title: '三步引导编写', body: '先补保存后继与改链两个表达式，再自行编写完整循环体，最后从方法骨架组织整个方法。支架检查只用于学习；最终必须提交完整 Java 到真实容器，由结构化身份判定检查。正确的其他写法或变量名同样允许。', relatedIds: ['guided-206'] },
    { id: 'independent-code', kind: 'independent-code', title: '独立编写与真实反馈', body: '从方法骨架开始，不自动填入参考解法。先运行空、单、双节点和重复值输入。编译错误先看 javac 行号；空指针异常检查访问前的 null；错误答案检查新头与全部节点；超时检查环或 curr 是否前进。完整提交通过只称“通过本站测试”。', relatedIds: [] },
    { id: 'summary', kind: 'summary', title: '解释你的四步顺序', body: '请不用看答案解释：为什么 next 必须先保存？哪一步修改对象字段？哪两步只修改变量？重复值为什么不能识别节点？最后返回哪个引用？页面访问和播放不是掌握证据；预测、引导通过、独立通过、提示与答案使用分别记录。', relatedIds: [] },
  ],
  starter: { source: LINKED_STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: LINKED_STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '5e2766a1850af0f18e3aa71498fa7b9d1a0090cdb71d899334371d5d117d727a', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-concept', level: 1, body: '你需要改变后继方向，不需要改变节点数字。先想清楚旧头最后应指向谁。' },
    { id: 'hint-invariant', level: 2, body: '维护 prev 反向前缀与 curr 未处理后缀。改 curr.next 前必须另存原后继。' },
    { id: 'hint-pseudocode', level: 3, body: 'prev←null，curr←head；curr 非空时：next←curr.next；curr.next←prev；prev←curr；curr←next。结束返回 prev。' },
  ],
  predictionChecks: [
    { id: 'predict-save', prompt: 'h0(5)→h1(5)→h2(8)，第一轮保存后继后 next 引用谁？', answer: { kind: 'text', value: 'h1' }, explanation: '复制 h0.next 的引用值 h1，不复制数值 5 或节点。', checkpointId: 'first-save' },
    { id: 'predict-reverse', prompt: '第一轮 curr.next=prev 后 h0.next 指向谁？', answer: { kind: 'text', value: 'null' }, explanation: 'prev 初始为 null，旧头成为尾；后缀仍由 next=h1 保存。', checkpointId: 'first-reverse' },
  ],
  guided: { id: 'guided-206', stages: [
    { id: 'guided-fields', instruction: '补两个表达式：保存原后继，再把当前字段接到 prev。', scaffoldSource: scaffold1, checkKind: 'static-practice' },
    { id: 'guided-loop', instruction: '独立写出四条循环语句；注意读取旧 next 的时机。', scaffoldSource: scaffold2, checkKind: 'static-practice' },
    { id: 'guided-complete', instruction: '从方法骨架实现完整流程，再提交真实 Java。', scaffoldSource: LINKED_STARTER_SOURCE, checkKind: 'static-practice' },
  ], finalCheck: 'real-java-submit' },
  commonErrors: [
    { id: 'error-lost', description: '改 curr.next 后才取 curr.next，丢失后缀入口。', counterexampleInputId: 'two', explanation: '第一轮 curr.next 变为 null，再令 curr=curr.next 会过早停止。先保存原后继。' },
    { id: 'error-cycle', description: '让旧后继指回自己，却保留旧头的前向边，形成环。', counterexampleInputId: 'two', explanation: 'h0.next=h1 且 h1.next=h0 是环。本站有界检查身份和字段，不会因值看起来逆序就通过。' },
    { id: 'error-new', description: '新建节点或只交换 val，值序列正确但身份错误。', counterexampleInputId: 'all-equal', explanation: '四个 4 仍对应 h0…h3；必须返回 h3 并依次复用原节点。' },
    { id: 'error-head', description: '最终返回旧 head 而不是 prev。', counterexampleInputId: 'duplicates', explanation: '旧 head=h0 已成为尾，返回它会丢失其他节点的可达性。' },
  ],
  testSuite: { version: '206-tests-v1', cases: caseDefinitions.map(({ id, head, coverage }) => ({ id, input: { head }, expected: expectedReversedList({ head }), coverage })), wrongFixtures: [
    { id: 'wrong-lost-next', source: 'class Solution { public ListNode reverseList(ListNode head) { ListNode p=null,c=head; while(c!=null){c.next=p;p=c;c=c.next;} return p; } }', targetedCaseIds: ['two', 'duplicates'] },
    { id: 'wrong-cycle', source: 'class Solution { public ListNode reverseList(ListNode head) { if(head!=null && head.next!=null){head.next.next=head;return head.next;} return head; } }', targetedCaseIds: ['two', 'duplicates'] },
    { id: 'wrong-new-nodes', source: 'class Solution { public ListNode reverseList(ListNode head) { ListNode p=null; while(head!=null){p=new ListNode(head.val,p);head=head.next;} return p; } }', targetedCaseIds: ['singleton', 'all-equal'] },
  ] },
  visualization: { modelId: '206-reference', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(d => d.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
