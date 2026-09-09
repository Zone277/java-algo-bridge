import { lesson704, demoInputs as inputs704 } from '@jab/curriculum/704';
import { lesson206, demoInputs as inputs206 } from '@jab/curriculum/206';
import { buildReferenceTrace as trace704, predictionAt as predict704 } from '@jab/curriculum/704/model';
import { buildReferenceTrace as trace206, predictionAt as predict206 } from '@jab/curriculum/206/model';
import { BinarySearchInputSchema, LinkedListInputSchema, type Lesson, type LessonInput, type ReferenceTrace, type ReferencePrediction } from '@jab/contracts';

export type LessonRuntime = {
  lesson: Lesson;
  demoInputs: { id: string; title: string; input: LessonInput }[];
  buildTrace: (input: LessonInput, id: string) => Promise<ReferenceTrace>;
  predictionAt: (trace: ReferenceTrace, index: number) => ReferencePrediction | null;
  defaultInput: LessonInput;
  syntaxCheck: { prompt: string; answer: number | string; explanation: string };
};
export const lessonRuntimes: LessonRuntime[] = [
  { lesson: lesson704, demoInputs: inputs704, buildTrace: (input, id) => trace704(BinarySearchInputSchema.parse(input), id), predictionAt: predict704, defaultInput: { nums: [-8,-2,3,7,12], target: 7 }, syntaxCheck: { prompt: 'int[] nums = new int[] { -8, -2, 3, 7, 12 }; 表达式 nums.length - 1 的值是多少？', answer: 4, explanation: 'length 为5，最后一个下标为4。' } },
  { lesson: lesson206, demoInputs: inputs206, buildTrace: (input, id) => trace206(LinkedListInputSchema.parse(input), id), predictionAt: predict206, defaultInput: { head: [5,5,8] }, syntaxCheck: { prompt: 'head 指向 h0，h0.next 指向 h1。执行 ListNode curr = head; curr = curr.next; 后，head 仍指向哪个对象？填写 h0 或 h1。', answer: 'h0', explanation: '引用赋值复制引用值。curr 改绑为h1，不改变head或任何对象的next字段。' } },
];
