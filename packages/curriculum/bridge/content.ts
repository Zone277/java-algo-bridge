import type { BridgeId, BridgeUnit } from '@jab/contracts';

export const bridgePrerequisites: Record<string, BridgeId[]> = {
  '704': ['J1','J2','J8'], '283': ['J1','J2','J3','J8'], '977': ['J1','J2','J3','J8'],
  '1': ['J1','J2','J3','J5','J8'], '20': ['J1','J2','J4','J5','J8'], '3': ['J1','J2','J4','J5','J8'],
  '206': ['J1','J2','J3','J6','J8'], '21': ['J1','J2','J3','J6','J8'],
  '104': ['J1','J2','J3','J7','J8'], '70': ['J1','J2','J3','J8'],
};
const unit = (id: BridgeId, title: string, objective: string, cComparison: string, javaSource: string, explanation: string, prompt: string, answer: number, feedback: string): BridgeUnit => ({
  id, version: 'bridge-v1', title, objectives: [objective], cComparison, javaSource, explanation,
  prediction: { id: `${id}-check`, checkpointId: `${id}-check`, prompt, answer: { kind: 'int', value: answer }, explanation: feedback },
  relatedProblems: Object.entries(bridgePrerequisites).filter(([, ids]) => ids.includes(id)).map(([problem]) => problem as BridgeUnit['relatedProblems'][number]),
});
export const bridgeUnits: BridgeUnit[] = [
  unit('J1', '方法：从 C 函数到 Solution', '把输入、参数、返回值对应起来。', 'C 函数可以写在文件中；Java 本题方法放在类中，由平台创建对象调用。',
    'class Solution {\n    public int add(int a, int b) {\n        return a + b;\n    }\n}',
    'public int add(int a, int b) 中 int 是返回类型。return 结束方法并交回值。只读调用示意：new Solution().add(2, 5)。本站真实调用器按题调用 search 或 reverseList，因此题目编辑器无需 main。打印文字不等于返回答案。', '调用 add(2, 5) 返回多少？', 7, 'a 与 b 接收整数值，return a + b 返回 7。'),
  unit('J2', '基本类型、数组下标与循环', '区分 int 和 boolean，读懂 length 与边界。', 'Java 的 while 条件必须是 boolean，不能用 C 风格 while(1)；变量要先初始化。',
    'class Basics {\n    int last() {\n        int[] nums = {2, 6, 10};\n        int i = 0;\n        while (i < nums.length - 1) i++;\n        return nums[i];\n    }\n}',
    'int 是基本类型，boolean 表示真假，char 是一个 UTF-16 代码单元。数组有 length 字段而非 length()；合法下标 0 到 length - 1。== 比较，= 赋值。Java 整数除法舍去小数部分。', 'last() 返回哪个整数？', 10, 'i 依次为 0、1、2，最后读取 nums[2]，返回 10。'),
  unit('J3', '数组对象、引用值与按值传参', '区分修改对象和重新绑定变量。', '可用 C 指针别名帮助理解，但 Java 引用不是可做地址运算的裸指针。',
    'class Aliases {\n    int sample() {\n        int[] a = {2, 4};\n        int[] b = a;\n        b[0] = 9;\n        b = new int[]{7};\n        return a[0];\n    }\n}',
    '数组是对象；a 和 b 是保存引用值的变量。b = a 复制引用值，不复制数组。b[0] 修改共享对象；b = new int[]{7} 只改变 b 的绑定。Java 参数始终按值传递；传入引用值时，方法可改共享对象，却不能通过参数重新绑定调用方变量。本图解不承诺物理布局。', 'sample() 最后返回 a[0] 的什么值？', 9, '共享旧数组先被改成 [9,4]；b 后来指向新数组不会把 a 改回去。'),
  unit('J4', 'String 与 char', '使用 length()、charAt() 和 equals()。', 'Java String 不用 C 的结尾零字符协议；内容比较用 equals，不能把 == 当内容比较。',
    'class Text {\n    int sample() {\n        String s = "aba";\n        char c = s.charAt(1);\n        return c == \'b\' && s.equals("aba") ? s.length() : -1;\n    }\n}',
    'String.length() 有括号；数组 length 没有。char 用单引号，String 用双引号。charAt 下标从 0 开始。char 恰一个 UTF-16 代码单元，不总是完整 Unicode 字符；本站相关字符串题使用明确的 ASCII 输入范围。', 'sample() 返回多少？', 3, '下标 1 是 b，字符串内容相等，长度为 3。'),
  unit('J5', '集合：Map、Set 与栈', '只学当前算法所需的查找、去重和栈操作。', 'Java 集合代替手写动态表；泛型里用 Integer/Character 包装类型，不写 HashMap<int,int>。',
    'import java.util.*;\nclass CollectionsDemo {\n    int sample() {\n        HashMap<Integer, Integer> seen = new HashMap<>();\n        seen.put(8, 0);\n        HashSet<Integer> unique = new HashSet<>();\n        unique.add(8); unique.add(8);\n        ArrayDeque<Integer> stack = new ArrayDeque<>();\n        stack.push(seen.get(8)); stack.push(unique.size());\n        return stack.pop();\n    }\n}',
    'Map.put 保存键值，containsKey 判断存在再 get；Set.add 去重。int 与 Integer 可自动装箱/拆箱，null 拆箱会异常。ArrayDeque.push/pop/peek 按栈顶操作，pop 前检查 isEmpty；ArrayDeque 不接收 null。', 'sample() 最后弹出多少？', 1, 'Set 中重复的 8 只保留一个，size 为 1；后压入的 1 先弹出。'),
  unit('J6', 'ListNode：变量绑定与 next 字段', '理解保存后继、改链、移动引用的差别。', 'C 链表经验可迁移；Java 用 null 判断空引用，用点访问字段，不进行指针算术。',
    'class ListNode {\n    int val; ListNode next;\n    ListNode(int val) { this.val = val; }\n}\nclass References {\n    int sample() {\n        ListNode a = new ListNode(5);\n        ListNode b = new ListNode(5);\n        a.next = b;\n        ListNode head = a;\n        head = head.next;\n        return a.next.val;\n    }\n}',
    '两个 val 都是 5 的节点仍是不同对象。head = head.next 只改变 head 的绑定，不修改 a.next，也不自动删除或回收 a。a.next = null 才是改对象字段。反转时先 ListNode next = curr.next 保存后继，再 curr.next = prev，最后移动 prev/curr。稳定 h0/h1 是教学编号，不是地址或 GC 承诺。', 'sample() 返回 a.next.val 的什么值？', 5, 'head 的重新绑定没有改变 a.next；它仍指向值为 5 的 b。'),
  unit('J7', 'TreeNode 与递归返回', '区分调用栈帧和树对象。', '类似 C 递归，每次调用有自己的局部变量；返回值交给上一层，不会把对象复制成一棵新树。',
    'class TreeNode { int val; TreeNode left, right; }\nclass Depth {\n    int depth(TreeNode root) {\n        if (root == null) return 0;\n        int left = depth(root.left);\n        int right = depth(root.right);\n        return 1 + Math.max(left, right);\n    }\n}',
    '空树深度为 0；非空节点等左右子树返回后，加 1。图中的节点 ID 表示树对象，栈帧 ID 表示某次调用，两者不是同一事物。每层的 left/right 互相独立。', '只有根节点、左右孩子均 null 时 depth 返回多少？', 1, '左右递归各返回 0，根调用返回 1 + max(0,0) = 1。'),
  unit('J8', '读懂失败，再构造反例', '区分编译错误、异常、错误答案和超时。', '与 C 一样，“能编译”不等于算法正确；Java 异常通常提供异常类型与源码位置。',
    'class Mistake {\n    int last(int[] nums) {\n        return nums[nums.length];\n    }\n}',
    '这段合法语法可编译，但非空数组运行会越界。读 javac 行号修语法；读异常定位非法操作；错误答案先手算最小反例；超时检查循环是否推进。Docker 不可用是基础设施问题，不是你的算法错误。微课预测只是静态检查，真实代码请返回题目编辑器运行。', '若 nums 有 3 项，最大合法下标是多少？', 2, '下标为 0、1、2；nums.length 等于 3，不能拿它当最后下标。'),
];
