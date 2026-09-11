import { lesson704, demoInputs as inputs704 } from '@jab/curriculum/704';
import { lesson283, demoInputs as inputs283 } from '@jab/curriculum/283';
import { lesson977, demoInputs as inputs977 } from '@jab/curriculum/977';
import { lesson1, demoInputs as inputs1 } from '@jab/curriculum/1';
import { lesson20, demoInputs as inputs20 } from '@jab/curriculum/20';
import { lesson206, demoInputs as inputs206 } from '@jab/curriculum/206';
import { lesson21, demoInputs as inputs21 } from '@jab/curriculum/21';
import { lesson104, demoInputs as inputs104 } from '@jab/curriculum/104';
import { lesson70, demoInputs as inputs70 } from '@jab/curriculum/70';
import { lesson3, demoInputs as inputs3 } from '@jab/curriculum/3';
import { buildReferenceTrace as trace704, predictionAt as predict704 } from '@jab/curriculum/704/model';
import { buildReferenceTrace as trace283, predictionAt as predict283 } from '@jab/curriculum/283/model';
import { buildReferenceTrace as trace977, predictionAt as predict977 } from '@jab/curriculum/977/model';
import { buildReferenceTrace as trace1, predictionAt as predict1 } from '@jab/curriculum/1/model';
import { buildReferenceTrace as trace20, predictionAt as predict20 } from '@jab/curriculum/20/model';
import { buildReferenceTrace as trace206, predictionAt as predict206 } from '@jab/curriculum/206/model';
import { buildReferenceTrace as trace21, predictionAt as predict21 } from '@jab/curriculum/21/model';
import { buildReferenceTrace as trace104, predictionAt as predict104 } from '@jab/curriculum/104/model';
import { buildReferenceTrace as trace70, predictionAt as predict70 } from '@jab/curriculum/70/model';
import { buildReferenceTrace as trace3, predictionAt as predict3 } from '@jab/curriculum/3/model';
import { BinarySearchInputSchema, ClimbStairsInputSchema, LinkedListInputSchema, LongestSubstringInputSchema, MergeListsInputSchema, MoveZeroesInputSchema, SortedSquaresInputSchema, TreeInputSchema, TwoSumInputSchema, ValidParenthesesInputSchema, type Answer, type Lesson, type LessonInput, type ReferenceTrace, type ReferencePrediction } from '@jab/contracts';

export type LessonRuntime = {
  lesson: Lesson;
  demoInputs: { id: string; title: string; input: LessonInput }[];
  buildTrace: (input: LessonInput, id: string) => Promise<ReferenceTrace>;
  predictionAt: (trace: ReferenceTrace, index: number) => ReferencePrediction | null;
  defaultInput: LessonInput;
  syntaxCheck: { checkpointId: string; prompt: string; answer: Answer; explanation: string };
};
export const lessonRuntimes: LessonRuntime[] = [
  { lesson: lesson704, demoInputs: inputs704, buildTrace: (input, id) => trace704(BinarySearchInputSchema.parse(input), id), predictionAt: predict704, defaultInput: { nums: [-8,-2,3,7,12], target: 7 }, syntaxCheck: { checkpointId: '704-v1:syntax:length-index', prompt: 'int[] nums = new int[] { -8, -2, 3, 7, 12 }; 表达式 nums.length - 1 的值是多少？', answer: { kind: 'int', value: 4 }, explanation: 'length 为5，最后一个下标为4。' } },
  { lesson: lesson283, demoInputs: inputs283, buildTrace: (input, id) => trace283(MoveZeroesInputSchema.parse(input), id), predictionAt: predict283, defaultInput: inputs283[0]!.input, syntaxCheck: { checkpointId: '283-v1:syntax:array-mutation', prompt: 'int[] nums = {0, 4}; 执行 nums[0] = 4 后，nums[0] 是多少？', answer: { kind: 'int', value: 4 }, explanation: '数组元素写入会修改 nums 引用的数组对象；这与只给局部变量 nums 重新赋值不同。' } },
  { lesson: lesson977, demoInputs: inputs977, buildTrace: (input, id) => trace977(SortedSquaresInputSchema.parse(input), id), predictionAt: predict977, defaultInput: inputs977[0]!.input, syntaxCheck: { checkpointId: '977-v1:syntax:new-array', prompt: 'new int[5] 创建的结果数组 length 是多少？', answer: { kind: 'int', value: 5 }, explanation: 'new int[5] 创建五个 int 单元，初始值都是 0。' } },
  { lesson: lesson1, demoInputs: inputs1, buildTrace: (input, id) => trace1(TwoSumInputSchema.parse(input), id), predictionAt: predict1, defaultInput: inputs1[0]!.input, syntaxCheck: { checkpointId: '1-v1:syntax:complement', prompt: 'target=9、当前值为7时，补数 target - value 是多少？', answer: { kind: 'int', value: 2 }, explanation: '先在 Map 中查补数 2，再保存当前值，才能避免复用当前下标。' } },
  { lesson: lesson20, demoInputs: inputs20, buildTrace: (input, id) => trace20(ValidParenthesesInputSchema.parse(input), id), predictionAt: predict20, defaultInput: inputs20[0]!.input, syntaxCheck: { checkpointId: '20-v1:syntax:char-at', prompt: 'String s = "([])"; 表达式 s.charAt(0) 得到哪个字符？', answer: { kind: 'text', value: '(' }, explanation: 'charAt 使用从0开始的下标，返回第一个 char。' } },
  { lesson: lesson206, demoInputs: inputs206, buildTrace: (input, id) => trace206(LinkedListInputSchema.parse(input), id), predictionAt: predict206, defaultInput: { head: [5,5,8] }, syntaxCheck: { checkpointId: '206-v1:syntax:check', prompt: 'head 指向 h0，h0.next 指向 h1。执行 ListNode curr = head; curr = curr.next; 后，head 仍指向哪个对象？填写 h0 或 h1。', answer: { kind: 'text', value: 'h0' }, explanation: '引用赋值复制引用值。curr 改绑为h1，不改变head或任何对象的next字段。' } },
  { lesson: lesson21, demoInputs: inputs21, buildTrace: (input, id) => trace21(MergeListsInputSchema.parse(input), id), predictionAt: predict21, defaultInput: inputs21[0]!.input, syntaxCheck: { checkpointId: '21-v1:syntax:next-field', prompt: 'tail 指向 d0，执行 tail.next = a0 后，d0.next 指向哪个对象？', answer: { kind: 'text', value: 'a0' }, explanation: '给 next 字段赋值会改变 d0 对象；随后给 tail 重新赋值才会移动变量绑定。' } },
  { lesson: lesson104, demoInputs: inputs104, buildTrace: (input, id) => trace104(TreeInputSchema.parse(input), id), predictionAt: predict104, defaultInput: inputs104[0]!.input, syntaxCheck: { checkpointId: '104-v1:syntax:null-base', prompt: '按节点数定义深度时，maxDepth(null) 应返回多少？', answer: { kind: 'int', value: 0 }, explanation: '空树没有节点，深度是0；非空节点再加1。' } },
  { lesson: lesson70, demoInputs: inputs70, buildTrace: (input, id) => trace70(ClimbStairsInputSchema.parse(input), id), predictionAt: predict70, defaultInput: inputs70[0]!.input, syntaxCheck: { checkpointId: '70-v1:syntax:base-case', prompt: '只有1阶时，按一次走1阶的方法数是多少？', answer: { kind: 'int', value: 1 }, explanation: 'n=1 是第一个基例，只有一种走法。' } },
  { lesson: lesson3, demoInputs: inputs3, buildTrace: (input, id) => trace3(LongestSubstringInputSchema.parse(input), id), predictionAt: predict3, defaultInput: inputs3[0]!.input, syntaxCheck: { checkpointId: '3-v1:syntax:string-length', prompt: 'String s = "a b"; s.length() 的结果是多少？', answer: { kind: 'int', value: 3 }, explanation: '空格也是字符串中的一个字符，length() 返回3。' } },
];
