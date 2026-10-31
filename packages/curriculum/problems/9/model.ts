import {
  PalindromeNumberInputSchema, expectedOutput,
  type PalindromeNumberInput, type ReferencePrediction, type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Models only the preset Java reference algorithm, never arbitrary student code. */
export async function buildReferenceTrace(raw: PalindromeNumberInput, inputId: string): Promise<ReferenceTrace> {
  const input = PalindromeNumberInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');

  const digits = [...String(Math.abs(input.x))].map(Number);
  const snapshots: Snapshot[] = [];
  let x = input.x;
  let negative: boolean | undefined = undefined;
  let trailingZero: boolean | undefined;
  let reversed: number | undefined;
  let digit: number | undefined;
  let halfCondition: boolean | undefined;
  let result: boolean | undefined;
  let processedCount = 0;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'x', value: { kind: 'int', value: x } },
      { name: '原始输入（教学辅助）', value: { kind: 'int', value: input.x } },
    ];
    if (negative !== undefined) variables.push({ name: 'x < 0（表达式）', value: { kind: 'boolean', value: negative } });
    if (trailingZero !== undefined) variables.push({ name: '非零且末位为零（表达式）', value: { kind: 'boolean', value: trailingZero } });
    if (reversed !== undefined) variables.push({ name: 'reversed', value: { kind: 'int', value: reversed } });
    if (halfCondition !== undefined) variables.push({ name: 'x > reversed（表达式）', value: { kind: 'boolean', value: halfCondition } });
    if (digit !== undefined) variables.push({ name: 'digit', value: { kind: 'int', value: digit } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const indices: { name: string; index: number }[] = [];
    if (reversed !== undefined && halfCondition === true && processedCount < digits.length) {
      indices.push({ name: '下一待取位（教学辅助）', index: digits.length - processedCount - 1 });
    }
    if (processedCount > 0) indices.push({ name: '最近取出的位（教学辅助）', index: digits.length - processedCount });
    return {
      variables,
      structures: [{ kind: 'array', id: '9-original-decimal-digits', values: [...digits], indices }],
      explanation,
    };
  };
  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 int 基本值 x。十进制位条是原始输入的教学辅助视图，参考 Java 代码没有创建数组；学生代码另由真实 runner 执行。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('9 参考模型超过 2000 快照上限');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation), ...(checkpointId ? { checkpointId } : {}),
    });
  };

  negative = x < 0;
  append('check-negative', negative
    ? `x=${x} 为负数；十进制负号无法与末位数字配对，直接返回 false。`
    : `x=${x} 非负，继续检查末位 0。`, 'negative-guard');
  if (negative) {
    result = false;
    append('return-negative', '负数提前返回 false；不会求余、创建 reversed 或进入 while。', 'final-result');
  } else {
    trailingZero = x !== 0 && x % 10 === 0;
    append('check-trailing-zero', trailingZero
      ? '非零数以 0 结尾；它的首位不可能是 0，所以直接返回 false。'
      : '不属于非零末位 0 的特例；0 本身仍可能为回文。');
    if (trailingZero) {
      result = false;
      append('return-trailing-zero', '末位为 0 的非零数提前返回 false；不会进入反转循环。', 'final-result');
    } else {
      reversed = 0;
      append('init-reversed', '声明 int reversed=0；它将保存从右侧依次取出的数字所形成的数。');
      while (true) {
        digit = undefined;
        halfCondition = x > reversed;
        append('check-half', halfCondition
          ? `x=${x} 大于 reversed=${reversed}，右半段尚未取够，继续读取 x 的个位。`
          : `x=${x} 已不大于 reversed=${reversed}，左右两半已经分开；停止循环。`);
        if (!halfCondition) break;

        digit = x % 10;
        processedCount += 1;
        append('read-digit', `x % 10 读出当前个位 ${digit}；位条高亮的是原始输入中这个数字的位置。`);

        reversed = reversed * 10 + digit;
        append('append-digit', `reversed=旧 reversed×10+${digit}=${reversed}；它恰好是已取出后缀数字的反序。`);

        x = Math.trunc(x / 10);
        append('drop-digit', `x/=10 丢弃刚取出的个位，剩余左侧数字为 ${x}。Java 对非负 int 的整数除法舍去小数部分。`);
      }
      digit = undefined;
      result = x === reversed || x === Math.trunc(reversed / 10);
      append('return-result', result
        ? input.x === 0
          ? '0 只有一位；x=0 与 reversed=0 直接相等，返回 true。'
          : x === reversed
            ? `x=${x} 与 reversed=${reversed} 两半直接相等，返回 true。`
            : `x=${x} 等于 reversed=${reversed} 去掉中间位后的 ${Math.trunc(reversed / 10)}，返回 true。`
        : `x=${x} 与 reversed=${reversed} 不相等，去掉 reversed 的中间位后也不相等，返回 false。`, 'final-result');
    }
  }

  const oracle = expectedOutput('9', input);
  if (oracle.kind !== 'boolean' || oracle.value !== result) throw new Error('9 参考状态模型与独立字符串双指针期望不一致');
  return finalizeTrace({
    problemId: '9', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: result },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const original = snapshot.variables.find(variable => variable.name === '原始输入（教学辅助）')?.value;
  if (original?.kind !== 'int') throw new Error('9 预测缺少原始 int 输入');
  const guard = snapshot.stepId === 'check-negative';
  const value = snapshot.variables.find(variable => variable.name === (guard ? 'x < 0（表达式）' : '返回值'))?.value;
  if (value?.kind !== 'boolean') throw new Error('9 预测缺少布尔状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: guard
      ? `先预测，再揭示：x=${original.value} 会因为负数守卫直接返回 false 吗？`
      : `先预测，再揭示：原始输入 ${original.value} 最终返回 true 还是 false？`,
    answer: { kind: 'choice', optionId: guard ? (value.value ? 'early' : 'continue') : (value.value ? 'true' : 'false') },
    options: guard
      ? [{ id: 'early', label: '直接返回 false' }, { id: 'continue', label: '继续检查和反转' }]
      : [{ id: 'true', label: 'true：回文数' }, { id: 'false', label: 'false：不是回文数' }],
    explanation: snapshot.explanation,
  };
}
