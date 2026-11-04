import {
  RomanToIntegerInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type RomanToIntegerInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

const ROMAN_VALUE: Readonly<Record<string, number>> = Object.freeze({
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
});

function valueOf(symbol: string): number {
  const value = ROMAN_VALUE[symbol];
  if (value === undefined) throw new Error(`未知罗马符号：${symbol}`);
  return value;
}

/** 预置参考算法的纯状态模型；它不读取、解释或执行学生 Java。 */
export async function buildReferenceTrace(raw: RomanToIntegerInput, inputId: string): Promise<ReferenceTrace> {
  const input = RomanToIntegerInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');

  const snapshots: Snapshot[] = [];
  let total = 0;
  let processed = 0;
  let i: number | undefined;
  let inRange: boolean | undefined;
  let current: string | undefined;
  let currentValue: number | undefined;
  let next: string | undefined;
  let nextValue: number | undefined;
  let shouldSubtract: boolean | undefined;
  let contribution: number | undefined;

  const state = (explanation: string, returnedResult?: number): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's（显示文本）', value: { kind: 'string', value: input.s } },
      { name: 'total', value: { kind: 'int', value: total } },
      { name: '已处理字符数（教学）', value: { kind: 'int', value: processed } },
    ];
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (inRange !== undefined) variables.push({ name: '循环条件', value: { kind: 'boolean', value: inRange } });
    if (current !== undefined) variables.push({ name: 'currentSymbol', value: { kind: 'char', value: current } });
    if (currentValue !== undefined) variables.push({ name: 'current', value: { kind: 'int', value: currentValue } });
    if (next !== undefined) variables.push({ name: 'nextSymbol', value: { kind: 'char', value: next } });
    if (nextValue !== undefined) variables.push({ name: 'next', value: { kind: 'int', value: nextValue } });
    if (shouldSubtract !== undefined) variables.push({ name: '本位应减', value: { kind: 'boolean', value: shouldSubtract } });
    if (contribution !== undefined) variables.push({ name: '本位贡献', value: { kind: 'int', value: contribution } });
    if (returnedResult !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: returnedResult } });

    const cursor = Math.min(i ?? processed, input.s.length);
    const active = current === undefined ? [] : [{ kind: 'char' as const, value: current }];
    return {
      variables,
      structures: [{
        kind: 'window', id: 'roman-text', text: input.s,
        left: cursor, rightExclusive: current === undefined ? cursor : cursor + 1,
        members: active,
      }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 String 引用值的副本；这里只显示字符串内容。尚未处理任何符号。这是参考算法状态，不是学生 Java 的运行轨迹。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string, returnedResult?: number) => {
    if (snapshots.length >= 2000) throw new Error('参考状态模型超过 2000 快照上限');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation, returnedResult),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  append('init-total', 'total=0。空前缀的贡献和为 0，循环不变量在开始前成立。');
  const firstSubtract = [...input.s].findIndex((symbol, index) =>
    index + 1 < input.s.length && valueOf(symbol) < valueOf(input.s.charAt(index + 1)),
  );
  const predictionIndex = firstSubtract >= 0 ? firstSubtract : 0;

  for (let index = 0; ; index++) {
    i = index;
    current = undefined;
    currentValue = undefined;
    next = undefined;
    nextValue = undefined;
    shouldSubtract = undefined;
    contribution = undefined;
    inRange = i < input.s.length;
    append('check-loop', inRange
      ? `i=${i} 仍在范围内；前 ${processed} 个符号的贡献已经累计到 total=${total}。`
      : `i=${i} 等于字符串长度；全部 ${processed} 个符号已经处理。`);
    if (!inRange) break;

    inRange = undefined;
    current = input.s.charAt(index);
    currentValue = valueOf(current);
    append('read-current', `s.charAt(${index}) 得到 '${current}'，valueOf 把这个 char 基本值换成 ${currentValue}。`);

    if (index + 1 < input.s.length) {
      next = input.s.charAt(index + 1);
      nextValue = valueOf(next);
    }
    shouldSubtract = nextValue !== undefined && currentValue < nextValue;
    append(
      'check-subtract',
      nextValue === undefined
        ? `当前位置是末位，没有右侧符号，因此 '${current}' 必须相加。`
        : `${current}=${currentValue} ${shouldSubtract ? '小于' : '不小于'}右侧 ${next}=${nextValue}，所以本位应${shouldSubtract ? '减' : '加'}。`,
      index === predictionIndex ? 'first-decision' : undefined,
    );

    contribution = shouldSubtract ? -currentValue : currentValue;
    total += contribution;
    processed = index + 1;
    append(
      shouldSubtract ? 'subtract-current' : 'add-current',
      `${shouldSubtract ? '减去' : '加上'} ${currentValue}，本位贡献为 ${contribution}；total 更新为 ${total}。现在它等于前 ${processed} 个符号的贡献和。`,
    );
  }

  i = undefined;
  inRange = undefined;
  current = undefined;
  currentValue = undefined;
  next = undefined;
  nextValue = undefined;
  shouldSubtract = undefined;
  contribution = undefined;
  append('return-total', `返回 total=${total}。每个符号只贡献一次，较小且紧邻较大符号的本位贡献为负。`, 'final-total', total);

  const finalOutput = { kind: 'int' as const, value: total };
  const trusted = expectedOutput('13', input);
  if (trusted.kind !== 'int' || trusted.value !== total) throw new Error('13 参考状态与独立可信期望不一致');
  return finalizeTrace({
    problemId: '13', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-subtract') {
    const value = snapshot.variables.find(item => item.name === '本位应减')?.value;
    if (value?.kind !== 'boolean') throw new Error('13 加减预测缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前符号对 total 的贡献应当相加还是相减？',
      answer: { kind: 'choice', optionId: value.value ? 'subtract' : 'add' },
      options: [{ id: 'subtract', label: '减去当前值' }, { id: 'add', label: '加上当前值' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId !== 'return-total') throw new Error('13 未知预测步骤');
  const value = snapshot.variables.find(item => item.name === '返回值')?.value;
  if (value?.kind !== 'int') throw new Error('13 结果预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：这个罗马数字最终转换成哪个整数？',
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
