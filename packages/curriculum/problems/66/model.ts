import { PlusOneInputSchema, expectedOutput, type PlusOneInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Fixed reference-algorithm snapshots; this function never reads or executes student Java. */
export async function buildReferenceTrace(raw: PlusOneInput, inputId: string): Promise<ReferenceTrace> {
  const input = PlusOneInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.digits.length > 30) throw new Error('参考状态演示最多显示 30 位；真实 Java 判题仍支持 100 位');

  const digits = [...input.digits];
  let grown: number[] | undefined = undefined;
  let i: number | undefined;
  let inRange: boolean | undefined;
  let lessThanNine: boolean | undefined;
  const snapshots: Snapshot[] = [];

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'digits', value: { kind: 'reference', objectId: 'digits' } }];
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (inRange !== undefined) variables.push({ name: 'i >= 0（表达式）', value: { kind: 'boolean', value: inRange } });
    if (lessThanNine !== undefined) variables.push({ name: 'digits[i] < 9（表达式）', value: { kind: 'boolean', value: lessThanNine } });
    if (grown !== undefined) variables.push({ name: 'grown', value: { kind: 'reference', objectId: 'grown' } });
    const structures: State['structures'][number][] = [
      { kind: 'array', id: 'digits', values: [...digits], indices: i === undefined ? [] : [{ name: 'i', index: i }] },
    ];
    if (grown !== undefined) structures.push({ kind: 'array', id: 'grown', values: [...grown], indices: [] });
    return { variables, structures, explanation };
  };

  const initialState: State = { snapshotId: 'initial', ...state('方法收到 digits 的引用值；此数组对象保持独立身份。这里是参考算法状态，不是学生 Java 的运行轨迹。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  for (i = digits.length - 1; ; i--) {
    lessThanNine = undefined;
    inRange = i >= 0;
    append('check-digit', inRange
      ? `当前下标 i=${i}，右侧原来的连续 9 已清零，进位等待处理当前位。`
      : 'i 已越过最高位；每个原位都是 9 且已清零，仍有进位，需要更长结果数组。');
    if (!inRange) break;

    lessThanNine = digits[i]! < 9;
    append('check-nine', `digits[${i}]=${digits[i]}，${lessThanNine ? '小于 9，当前位加一后进位结束' : '等于 9，当前位须写 0 并继续向左'}。`);
    if (lessThanNine) {
      digits[i] = digits[i]! + 1;
      append('increment-digit', `digits[${i}] 加一成为 ${digits[i]}；其右侧进位后的零保留，左侧不用修改。`, i === input.digits.length - 1 ? 'first-digit' : undefined);
      append('return-digits', '进位已在原数组中结束，返回同一个 digits 数组对象的引用值。', 'result-length');
      const finalOutput = { kind: 'int-array' as const, values: [...digits] };
      checkAgainstOracle(input, finalOutput.values);
      return finalizeTrace({ problemId: '66', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
    }

    digits[i] = 0;
    append('reset-nine', `digits[${i}] 原为 9，现在写 0；进位尚未结束。`, i === input.digits.length - 1 ? 'first-digit' : undefined);
  }

  i = undefined;
  inRange = undefined;
  lessThanNine = undefined;
  grown = Array<number>(digits.length + 1).fill(0);
  append('allocate-grown', `new int[${digits.length + 1}] 创建新数组对象 grown。Java 将每位默认初始化为 0；原 digits 对象仍存在且全为 0。`);
  grown[0] = 1;
  append('set-leading', '把新数组最高位写为 1，其余默认零形成 10…0。');
  append('return-grown', '返回 grown 的引用值；digits 和 grown 是不同数组对象。', 'result-length');
  const finalOutput = { kind: 'int-array' as const, values: [...grown] };
  checkAgainstOracle(input, finalOutput.values);
  return finalizeTrace({ problemId: '66', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

function checkAgainstOracle(input: PlusOneInput, actual: readonly number[]): void {
  const trusted = expectedOutput('66', input);
  if (trusted.kind !== 'int-array' || trusted.values.length !== actual.length || trusted.values.some((value, index) => value !== actual[index])) {
    throw new Error('66 参考状态模型与独立 BigInt 期望不一致');
  }
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'reset-nine' || snapshot.stepId === 'increment-digit') {
    const array = snapshot.structures.find(structure => structure.id === 'digits');
    if (array?.kind !== 'array') throw new Error('66 预测缺少原 digits 数组');
    const last = array.values[array.values.length - 1];
    if (last === undefined) throw new Error('66 预测缺少最低位');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：处理最右位后，这一位变成多少？', answer: { kind: 'int', value: last }, explanation: snapshot.explanation };
  }
  if (snapshot.stepId === 'return-digits' || snapshot.stepId === 'return-grown') {
    const returnedId = snapshot.stepId === 'return-digits' ? 'digits' : 'grown';
    const array = snapshot.structures.find(structure => structure.id === returnedId);
    if (array?.kind !== 'array') throw new Error('66 预测缺少返回数组');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：当前输入的返回数组有多少位？', answer: { kind: 'int', value: array.values.length }, explanation: snapshot.explanation };
  }
  throw new Error('66 预测检查点位置与参考代码不一致');
}
