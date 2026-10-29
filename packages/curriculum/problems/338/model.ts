import { CountingBitsInputSchema, expectedOutput, type CountingBitsInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Deterministic preset-reference trace; this never compiles or inspects student Java. */
export async function buildReferenceTrace(raw: CountingBitsInput, inputId: string): Promise<ReferenceTrace> {
  const input = CountingBitsInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.n > 29) throw new Error('参考状态演示最多显示 30 项（n≤29）；真实 Java 判题仍支持 n≤9999');

  const bits = Array<number>(input.n + 1).fill(0);
  const known: (number | null)[] = Array<number | null>(input.n + 1).fill(null);
  let allocated = false;
  let i: number | undefined;
  let condition: boolean | undefined;
  let half: number | undefined;
  let lowBit: number | undefined;
  let halfCount: number | undefined;
  let activeIndex: number | null = null;
  const snapshots: Snapshot[] = [];

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'n', value: { kind: 'int', value: input.n } }];
    if (allocated) variables.push({ name: 'bits', value: { kind: 'reference', objectId: 'bits' } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (condition !== undefined) variables.push({ name: 'i <= n（表达式）', value: { kind: 'boolean', value: condition } });
    if (half !== undefined) variables.push({ name: 'i >> 1（表达式）', value: { kind: 'int', value: half } });
    if (lowBit !== undefined) variables.push({ name: 'i & 1（表达式）', value: { kind: 'int', value: lowBit } });
    if (halfCount !== undefined) variables.push({ name: 'bits[i >> 1]（表达式）', value: { kind: 'int', value: halfCount } });
    return {
      variables,
      structures: allocated ? [
        { kind: 'array', id: 'bits', values: [...bits], indices: i !== undefined && i <= input.n ? [{ name: 'i', index: i }] : [] },
        { kind: 'dp', id: 'derived-counts', values: [...known], activeIndex },
      ] : [],
      explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 int 基本值 n；bits 数组尚未创建。此处仅演示预置参考算法，学生代码另走真实 Java 执行。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  allocated = true;
  known[0] = 0;
  activeIndex = 0;
  append('allocate-bits', `new int[${input.n + 1}] 创建结果数组；Java 将所有元素初始化为 0。只把 bits[0]=0 记为已推导答案，其余零暂时只是默认值。`, input.n === 0 ? 'middle-count' : undefined);

  for (i = 1; ; i++) {
    half = undefined; lowBit = undefined; halfCount = undefined;
    condition = i <= input.n;
    append('check-index', condition
      ? `i=${i}≤n，准备使用更小的已知状态 bits[${i >> 1}] 求 bits[${i}]。`
      : `i=${i}>n，循环结束；已推导下标 0…${input.n} 的全部结果。`);
    if (!condition) break;

    half = i >> 1;
    lowBit = i & 1;
    halfCount = bits[half]!;
    bits[i] = halfCount + lowBit;
    known[i] = bits[i]!;
    activeIndex = i;
    append('assign-count', `i=${i} 的二进制去掉末位得到 ${half}；末位为 ${lowBit}，因此 bits[${i}]=bits[${half}]+${lowBit}=${bits[i]}。`, i === Math.max(1, Math.floor(input.n / 2)) ? 'middle-count' : undefined);
  }

  i = undefined; condition = undefined; half = undefined; lowBit = undefined; halfCount = undefined;
  append('return-bits', `返回长度为 ${bits.length} 的整个 bits 数组；下标 k 的值是整数 k 的二进制 1 的个数。`, 'final-count');
  const finalOutput = { kind: 'int-array' as const, values: [...bits] };
  const trusted = expectedOutput('338', input);
  if (trusted.kind !== 'int-array' || trusted.values.length !== bits.length || trusted.values.some((value, index) => value !== bits[index])) {
    throw new Error('338 参考状态模型与独立逐数位计数期望不一致');
  }
  return finalizeTrace({ problemId: '338', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const nValue = snapshot.variables.find(variable => variable.name === 'n')?.value;
  if (nValue?.kind !== 'int') throw new Error('338 预测缺少 n');
  const n = nValue.value;
  const position = snapshot.stepId === 'return-bits' ? n : snapshot.stepId === 'allocate-bits' ? 0 : snapshot.variables.find(variable => variable.name === 'i')?.value;
  const target = typeof position === 'number' ? position : position?.kind === 'int' ? position.value : undefined;
  const dp = snapshot.structures.find(structure => structure.id === 'derived-counts');
  if (target === undefined || dp?.kind !== 'dp' || dp.values[target] === null || dp.values[target] === undefined) throw new Error('338 预测缺少已推导状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: snapshot.stepId === 'return-bits'
      ? `先预测，再揭示：全部计算完成后，返回数组的 bits[${n}] 是多少？`
      : `先预测，再揭示：当前输入中 bits[${target}] 将是多少？`,
    answer: { kind: 'int', value: dp.values[target] }, explanation: snapshot.explanation,
  };
}
