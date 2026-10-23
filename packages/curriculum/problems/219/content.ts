import { NearbyDuplicateInputSchema, PROBLEM_META, expectedOutput, type Lesson, type NearbyDuplicateInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE, WRONG_KEEP_FIRST_SOURCE, WRONG_STORE_FIRST_SOURCE } from './reference.js';

type Lesson219 = Extract<Lesson, { id: '219' }>;
export const demoInputs: { id: string; title: string; input: NearbyDuplicateInput }[] = [
  { id: 'refresh-nearest', title: '远处重复后更新最近位置：[6,1,2,6,6]，k=1', input: { nums: [6, 1, 2, 6, 6], k: 1 } },
  { id: 'distance-equal', title: '恰好等于 k：[4,1,4]，k=2', input: { nums: [4, 1, 4], k: 2 } },
  { id: 'too-far', title: '有重复但太远：[4,1,4]，k=1', input: { nums: [4, 1, 4], k: 1 } },
  { id: 'zero-distance', title: '不能自己配自己：[5,5]，k=0', input: { nums: [5, 5], k: 0 } },
  { id: 'all-unique', title: '全部不同：[3,-2,8]，k=100000', input: { nums: [3, -2, 8], k: 100000 } },
];
function testCase(id: string, input: NearbyDuplicateInput, coverage: string): Lesson219['testSuite']['cases'][number] {
  const parsed = NearbyDuplicateInputSchema.parse(input);
  const expected = expectedOutput('219', parsed);
  if (expected.kind !== 'boolean') throw new Error('219 必须返回 boolean');
  return { id, input: parsed, expected, coverage };
}
const farBoundary = [...Array.from({ length: 9999 }, (_, index) => index), 0];
const cases = [
  testCase('single-zero', { nums: [7], k: 0 }, '最小数组与最小 k；不同下标不能由同一个元素构成。'),
  testCase('single-large-k', { nums: [7], k: 100000 }, '即使 k 最大，只有一个位置仍然为 false。'),
  testCase('adjacent', { nums: [5, 5], k: 1 }, '最早可以成功的位置是下标 1，检验提前返回。'),
  testCase('distance-equal', demoInputs[1]!.input, '距离恰为 k，必须使用 <= 而不是 <。'),
  testCase('too-far', demoInputs[2]!.input, '重复值间距超过 k；不能直接照搬 217 的判重。'),
  testCase('refresh-nearest', demoInputs[0]!.input, '第一次同值距离过大仍要覆盖旧下标；之后 3 与 4 距离为 1。'),
  testCase('zero-distance', demoInputs[3]!.input, 'k=0 且有相邻重复也为 false；排除先存再查产生的自配。'),
  testCase('all-unique', demoInputs[4]!.input, '所有值不同，较大的 k 不会凭空产生重复。'),
  testCase('negative-zero', { nums: [-8, 0, -8], k: 2 }, '负数键与零合法，Map 键是数组值，值才是下标。'),
  testCase('value-boundaries', { nums: [-1000000000, 1000000000, -1000000000], k: 2 }, '元素完整值域两端；比较的是整数内容，不能依赖 Integer 引用相等。'),
  testCase('many-equal', { nums: [2, 2, 2, 2], k: 1 }, '多次重复时第一个合法配对即可返回，不必扫描后缀。'),
  testCase('last-position', { nums: [8, 1, 2, 3, 8], k: 4 }, '合法配对在最后一项才出现，不能少检查末项。'),
  testCase('max-k', { nums: [0, 1, 0], k: 100000 }, 'k 可以大于数组长度，无需按 k 分配数组或窗口。'),
  testCase('site-limit-unique', { nums: Array.from({ length: 10000 }, (_, index) => index), k: 100000 }, '本站最大长度 10000 与最大 k，所有键不同，真实 Java 必须检查全部。'),
  testCase('site-limit-equal', { nums: [...farBoundary], k: 9999 }, '最大长度下只有首尾相等，距离正好 9999 应为 true。'),
  testCase('site-limit-too-far', { nums: [...farBoundary], k: 9998 }, '最大长度首尾重复但距离比 k 大 1，应为 false。'),
];

export const lesson219 = {
  schemaVersion: 1, id: '219', slug: 'contains-duplicate-ii', title: '存在重复元素 II', order: 30,
  lessonVersion: PROBLEM_META['219'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J5', 'J8'],
  objectives: [
    '用 Map<Integer,Integer> 把元素数值映射到最近下标，理解装箱、拆箱、containsKey、get 与 put。',
    '从全配对检查推导最近位置不变量，说明为什么远处重复失败后仍要更新记录。',
    '区分基本值、数组/Map 引用值与对象修改；用先查后存保证两个位置不同。',
    '从独立骨架完成 Java，并用 k=0、距离等于 k、旧位置过远等反例解释真实反馈。',
  ],
  source: { platform: 'LeetCode', number: 219, url: 'https://leetcode.com/problems/contains-duplicate-ii/' },
  taskSemantics: '给定整数数组 nums 和非负整数 k。能否选出两个不同下标 i、j，使两个位置的值相等，同时下标距离 |i-j| 不超过 k？能则返回 true，否则返回 false。位置不必相邻，也不需要修改数组。题意参考 LeetCode 219；本站题面、例子、推导和代码原创，与原平台无官方关联。',
  siteLimits: { description: '本站真实判题：nums 长度 1—10000，元素 -1000000000—1000000000，k 为 0—100000。参考演示最多 30 项，超限明确拒绝而不截断；有效长输入仍可真实运行。', inputSchemaId: 'NearbyDuplicateInputSchema' },
  steps: [
    { id: '219-syntax', kind: 'syntax', title: 'Java 前置 · 从值查到最近下标', body: '方法签名是 public boolean containsNearbyDuplicate(int[] nums, int k)。nums 是引用类型变量，数组本身是对象；nums[i]、k、i 和 previous 是 int 基本值，返回值是 boolean 基本值。Java 方法参数按值传递：这里复制数组引用值和 k 的整数值，并未复制数组。读取长度用 nums.length，没有括号。\n\nMap<Integer,Integer> last = new HashMap<>(); 创建映射对象。泛型写 Integer 而不能写 int；put(nums[i], i) 的两个 int 自动装箱，containsKey 按键的数值相等语义查询，get 返回 Integer，赋给 int previous 时拆箱。先 containsKey 再 get，避免不存在的键返回 null 并在拆箱时异常。Integer 对象的 == 比较引用身份，不能用它替代这里的数值比较。', relatedIds: ['J1', 'J2', 'J3', 'J5'] },
    { id: '219-reference-values', kind: 'syntax', title: '引用赋值与 Map 内容修改是两件事', body: 'last 保存 Map 对象的引用值。若写 Map<Integer,Integer> alias = last;，复制的是引用值，没有复制映射对象；alias.put(6,3) 与 last.put(6,3) 会修改同一对象的内容。若随后 alias = new HashMap<>();，只是改变 alias 的绑定，不会清空 last 指向的旧对象。参考代码只用 last，不修改 nums。演示表格显示 Integer 的数值内容，数组和 Map 的稳定 ID 是教学抽象，不是物理地址、装箱缓存、GC 或 JVM 内存布局的承诺。', relatedIds: ['J3', 'J5'] },
    { id: '219-understanding', kind: 'understanding', title: '原创题面 · 重复还要足够近', body: '把数组看成按下标排好的号码牌。[4,1,4] 有两个 4，位置为 0 和 2，距离是 2：k=2 返回 true，k=1 返回 false。第 217 题只问有没有重复，本题还要检查距离，单独一个 Set 无法给出先前下标。距离指下标差，不是两个数的差，也不是夹在它们中间的元素个数。k=0 时两个不同整数下标距离至少为 1，所以一定返回 false；一个元素也永远不能与自己配对。', relatedIds: ['distance-equal', 'too-far', 'zero-distance', 'single-zero'] },
    { id: '219-manual', kind: 'understanding', title: '手算 · 太远时也要更新', body: '模拟 nums=[6,1,2,6,6]、k=1。开始 last={}。i=0 查询 6 不存在，存 6→0；i=1 存 1→1；i=2 存 2→2。i=3 查到 6 的最近位置 0，距离 3 太大，不能成功，但仍要改存 6→3。i=4 再查询 6，得到位置 3，距离 1，返回 true。若一直保留第一次位置 0，就会错误地把最后一次距离算成 4，漏掉下标 3 与 4 这对答案。', relatedIds: ['refresh-nearest'] },
    { id: '219-derivation', kind: 'derivation', title: '推导 · 最近的旧位置已经足够', body: '直接办法枚举所有 p<i，检查 nums[p]==nums[i] 且 i-p<=k，最坏 O(n²)。按从左到右的顺序，固定当前 i 后，在所有同值旧下标中最大的那个 previous 离 i 最近。如果它都超过 k，更早的同值位置只会更远；如果它不超过 k，已找到一对。因此每种值只需存一个最近下标。\n\n循环入口不变量：last 恰好包含 nums[0..i) 出现过的不同值，并把每个值映射到该前缀中最大的下标。先查时所有位置都严格小于 i，不会自配；未返回时 put 当前值→i，无论之前不存在还是距离太远，都恢复下一轮不变量。结束仍未命中则不存在合法配对。HashMap 常见平均常数操作假设下，期望时间 O(n)，额外空间 O(n)；这份写法保留所有不同值，不声称 O(k) 空间。少量运行耗时不能证明复杂度。', relatedIds: ['init-map', 'check-seen', 'read-previous', 'check-distance', 'store-current'] },
    { id: '219-prediction', kind: 'prediction', title: '先预测 · 已见不等于足够近', body: '两个检查点都由当前输入生成：本次轨迹最后一次查询时 last 是否已有当前键，以及最后返回 true 还是 false。它们分别检查“值出现过”和“值相等且距离满足”。默认示例两者都是 true；切换到 [4,1,4]、k=1，已有键为 true 但返回 false；全不同输入两者为 false。单项和提前返回也都保留两次预测。预测是静态教学检查，不是编译或执行学生 Java。', relatedIds: ['219-predict-membership', '219-predict-result'] },
    { id: '219-reference-demo', kind: 'reference-demo', title: '参考解法 · 算法状态演示（非 JVM 调试）', body: '数组上的 i 与 previous、last 表格、变量和参考代码高亮都来自同一不可变快照，展示该语句执行后的状态；初始状态另列。表格键是元素值，表格值是最近下标；排列顺序只是教学展示，不承诺 Java HashMap 的迭代顺序。标有“表达式”的行是刚求出的教学记录，不是额外 Java 局部变量。previous 离开 if 块后不再显示；返回 false 时 i 也离开 for 的作用域。上一步直接恢复保存快照，学生编辑源码不会改写本轨迹；真实执行结果另走 Java runner。', relatedIds: demoInputs.map(item => item.id) },
    { id: '219-guided', kind: 'guided-code', title: '引导编写 · 先查、比较、再更新', body: '第一段补查询与距离条件，明确 put 必须在检查之后；第二段自己组织 Map 与循环体；第三段只保留完整方法骨架。支架检查是静态练习，最终必须把完整 Java 源码提交真实 runner，通过本站测试才记录引导通过，不能靠填入某个字符串认定算法正确。', relatedIds: ['219-guided-code'] },
    { id: '219-independent', kind: 'independent-code', title: '独立挑战 · 用反例而不是猜测', body: '独立模式只有方法骨架，与引导模式分别保存草稿。先测试单个数与 k=0，检查是否误把同一位置配给自己；再测试距离恰为 k，检查 <=；最后测试 [6,1,2,6,6]、k=1，检查是否更新了最近位置。运行自己的完整源码并阅读编译、异常或错误结果反馈，修正后提交本站全部用例。查看完整答案、引导通过和独立通过本站测试分别记录。', relatedIds: ['single-zero', 'distance-equal', 'refresh-nearest', 'J8'] },
    { id: '219-summary', kind: 'summary', title: '复盘 · 一条最近下标不变量', body: '能够解释 last 为什么记录最近而非最早位置，为什么失败后也要 put，为什么查询放在写入之前，为什么 k=0 总为 false。看过动画或完成预测不等于通过真实 Java 测试；参考答案默认折叠。本站通过只表示通过当前公布的本站测试，不表示通过 LeetCode 官方评测，也不由小样例运行时间声称验证复杂度。', relatedIds: ['J8'] },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' }, independent: { initialSource: STARTER_SOURCE },
  reference: { source: REFERENCE_SOURCE, fileName: 'Solution.java', sourceHash: '00abb8782f02b9bee9d27263b8e74eb11cdcd1bf12c9a008a93ad298494fb905', algorithmVersion: ALGORITHM_VERSION, stepMap: REFERENCE_STEP_MAP },
  hints: [
    { id: '219-hint-concept', level: 1, body: '为当前元素寻找更早的相同值；已有重复不够，还要比较下标距离。始终只与过去配对。' },
    { id: '219-hint-invariant', level: 2, body: 'Map 的键是数组值，值是最近出现下标。当前 i 的最近同值旧位置若太远，更早的位置也不行；未返回时把记录更新成 i。' },
    { id: '219-hint-pseudocode', level: 3, body: '空 last；依次遍历 i：若 last 含 nums[i]，令 previous=last.get(nums[i])，若 i-previous<=k 则 true；之后总执行 last.put(nums[i],i)。全部结束才 false。' },
  ],
  predictionChecks: [
    { id: '219-predict-membership', prompt: '[6,1,2,6,6]、k=1，最后查询 nums[4] 时 last 已有键 6 吗？', answer: { kind: 'text', value: 'true' }, explanation: '下标 3 处已把 6 的最近位置更新为 3，所以此时有键 6。', checkpointId: 'last-membership' },
    { id: '219-predict-result', prompt: '[6,1,2,6,6]、k=1，最终返回什么？', answer: { kind: 'text', value: 'true' }, explanation: '位置 3 与 4 的值都是 6，距离 1<=k。', checkpointId: 'final-result' },
  ],
  guided: { id: '219-guided-code', finalCheck: 'real-java-submit', stages: [
    { id: '219-guided-query', instruction: '支架 1 / 3：补查询、读取与距离条件；保留先查后存的顺序。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Map<Integer, Integer> last = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            if (/* TODO：当前值已经出现 */) {
                int previous = /* TODO：读取最近旧下标 */;
                if (/* TODO：不同位置的距离不超过 k */) return true;
            }
            last.put(nums[i], i);
        }
        return false;
    }
}
` },
    { id: '219-guided-loop', instruction: '支架 2 / 3：自己组织循环。距离太远时也更新最近位置，不能保留最早位置。', checkKind: 'static-practice', scaffoldSource: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Map<Integer, Integer> last = new HashMap<>();
        // TODO：完成先查、比较与更新，最后返回是否找到合法配对。
        throw new UnsupportedOperationException("请补充循环");
    }
}
` },
    { id: '219-guided-whole', instruction: '支架 3 / 3：从方法骨架完成全部 Java，可自行添加 import；提交真实 runner 检查。', checkKind: 'static-practice', scaffoldSource: STARTER_SOURCE },
  ] },
  commonErrors: [
    { id: '219-error-self-pair', description: '先 put 再查距离，当前下标覆盖旧下标，距离总是 0。', counterexampleInputId: 'single-zero', explanation: '只有一个 7，正确结果 false；错误写法得到 i-i=0，误判为 true。必须先查旧前缀。' },
    { id: '219-error-first-position', description: '第一次存入后不再更新，永久保留最早位置。', counterexampleInputId: 'refresh-nearest', explanation: '最后两个 6 的位置是 3 与 4，相距 1。若仍记 0，会只看到距离 4，漏掉答案。' },
    { id: '219-error-strict-distance', description: '把距离条件写成 <k，遗漏恰好等于 k 的情况。', counterexampleInputId: 'distance-equal', explanation: '两个 4 的距离是 2，k 也是 2，题目允许不超过，应返回 true。' },
    { id: '219-error-set-only', description: '只要重复就返回 true，没有保存下标检查距离。', counterexampleInputId: 'too-far', explanation: '[4,1,4] 确实重复，但距离 2 大于 k=1，因此应 false。' },
    { id: '219-error-null-unbox', description: '没有 containsKey 就直接把 get 结果赋给 int。', counterexampleInputId: 'single-large-k', explanation: '空 Map 查不到 7，get 返回 null，拆箱产生异常；应先确认键存在，本例正常返回 false。' },
  ],
  testSuite: { version: PROBLEM_META['219'].testSuiteVersion, cases, wrongFixtures: [
    { id: '219-wrong-store-first', source: WRONG_STORE_FIRST_SOURCE, targetedCaseIds: ['single-zero', 'zero-distance', 'all-unique'] },
    { id: '219-wrong-keep-first', source: WRONG_KEEP_FIRST_SOURCE, targetedCaseIds: ['refresh-nearest'] },
  ] },
  visualization: { modelId: '219-latest-index-map', modelVersion: ALGORITHM_VERSION, inputIds: demoInputs.map(item => item.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8 },
} satisfies Lesson219;
