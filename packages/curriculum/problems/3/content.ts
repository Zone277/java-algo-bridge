import { LongestSubstringInputSchema, PROBLEM_META, expectedOutput, type Lesson, type LongestSubstringInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_CLEAR_WINDOW_SOURCE, WRONG_DISTINCT_COUNT_SOURCE, WRONG_LEFT_ROLLBACK_SOURCE } from './reference.js';

type Lesson3 = Extract<Lesson, { id: '3' }>;
type Case3 = Lesson3['testSuite']['cases'][number];

export const demoInputs: { id: string; title: string; input: LongestSubstringInput }[] = [
  { id: 'abba', title: '左边界不能回退："abba"', input: { s: 'abba' } },
  { id: 'pwwkew', title: '连续窗口："pwwkew"', input: { s: 'pwwkew' } },
  { id: 'spaces', title: '空格也是字符："a b a"', input: { s: 'a b a' } },
  { id: 'empty', title: '空字符串', input: { s: '' } },
];

function testCase(id: string, input: LongestSubstringInput, coverage: string): Case3 {
  const parsed = LongestSubstringInputSchema.parse(input);
  const expected = expectedOutput('3', parsed);
  if (expected.kind !== 'int') throw new Error('3 expected output must be int');
  return { id, input: parsed, expected, coverage };
}

const cases: Case3[] = [
  testCase('empty', { s: '' }, '空串是合法输入，最长长度为 0，循环一次也不执行。'),
  testCase('single', { s: 'x' }, '单字符窗口，检查长度公式 right-left+1。'),
  testCase('all-unique', { s: 'abcde' }, '全串无重复，窗口持续扩张到完整字符串。'),
  testCase('all-same', { s: 'bbbbb' }, '每次重复都把左端推进，答案保持 1。'),
  testCase('pwwkew', demoInputs[1]!.input, '全串有 4 种字符，但最长连续无重复子串仅为 3，区分子串和子序列。'),
  testCase('abba', demoInputs[0]!.input, '旧 a 已在当前窗口左侧，left 必须用 max 防止从 2 回退到 1。'),
  testCase('dvdf', { s: 'dvdf' }, '重复 d 后不能清空全部历史窗口；正确连续窗口是 vdf。'),
  testCase('single-space', { s: ' ' }, '一个空格是一个真实字符，不是空串；界面应可见显示。'),
  testCase('spaces', demoInputs[2]!.input, '空格重复会移动窗口，之后旧 a 不能让 left 回退。'),
  testCase('all-spaces', { s: '   ' }, '多个相同空格，验证空白字符的重复判定。'),
  testCase('printable-ascii', { s: 'A!a A' }, '大小写、标点和空格均在本站可打印 ASCII 范围内。'),
];

export const lesson3 = {
  schemaVersion: 1,
  id: '3',
  slug: 'longest-substring-without-repeating-characters',
  title: '无重复字符的最长子串',
  order: 10,
  lessonVersion: PROBLEM_META['3'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J4', 'J5', 'J8'],
  objectives: [
    '正确使用 String.length()、charAt() 与 char，并理解本站字符范围。',
    '用 HashMap<Character,Integer> 记录最近下标，维护连续无重复的半开窗口。',
    '解释 left 为什么只能前进，并用 abba 反例修正错误回退。',
  ],
  source: { platform: 'LeetCode', number: 3, url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
  taskSemantics: '给定字符串 s，返回其中不含重复字符的最长连续子串长度。子串必须由原字符串中相邻字符构成，不能跳过中间字符。题意参考 LeetCode 3；本站题面、示例、推导与代码为原创，与原平台无官方关联。',
  siteLimits: { description: '本站字符串长度 0—10000，只包含 U+0020—U+007E 可打印 ASCII；空格是合法字符，空串也是合法输入。此限制让一个 Java char 对应本站一个教学字符，不能据此宣称 char 对所有 Unicode 文本都代表完整字符。演示最多 30 项。', inputSchemaId: 'LongestSubstringInput' },
  steps: [
    {
      id: 'syntax-string', kind: 'syntax', title: 'J4 · String、length()、charAt() 与 char',
      body: 'Java 的 String 是对象，变量 s 保存引用值。字符串长度写 s.length()，有括号；数组长度才是 nums.length。s.charAt(i) 返回下标 i 的 char，合法下标是 0 到 s.length()-1。char 用单引号，例如 char c = \'a\'；String 用双引号，例如 String word = "a"，两者不是同一种类型。\nJava char 是一个 UTF-16 代码单元，并不总等于人眼中的完整 Unicode 字符。本站本题只接收可打印 ASCII，因此可以按 char 教学。空格 \' \' 是字符；字符串 " " 长度为 1，空串 "" 长度才是 0。',
      relatedIds: ['J4'],
    },
    {
      id: 'syntax-map', kind: 'syntax', title: 'J5 · HashMap<Character,Integer> 的最小用法',
      body: 'Map<Character,Integer> lastSeen = new HashMap<>(); 创建从字符到最近下标的映射。泛型不能写基本类型 char/int，因此使用包装类型 Character/Integer；put(current,right) 时 Java 会装箱，get 后参与 +1 时会拆箱。\ncontainsKey(current) 判断是否记录过；get(current) 取最近下标；put(current,right) 新增或覆盖该字符的位置。参考代码先 containsKey 再 get，避免把“不存在”得到的 null 当整数使用。算法不依赖 HashMap 的遍历顺序；教学表格只按模型的固定顺序展示状态。',
      relatedIds: ['J5'],
    },
    {
      id: 'understanding', kind: 'understanding', title: '原创题面 · 连续子串不是挑选子序列',
      body: '把字符串看成一排不能挪动的字符卡片。你可以截取一段相邻卡片，但不能跨过不想要的卡片。对 "pwwkew"，连续答案可以是 "wke" 或 "kew"，长度 3；虽然全串共有 p、w、k、e 四种字符，也不能跳着挑出 "pwke" 并回答 4，因为那是子序列。\n输入 " " 时输出 1，因为这一个空格本身是无重复连续子串。输入 "" 时输出 0。输入输出只要长度整数，不返回具体子串。',
      relatedIds: ['pwwkew', 'single-space', 'empty'],
    },
    {
      id: 'manual', kind: 'understanding', title: '手工模拟 · abba 中 left 不能回退',
      body: '手算 "abba"：开始窗口 [0,0)。读 a@0 后窗口 "a"、best=1；读 b@1 后窗口 "ab"、best=2；读第二个 b@2，旧 b 在 1，因此 left=max(0,1+1)=2，窗口变成 "b"。\n再读 a@3 时，Map 记得旧 a 在 0，但它已经位于当前窗口左侧。若直接写 left=0+1，会从 2 回退到 1，并把 "bba" 错当无重复窗口。正确写 left=max(2,0+1)=2，窗口是 "ba"，答案仍为 2。Map 可以记住窗口外的旧位置；max 负责忽略过期位置。',
      relatedIds: ['abba'],
    },
    {
      id: 'derivation', kind: 'derivation', title: '从重扫到滑动窗口',
      body: '直接办法以每个下标为起点向右重扫，遇重复停止，最坏 O(n²)。重复工作来自同一段字符被多次扫描。\n滑动窗口使用半开区间 [left,rightExclusive)，它始终对应 s 中一段连续、无重复的子串。处理 right 处字符 current 时，若它最近出现在 last，下一个合法左端至少是 last+1；同时 left 不能后退，所以写 left=max(left,last+1)。记录 current 的新位置后，窗口右端成为 right+1，长度是 right+1-left，再更新 best。\n不变量：窗口字符不重复且连续；left 单调不减；Map 保存所有已处理字符的最近下标；best 是已经出现过的最大合法窗口长度。right 每次前进，left 总共最多前进 n 次，期望时间 O(n)，Map 额外空间受字符种类数限制。本站运行时间不能单独证明复杂度。',
      relatedIds: [],
    },
    {
      id: 'prediction', kind: 'prediction', title: '先预测 best，再预测重复后的 left',
      body: '默认输入 "abba"。先预测处理第一个 a 后 best 的值；到第二个 b 时，再预测 left 应移动到哪个下标。提交数字后才揭示下一不可变快照。切换输入后答案重新计算；预测属于教学状态检查，不是 Java 编译执行。',
      relatedIds: ['predict-first-best', 'predict-duplicate-left'],
    },
    {
      id: 'reference-demo', kind: 'reference-demo', title: '参考窗口与 Map 状态演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。同一快照同时显示完整字符串上的半开窗口和 lastSeen Map；空格显示成 ␠。读到 current 时，它尚未加入窗口；移动 left 后再更新 Map 与 rightExclusive，因此每个展示窗口都真实连续且无重复。变量、窗口、Map、说明和代码高亮都读取同一个快照；上一步直接恢复历史状态。学生源码另走真实 runner。',
      relatedIds: [],
    },
    {
      id: 'guided-code', kind: 'guided-code', title: '引导编写 · 从防回退到完整窗口',
      body: '第一阶段补 left 的防回退表达式和窗口长度；第二阶段自己组织 Map、循环和更新顺序；第三阶段只保留方法骨架。静态练习不会靠匹配参考字符串判通过，最终必须提交完整 Solution 到真实 Java runner。',
      relatedIds: ['guided-3'],
    },
    {
      id: 'independent-code', kind: 'independent-code', title: '独立模式 · 先失败，再用反例定位',
      body: '独立草稿从方法骨架开始，与引导模式分别保存。先运行空串、空格、pwwkew、abba 和 dvdf；若 pwwkew 返回 4，检查是否误数全串不同字符；若 abba 返回 3，检查 left 是否回退；若 dvdf 返回 2，检查是否遇重复就清空全部窗口。修正后提交全部本站测试，只有当前源码的真实结果能记录通过。',
      relatedIds: [],
    },
    {
      id: 'summary', kind: 'summary', title: '复盘 · 给窗口写一句完整不变量',
      body: '请解释：String 与 char 有什么区别？为什么空格输入答案是 1？为什么 pwwkew 不能回答 4？Map 为什么保存最近下标？为什么必须 max(left,last+1)？半开窗口长度如何计算？\n本站分别保存预测、提示、答案查看、引导通过和独立模式通过。通过本站测试不是官方评测，页面访问或播放动画也不表示已经掌握。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '07a133882e5bf296c497ede4956240ffd37ecb32761f09bf9b32c72e9e0e2458', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: 'hint-concept', level: 1, body: '答案是一段相邻字符。让窗口右端逐字符前进；出现重复时，不必丢掉所有字符，只要越过造成冲突的旧位置。' },
    { id: 'hint-invariant', level: 2, body: '保持 [left,right+1) 内无重复，Map 记录字符最近下标。旧位置若已经小于 left，就属于窗口外，不能让 left 回退。' },
    { id: 'hint-pseudocode', level: 3, body: 'lastSeen 空、left=0、best=0；遍历 right：current=charAt(right)；若出现过，left=max(left,last+1)；put 当前下标；best=max(best,right-left+1)；返回 best。' },
  ],
  predictionChecks: [
    { id: 'predict-first-best', prompt: '输入 "abba"，处理下标 0 的 a 后，best 是多少？', answer: { kind: 'int', value: 1 }, explanation: '窗口 [0,1) 是 "a"，长度 1，所以 best 从 0 更新为 1。', checkpointId: 'first-best' },
    { id: 'predict-duplicate-left', prompt: '处理下标 2 的第二个 b 时，旧 b 在下标 1。left 应移动到多少？', answer: { kind: 'int', value: 2 }, explanation: 'left=max(0,1+1)=2，新窗口从第二个 b 开始。', checkpointId: 'first-duplicate-left' },
  ],
  guided: {
    id: 'guided-3',
    finalCheck: 'real-java-submit',
    stages: [
      { id: 'guided-updates', instruction: '支架 1 / 3：补 left 的 Math.max 表达式和 best 的窗口长度表达式，避免回退与少算一个字符。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char current = s.charAt(right);
            if (lastSeen.containsKey(current)) {
                left = Math.max(/* TODO：旧 left */, /* TODO：旧位置后一格 */);
            }
            lastSeen.put(current, right);
            best = Math.max(best, /* TODO：闭合 right 的窗口长度 */);
        }
        return best;
    }
}
` },
      { id: 'guided-window', instruction: '支架 2 / 3：自行补 Map、左右边界与更新顺序；删除异常。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // TODO：维护字符最近下标和不回退的连续窗口。
        throw new UnsupportedOperationException("请完成滑动窗口");
    }
}
` },
      { id: 'guided-whole', instruction: '支架 3 / 3：从方法骨架实现完整算法，最终提交完整 Java 到真实 runner。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
    ],
  },
  commonErrors: [
    { id: 'error-subsequence', description: '统计全串不同字符种数，把可跳过字符的子序列当成连续子串。', counterexampleInputId: 'pwwkew', explanation: 'p、w、k、e 共四种，但不存在长度 4 的连续无重复区间；最长连续窗口长度是 3。' },
    { id: 'error-left-rollback', description: '重复时直接令 left=last+1，使左边界被窗口外的旧位置拉回。', counterexampleInputId: 'abba', explanation: '第二个 b 已让 left=2；末尾 a 的旧位置 0 已过期，left 必须保持 2，不能回到 1。' },
    { id: 'error-clear-all', description: '遇到重复就清空整个窗口，丢掉仍可保留的连续后缀。', counterexampleInputId: 'dvdf', explanation: '第二个 d 只需越过第一个 d，保留 v，随后得到连续窗口 vdf，长度 3。' },
    { id: 'error-window-length', description: '把包含 right 的窗口长度写成 right-left，少算当前字符。', counterexampleInputId: 'single', explanation: '单字符时 right=left=0，正确长度是 right-left+1=1。半开写法则是 rightExclusive-left。' },
  ],
  testSuite: {
    version: PROBLEM_META['3'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-distinct-count', source: WRONG_DISTINCT_COUNT_SOURCE, targetedCaseIds: ['pwwkew'] },
      { id: 'wrong-left-rollback', source: WRONG_LEFT_ROLLBACK_SOURCE, targetedCaseIds: ['abba', 'spaces'] },
      { id: 'wrong-clear-window', source: WRONG_CLEAR_WINDOW_SOURCE, targetedCaseIds: ['dvdf'] },
    ],
  },
  visualization: { modelId: '3-last-seen-window', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(demo => demo.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson3;
