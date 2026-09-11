import { JAVA_INT_MAX, JAVA_INT_MIN, PROBLEM_META, type Lesson, type MoveZeroesInput } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

export const demoInputs: { id: string; title: string; input: MoveZeroesInput }[] = [
  { id: 'mixed', title: '零与非零交错：[0,1,0,3,12]', input: { nums: [0, 1, 0, 3, 12] } },
  { id: 'all-zero', title: '全部为零：[0,0,0]', input: { nums: [0, 0, 0] } },
  { id: 'no-zero', title: '没有零：[1,2,3]', input: { nums: [1, 2, 3] } },
];

const moveExpected = (nums: readonly number[]) => {
  const nonzero = nums.filter(value => value !== 0);
  return { kind: 'int-array' as const, values: [...nonzero, ...Array(nums.length - nonzero.length).fill(0) as number[]] };
};
const definitions = [
  { id: 'singleton-zero', nums: [0], coverage: '单个零：write 不在扫描阶段前进，只执行尾部补零。' },
  { id: 'singleton-nonzero', nums: [9], coverage: '单个非零：允许原位置自赋值，补零循环不执行。' },
  { id: 'mixed', nums: [0, 1, 0, 3, 12], coverage: '经典交错输入：同时检查压缩、补零与非零次序。' },
  { id: 'no-zero', nums: [1, 2, 3], coverage: '没有零：数组内容和顺序保持不变。' },
  { id: 'all-zero', nums: [0, 0, 0], coverage: '全部为零：扫描不写非零值，随后覆盖整个数组。' },
  { id: 'leading-zero', nums: [0, 4, 5], coverage: '前导零：首个非零值必须写回下标 0。' },
  { id: 'interleaved', nums: [1, 0, 2, 0, 3], coverage: '多个间隔零：write 与 read 多次分离。' },
  { id: 'duplicate-negative', nums: [0, -1, 0, -1, 2, 0], coverage: '重复值和负数：两个 -1 都保留且相对顺序稳定。' },
  { id: 'int-bounds', nums: [JAVA_INT_MIN, 0, JAVA_INT_MAX], coverage: 'Java int 两端值：0 是唯一需要移动的特殊值。' },
] as const;
const cases = definitions.map(({ id, nums, coverage }) => ({ id, input: { nums: [...nums] }, expected: moveExpected(nums), coverage }));

const rebindFixture = `class Solution {
    public void moveZeroes(int[] nums) {
        int[] moved = new int[nums.length];
        int write = 0;
        for (int value : nums) if (value != 0) moved[write++] = value;
        nums = moved;
    }
}
`;
const unstableFixture = `class Solution {
    public void moveZeroes(int[] nums) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            while (left < right && nums[left] != 0) left++;
            while (left < right && nums[right] == 0) right--;
            if (left < right) {
                nums[left] = nums[right];
                nums[right] = 0;
                left++;
                right--;
            }
        }
    }
}
`;
const missingFillFixture = `class Solution {
    public void moveZeroes(int[] nums) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) nums[write++] = nums[read];
        }
    }
}
`;

const guidedLoop = `class Solution {
    public void moveZeroes(int[] nums) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            // TODO：遇到非零值时，把它写到 write，再推进 write。
        }
        while (write < nums.length) {
            // TODO：从 write 开始把剩余位置写为 0，并推进 write。
        }
        throw new UnsupportedOperationException("请完成两个循环并删除此行");
    }
}
`;

export const lesson283 = {
  schemaVersion: 1,
  id: '283',
  slug: 'move-zeroes',
  title: '移动零',
  order: 2,
  lessonVersion: PROBLEM_META['283'].lessonVersion,
  prerequisites: ['J1', 'J2', 'J3', 'J8'],
  objectives: [
    '区分修改传入数组对象与只重新绑定参数变量。',
    '用 read/write 不变量稳定收集非零元素，再补齐尾部零。',
    '从真实的修改后数组判断结果，并用反例检查顺序和原地语义。',
  ],
  source: { platform: 'LeetCode', number: 283, url: 'https://leetcode.com/problems/move-zeroes/' },
  taskSemantics: '给定一个整数数组，把所有 0 移到末尾，同时保持每个非零元素原来的相对次序。方法返回 void，答案体现在调用后同一个数组对象的内容中。',
  siteLimits: { description: '本站教学输入为 JSON {"nums":[...]}：数组长度 1—10000，元素为 Java int。演示最多 30 项、2000 快照。空数组不属于本站正式用例；超限属于输入限制，不是算法错误。', inputSchemaId: 'MoveZeroesInput-v1' },
  steps: [
    {
      id: 'syntax-method-loop', kind: 'syntax', title: 'J1/J2 · void、length、for 与 while',
      body: '方法签名 public void moveZeroes(int[] nums) 中，void 表示不交回一个结果值；方法结束后，调用器读取传入数组的内容。你不用写 main，本站可信调用器会构造 int[] 并调用方法。\n数组长度写 nums.length，没有括号；合法下标是 0 到 length - 1。for (int read = 0; read < nums.length; read++) 适合逐项扫描。while (write < nums.length) 适合把未知数量的尾部位置写成 0。Java 循环条件必须是 boolean；局部变量在读取前必须初始化。void 方法可写 return;，也可以自然执行到方法末尾。',
      relatedIds: ['J1', 'J2'],
    },
    {
      id: 'syntax-array-reference', kind: 'syntax', title: 'J3 · 数组对象、参数按值与原地修改',
      body: 'int 是基本类型；int[] 是数组对象的类型，变量 nums 保存引用值。调用方法时，Java 按值复制这个引用值给参数，因此 nums[0] = 7 会修改双方都能观察到的数组对象。\nnums = new int[nums.length] 只让方法内参数改为引用另一个数组，不会让调用者变量自动改绑。本题要求修改调用者传入的数组，所以“算出新数组后只写 nums = moved”仍是错误。引用是语言语义，不是可以做地址运算的 C 指针，也不描述 JVM 物理内存。',
      relatedIds: ['J3'],
    },
    {
      id: 'understanding-manual', kind: 'understanding', title: '原创题面与手工模拟',
      body: '输入 nums=[0,1,0,3,12]。输出不是另一个返回数组；调用结束后，原数组应变为 [1,3,12,0,0]。数字 1、3、12 的相对次序不能改变。\n手算时令 write=0。read=0 看到 0，跳过；read=1 看到 1，写 nums[0]=1，write 变 1；read=2 看到 0，跳过；read=3 写 nums[1]=3；read=4 写 nums[2]=12。扫描结束 write=3，再把下标 3、4 写成 0。过程中可能暂时出现重复值，那只是尚未完成的同一数组状态。',
      relatedIds: ['mixed'],
    },
    {
      id: 'derivation-invariant', kind: 'derivation', title: '推导 · 为什么要稳定压缩后再补零',
      body: '初始想法可以在每次遇到 0 时把后面的所有元素左移一格，但同一元素可能被搬动很多次，最坏达到 O(n²)。也可以建新数组，却不符合本题原地修改的训练目标。\n目标算法维护两个下标。read 扫描尚未判断的位置；write 指向下一个非零值应写入的位置。循环边界不变量是：处理 nums 原始前缀 [0,read) 后，当前数组 [0,write) 恰好等于该原始前缀中过滤出的全部非零值，而且次序一致；0 <= write <= read。遇到非零值就写到 nums[write] 并推进 write，遇到 0 只推进 read。\n扫描结束时 [0,write) 已是完整稳定非零序列；把 [write,length) 写成 0 得到答案。每项只被常数次读取或写入，时间 O(n)，只用固定几个整数变量，额外空间 O(1)。参考演示会保存历史快照，那是教学界面的空间，不是 Java 算法的额外空间。',
      relatedIds: [],
    },
    {
      id: 'prediction-state', kind: 'prediction', title: '先预测判断与第一次写入',
      body: '默认数组第一次检查 nums[0]=0：先预测是复制还是跳过。之后 read 到 1，先预测写入完成后的 nums[0]。作答后才揭示对应快照；这是预置参考算法的静态状态检查，不是学生 Java 的执行结果。',
      relatedIds: ['predict-first-decision', 'predict-first-write'],
    },
    {
      id: 'reference-demo', kind: 'reference-demo', title: '参考算法状态演示',
      body: '参考解法 · 算法状态演示（非 JVM 调试）。数组结构始终使用同一个稳定 ID nums；read、write、最近写入位置和当前阶段都来自所选的同一份不可变快照。后退会直接恢复历史快照，不反推或重跑学生代码。切换输入会生成带新输入哈希的轨迹。',
      relatedIds: [],
    },
    {
      id: 'guided-code', kind: 'guided-code', title: '三段支架后提交完整 Java',
      body: '先补“是不是非零”的分支条件，再完成两个循环，最后从方法骨架独立组织完整方法。支架自检只记录练习过程；最终必须把完整 Solution.java 提交给真实 Docker、javac 和 java 通道。本站比较调用后的原数组，不比较你的源码字符串，也不读取你打印的 PASS。',
      relatedIds: ['guided-283'],
    },
    {
      id: 'independent-code', kind: 'independent-code', title: '独立模式与真实失败反馈',
      body: '独立模式从只含方法签名的骨架开始，与引导草稿分开保存。先运行交错、全零、无零和重复非零值输入。编译错误看 javac 行号；运行异常检查下标；错误答案对照实际修改后数组；超时检查 read/write 是否前进。只有提交完整本站用例并真实通过，才记录“独立模式通过本站测试”。',
      relatedIds: [],
    },
    {
      id: 'summary-explain', kind: 'summary', title: '离开前解释对象和不变量',
      body: '请用自己的话回答：void 方法的结果从哪里观察？为什么 nums = moved 不算修改原数组？[0,write) 表示什么？为何必须先稳定收集非零值再补零？\n本站分别记录预测、引导通过、独立通过、提示和答案查看；访问页面或播放演示不等于掌握，本站通过也不是 LeetCode 官方评测。',
      relatedIds: [],
    },
  ],
  starter: { source: STARTER_SOURCE, fileName: 'Solution.java' },
  reference: {
    source: REFERENCE_SOURCE,
    fileName: 'Solution.java',
    sourceHash: '2b51df063c00150cd41c8fb6f1324b92a18ba9af81da9840194c27768594abcd',
    algorithmVersion: ALGORITHM_VERSION,
    stepMap: [...REFERENCE_STEP_MAP],
  },
  hints: [
    { id: 'hint-concept', level: 1, body: '先忽略零：按原顺序把每个非零值放到数组前面。想清楚答案由哪个数组对象承载。' },
    { id: 'hint-invariant', level: 2, body: '让 write 指向下一个非零值的写入位置。处理到 read 时，[0,write) 必须恰是原前缀中的稳定非零序列；扫描结束再从 write 补零。' },
    { id: 'hint-pseudocode', level: 3, body: 'write=0；read 从0到length-1：若 nums[read]!=0，则 nums[write]=nums[read]、write++；然后 while(write<length) 写0并推进write。' },
  ],
  predictionChecks: [
    {
      id: 'predict-first-decision', checkpointId: 'first-decision',
      prompt: '默认 nums=[0,1,0,3,12]，read=0、write=0。当前元素应复制还是跳过？',
      answer: { kind: 'choice', optionId: 'skip' },
      options: [{ id: 'copy', label: '复制并推进 write' }, { id: 'skip', label: '跳过，write 不变' }],
      explanation: 'nums[0] 是 0；本轮跳过它，write 仍为 0。',
    },
    {
      id: 'predict-first-write', checkpointId: 'first-write',
      prompt: '随后 read=1 读到值1。第一次写入完成后 nums[0] 是多少？',
      answer: { kind: 'int', value: 1 },
      explanation: '把 nums[read] 的非零值1写到 write=0的位置；之后 write 才推进到1。',
    },
  ],
  guided: {
    id: 'guided-283',
    stages: [
      {
        id: 'guided-condition', checkKind: 'static-practice',
        instruction: '支架1/3：把 false 换成判断当前元素非零的条件。运行交错输入，观察只改条件后数组如何变化；检查你使用的是 read 下标。',
        scaffoldSource: REFERENCE_SOURCE.replace('if (nums[read] != 0)', 'if (false /* TODO：当前元素是否非零 */)'),
      },
      {
        id: 'guided-loops', checkKind: 'static-practice',
        instruction: '支架2/3：完成稳定压缩循环和尾部补零循环，并删除末尾异常。真实运行至少检查 [0,1,0,3,12] 与 [0,0,0]。',
        scaffoldSource: guidedLoop,
      },
      {
        id: 'guided-complete', checkKind: 'static-practice',
        instruction: '支架3/3：从方法骨架写出完整算法。最终提交完整 Java 到真实 runner；不同变量名和等价正确写法都可以通过。',
        scaffoldSource: STARTER_SOURCE,
      },
    ],
    finalCheck: 'real-java-submit',
  },
  independent: { initialSource: STARTER_SOURCE },
  commonErrors: [
    { id: 'error-rebind', description: '构造正确的新数组后只写 nums = moved。', counterexampleInputId: 'mixed', explanation: 'Java 按值传入引用值；重新绑定局部参数不会改变调用者仍引用的原数组。本站调用后读取原数组，因此会看到它没有被正确修改。' },
    { id: 'error-unstable', description: '从末尾拿非零值与前面的零交换。', counterexampleInputId: 'mixed', explanation: '这种写法可能把 [0,1,0,3,12] 变成 [12,1,3,0,0]；零到了末尾，但非零次序被破坏。' },
    { id: 'error-no-fill', description: '压缩非零值后忘记覆盖尾部。', counterexampleInputId: 'interleaved', explanation: '前缀可能已经是 [1,2,3]，但旧值仍留在后面；void 返回不代表数组会自动清零。' },
    { id: 'error-write-every-item', description: '无论当前值是否为零都推进 write。', counterexampleInputId: 'leading-zero', explanation: 'write 若与 read 始终同步，就没有为后续非零值腾出前部位置，前导零仍留在原处。' },
  ],
  testSuite: {
    version: PROBLEM_META['283'].testSuiteVersion,
    cases,
    wrongFixtures: [
      { id: 'wrong-rebind-array', source: rebindFixture, targetedCaseIds: ['mixed', 'leading-zero', 'interleaved'] },
      { id: 'wrong-unstable-swap', source: unstableFixture, targetedCaseIds: ['mixed', 'interleaved'] },
      { id: 'wrong-missing-tail-fill', source: missingFillFixture, targetedCaseIds: ['mixed', 'interleaved'] },
    ],
  },
  visualization: {
    modelId: '283-stable-read-write', modelVersion: ALGORITHM_VERSION,
    inputIds: demoInputs.map(input => input.id), maxItems: 30, maxSnapshots: 2000, maxTreeDepth: 8,
  },
} satisfies Lesson;
