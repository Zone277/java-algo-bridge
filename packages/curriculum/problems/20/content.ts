import { PROBLEM_META, type Lesson, type ValidParenthesesInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

type ValidParenthesesLesson = Extract<Lesson, { id: '20' }>;

export const demoInputs: { id: string; title: string; input: ValidParenthesesInput }[] = [
  { id: 'nested-valid', title: '多类型嵌套：([{}])', input: { s: '([{}])' } },
  { id: 'crossed-invalid', title: '交叉次序：([)]', input: { s: '([)]' } },
  { id: 'leading-close', title: '开头就是右括号：]', input: { s: ']' } },
];

const cases: ValidParenthesesLesson['testSuite']['cases'] = [
  { id: 'simple-pair', input: { s: '()' }, expected: { kind: 'boolean', value: true }, coverage: '最小配对：一次压栈、一次安全弹栈。' },
  { id: 'sequential-types', input: { s: '()[]{}' }, expected: { kind: 'boolean', value: true }, coverage: '三类括号顺序相邻，每对关闭后栈重新为空。' },
  { id: 'nested-valid', input: { s: '([{}])' }, expected: { kind: 'boolean', value: true }, coverage: '三层嵌套，必须按后进先出的相反顺序关闭。' },
  { id: 'wrong-type', input: { s: '(]' }, expected: { kind: 'boolean', value: false }, coverage: '数量相等但类型不匹配，抓住只计数的错误。' },
  { id: 'crossed-invalid', input: { s: '([)]' }, expected: { kind: 'boolean', value: false }, coverage: '数量与类型总数都相等，但关闭顺序交叉。' },
  { id: 'leading-close', input: { s: ']' }, expected: { kind: 'boolean', value: false }, coverage: '空栈遇右括号：必须在 pop 之前检查 isEmpty。' },
  { id: 'leftover-open', input: { s: '(' }, expected: { kind: 'boolean', value: false }, coverage: '扫描结束仍有左括号，必须返回 stack.isEmpty()。' },
  { id: 'deep-valid', input: { s: '{{[[(())]]}}' }, expected: { kind: 'boolean', value: true }, coverage: '较深嵌套与重复类型，验证栈保留每一层未匹配状态。' },
  { id: 'mixed-valid', input: { s: '(){[()]}' }, expected: { kind: 'boolean', value: true }, coverage: '顺序配对与嵌套配对混合，栈会多次清空和重建。' },
  { id: 'reverse-order', input: { s: '}{' }, expected: { kind: 'boolean', value: false }, coverage: '一开始就无法配对；后续左括号不能挽救早期错误。' },
];

export const COUNT_ONLY_SOURCE = `class Solution {
    public boolean isValid(String s) {
        int balance = 0;
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            if (current == '(' || current == '[' || current == '{') balance++;
            else balance--;
            if (balance < 0) return false;
        }
        return balance == 0;
    }
}
`;

export const MISSING_FINAL_EMPTY_SOURCE = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            if (current == '(' || current == '[' || current == '{') stack.push(current);
            else {
                if (stack.isEmpty()) return false;
                char open = stack.pop();
                if ((current == ')' && open != '(') || (current == ']' && open != '[') || (current == '}' && open != '{')) return false;
            }
        }
        return true;
    }
}
`;

export const POP_WITHOUT_EMPTY_CHECK_SOURCE = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            if (current == '(' || current == '[' || current == '{') stack.push(current);
            else {
                char open = stack.pop();
                if ((current == ')' && open != '(') || (current == ']' && open != '[') || (current == '}' && open != '{')) return false;
            }
        }
        return stack.isEmpty();
    }
}
`;

const guidedConditions = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            // TODO 1：识别左括号并 push。
            // TODO 2：对右括号先判空，再 pop 并比较类型。
            throw new UnsupportedOperationException("请补全当前字符的处理");
        }
        // TODO 3：检查是否还有未匹配的左括号。
        return false;
    }
}
`;

const guidedClosingBranch = `import java.util.ArrayDeque;

class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char current = s.charAt(i);
            if (current == '(' || current == '[' || current == '{') {
                stack.push(current);
                continue;
            }
            // TODO：先判断 stack.isEmpty()；非空时 pop，再检查左右括号类型。
            throw new UnsupportedOperationException("请完成右括号分支");
        }
        return stack.isEmpty();
    }
}
`;

export const lesson20 = {
  schemaVersion: 1,
  id: '20',
  slug: 'valid-parentheses',
  title: '有效的括号',
  order: 5,
  lessonVersion: PROBLEM_META['20'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J5', 'J8'],
  objectives: [
    '读懂 boolean 返回值、String.length()、charAt() 与 char 比较。',
    '从括号嵌套的关闭顺序推导出 ArrayDeque<Character> 栈。',
    '维护“栈恰好是已处理前缀中未匹配左括号”的不变量，并用真实 Java 返回值判定。',
  ],
  source: { platform: 'LeetCode', number: 20, url: 'https://leetcode.com/problems/valid-parentheses/' },
  taskSemantics: '给定一个只由圆、方、花括号组成的非空字符串 s。当每个右括号都关闭同类型、最近且尚未关闭的左括号，并且最终没有遗留左括号时，返回 true；否则返回 false。题意参考 LeetCode 20，本课题面、例子、图形与代码均为本站原创表达，与原平台无官方关联。',
  siteLimits: { description: '本站输入 s 长度为 1—10000，且只能包含 ()[]{}。参考演示为保持可读性最多显示 30 个字符；真实判题不使用演示轨迹。', inputSchemaId: 'ValidParenthesesInput' },
  steps: [
    { id: 'syntax-string-char', kind: 'syntax', title: 'J1 / J4 · boolean、String 与 char', body: '方法签名 public boolean isValid(String s) 表示返回基本类型 boolean。return true 或 return false 会结束方法；打印 true 不是交回答案。String 是对象类型，s 变量保存引用值，方法仍是按值接收这个引用值。s.length() 是字符串长度，带括号；它与数组的 nums.length 不同。s.charAt(i) 取下标 i 的 char，本题字符可用单引号常量 \'(\'、\']\' 和 == 比较。char 是一个 UTF-16 代码单元的基本类型，本题输入字符都在单个 char 内。', relatedIds: ['J1', 'J4'] },
    { id: 'syntax-deque-stack', kind: 'syntax', title: 'J2 / J5 · 循环与 ArrayDeque 栈', body: 'for (int i=0; i<s.length(); i++) 依次读取合法下标 0 到 length()-1。import java.util.ArrayDeque; 后，ArrayDeque<Character> stack = new ArrayDeque<>(); 创建栈。泛型不能写基本类型 char，所以使用 Character；Java 在本题位置自动装箱与拆箱。stack.push(c) 把 c 放在栈顶，pop() 移除并交回栈顶，peek() 只查看栈顶，isEmpty() 判断栈空。pop 空栈会抛 NoSuchElementException，必须先判空；ArrayDeque 也不接受 null 元素。', relatedIds: ['J2', 'J5'] },
    { id: 'understanding-brackets', kind: 'understanding', title: '读题与手算 · 类型和顺序都要正确', body: '输入 s="([{}])"。从左到右手算：读 ( 后栈为 [(；读 [ 后为 [(,[；读 { 后为 [(,[,{。随后 } 与栈顶 { 配对并消去，] 与新栈顶 [ 配对，) 再与 ( 配对，最终栈空，输出 true。输入与输出在本站用 JSON 表示为 {"s":"([{}])"} 和 {"kind":"boolean","value":true}，学生方法只需返回 boolean，不自己解析 JSON。对 "([)]"，第一个 ) 与栈顶 [ 类型不同，立即 false。', relatedIds: [] },
    { id: 'derivation-lifo', kind: 'derivation', title: '推导 · 为什么是后进先出', body: '只计左右括号数量无法区分 (] 的类型，也无法区分 ([)] 的交叉。嵌套结构要求：最后打开的那一层必须最先关闭，这恰好是后进先出。遇左括号就压栈；遇右括号时，先检查栈非空，再弹出最近的左括号并比较类型。任何一次无左括号或类型不符都能立即否定。全部字符读完后，只有栈空才是有效；否则尚有未关闭左括号。每个字符至多压栈或弹栈一次，时间 O(n)，栈最多保存 n 个左括号，空间 O(n)。本站不用几次运行耗时宣称已证明复杂度。', relatedIds: ['wrong-type', 'crossed-invalid', 'leftover-open'] },
    { id: 'derivation-stack-invariant', kind: 'derivation', title: '不变量 · 栈只保存未匹配左括号', body: '处理每个字符前后都维持：栈从底到顶恰好是已处理前缀中还未被匹配的左括号，并保持它们的出现顺序。读左括号时把它加到顶部，不变量继续成立。读右括号时，空栈表示它没有候选左括号；非空时只能与栈顶配对。类型正确后弹出，剩余栈再次恰好描述新前缀。演示的 stack.items 按“底到顶”显示，topIndex 在空栈时为 null，否则严格等于 items.length-1。', relatedIds: [] },
    { id: 'prediction-stack-result', kind: 'prediction', title: '先预测栈顶，再预测最终布尔值', body: '默认输入为 ([{}])。第一次压栈后先预测栈顶字符，再继续走到终态并选择方法返回 true 或 false。切换到 ] 时，第一个动态问题会改为“立即停止还是安全弹栈”。答案由当前不可变快照生成，提交后才揭示；预测不是学生 Java 代码的运行结果。', relatedIds: ['predict-first-top', 'predict-final-validity'] },
    { id: 'reference-stack-demo', kind: 'reference-demo', title: '参考算法状态演示', body: '参考解法 · 算法状态演示（非 JVM 调试）。变量表、栈图、栈顶标记、解释和代码高亮都读取同一份不可变快照。下一步、上一步、播放、暂停和重置只会选择已生成快照；切换输入会重建参考轨迹。学生编辑的 Java 不会改变该演示或伪造自己的运行轨迹。', relatedIds: ['nested-valid', 'crossed-invalid', 'leading-close'] },
    { id: 'guided-stack-code', kind: 'guided-code', title: '引导编写 · 从分支到完整方法', body: '第一段识别左括号并压栈；第二段专注右括号的“先判空、后弹栈、再比类型”；第三段从方法骨架独立复原算法。静态练习只是编写支架，不按填入字符串或源码是否像参考答案来判定。最终必须提交完整 Solution 到真实 Java runner，由可信调用器读取 boolean 返回值并跑本站用例。', relatedIds: ['guided-parentheses'] },
    { id: 'independent-parentheses', kind: 'independent-code', title: '独立挑战 · 从方法骨架开始', body: '独立模式只提供 import、Solution 和 isValid 方法骨架，不预填完整解法。先用 ([)]、] 和 ( 分别检查类型、空栈和终态剩余，再提交全部用例。编译错误看 javac 行号，空栈异常看异常类型与方法位置，错误答案从失败用例手算。只有真实 submit 通过全部本站测试才记录独立通过；查看答案、使用提示与引导通过会分别记录。', relatedIds: [] },
    { id: 'summary-parentheses', kind: 'summary', title: '复盘 · 用不变量解释每个分支', body: '请用自己的话回答：栈中元素对应已处理前缀的哪一部分？为什么右括号只能与栈顶配对？为什么 pop 前必须判空？为什么处理完不能无条件 return true？本站通过状态只表示通过本站测试，不宣称通过 LeetCode 官方评测。', relatedIds: [] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: 'a39f42f9b3dedd4e6d60cbbad43bc4491cad09756e17526880eb5f5b5ade0b98',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: REFERENCE_STEP_MAP.map(step => ({ ...step })),
  },
  hints: [
    { id: 'hint-lifo', level: 1, body: '问自己：嵌套中最后打开的括号应该在什么时候关闭？这会指向后进先出结构。' },
    { id: 'hint-invariant', level: 2, body: '让栈只保存已读前缀中未匹配的左括号。遇右括号时先 isEmpty()，否则弹出栈顶并对照类型。' },
    { id: 'hint-pseudocode', level: 3, body: '建 ArrayDeque<Character>；遍历 char；左括号 push；右括号时空栈立即 false，否则 pop 后按 ()、[]、{} 比较，不符立即 false；循环后 return stack.isEmpty()。' },
  ],
  predictionChecks: [
    { id: 'predict-first-top', prompt: '默认输入 ([{}])，读完第一个字符并执行栈操作后，栈顶字符是什么？', answer: { kind: 'text', value: '(' }, explanation: '第一个字符是左括号 (，压栈后它既是栈底也是栈顶。', checkpointId: 'first-stack-action' },
    { id: 'predict-final-validity', prompt: '继续手算 ([{}])：全部字符处理后，isValid 返回什么？', answer: { kind: 'choice', optionId: 'true' }, options: [{ id: 'true', label: 'true：有效' }, { id: 'false', label: 'false：无效' }], explanation: '右括号依次与最近的同类型左括号配对，最终栈空，返回 true。', checkpointId: 'final-result' },
  ],
  guided: {
    id: 'guided-parentheses',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-opening-condition', instruction: '支架 1 / 3：识别当前 char 是 (、[ 或 {，将左括号 push 进栈。补全后可用 () 实际运行。', scaffoldSource: guidedConditions, checkKind: 'static-practice' },
      { id: 'guided-closing-branch', instruction: '支架 2 / 3：左括号分支和最终判定已给出。补右括号分支：先判空，后弹栈，再检查三种类型。', scaffoldSource: guidedClosingBranch, checkKind: 'static-practice' },
      { id: 'guided-whole-stack', instruction: '支架 3 / 3：从 isValid 方法骨架写完整算法。完整源码发到真实 Java runner，通过本站用例后才记录引导通过。', scaffoldSource: STARTER_SOURCE, checkKind: 'static-practice' },
    ],
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-count-only', description: '只计左右括号的总数，没有检查栈顶类型和关闭顺序。', counterexampleInputId: 'crossed-invalid', explanation: '([)] 的左右数量都能平衡，但 ) 首先遇到的栈顶是 [，应立即 false。' },
    { id: 'error-missing-final-empty', description: '循环结束无条件 return true，遗漏栈中剩余的左括号。', counterexampleInputId: 'leftover-open', explanation: '输入 ( 全程没有不匹配右括号，但栈还有 (；最终必须返回 stack.isEmpty()，所以结果是 false。' },
    { id: 'error-pop-empty', description: '遇到右括号直接 pop，没有先检查空栈。', counterexampleInputId: 'leading-close', explanation: '输入 ] 的初始栈是空的。ArrayDeque.pop() 会抛 NoSuchElementException，而题目契约要求正常返回 false。' },
    { id: 'error-string-length-field', description: '把 String 长度写成 s.length，与数组 length 字段混淆。', counterexampleInputId: 'simple-pair', explanation: 'String 提供 length() 方法，写 s.length 会产生 javac 编译错误。数组才使用 nums.length。' },
  ],
  testSuite: {
    version: PROBLEM_META['20'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-count-only', source: COUNT_ONLY_SOURCE, targetedCaseIds: ['wrong-type', 'crossed-invalid'] },
      { id: 'wrong-missing-final-empty', source: MISSING_FINAL_EMPTY_SOURCE, targetedCaseIds: ['leftover-open'] },
      { id: 'wrong-pop-without-empty', source: POP_WITHOUT_EMPTY_CHECK_SOURCE, targetedCaseIds: ['leading-close', 'reverse-order'] },
    ],
  },
  visualization: { modelId: '20-unmatched-open-stack', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson;
