import { SingleNumberInputSchema, expectedOutput, type SingleNumberInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset reference algorithm only: this never evaluates student Java. */
export async function buildReferenceTrace(raw: SingleNumberInput, inputId: string): Promise<ReferenceTrace> {
  const input = SingleNumberInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 项；真实判题仍支持 10000 项');
  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let result: number | undefined;
  let i: number | undefined;
  let condition: boolean | undefined;
  let processed = 0;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'processed（教学已处理项数）', value: { kind: 'int', value: processed } },
    ];
    if (result !== undefined) {
      variables.push({ name: 'result', value: { kind: 'int', value: result } });
      variables.push({ name: 'result 的 32 位表示（教学）', value: { kind: 'string', value: (result >>> 0).toString(2).padStart(32, '0') } });
    }
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (i !== undefined && i < nums.length) variables.push({ name: 'nums[i]（表达式）', value: { kind: 'int', value: nums[i]! } });
    if (condition !== undefined) variables.push({ name: 'i < nums.length', value: { kind: 'boolean', value: condition } });
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices: i !== undefined && i < nums.length ? [{ name: 'i', index: i }] : [] }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法参数 nums 保存调用者数组的引用值副本。数组不变；局部 int 尚未初始化。processed 与二进制字符串只是教学读数，不是 Java 源码里的变量。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => snapshots.push({
    snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
    ...state(explanation), ...(checkpointId ? { checkpointId } : {}),
  });
  result = 0;
  append('init-result', 'result=0：空前缀的异或为 0，它不会改变以后加入的值。');
  i = 0;
  append('init-index', 'i=0，准备从首项开始。此刻 result 是 nums[0..i) 的异或。');
  while (true) {
    condition = i < nums.length;
    append('check-index', condition ? `i=${i} 小于长度 ${nums.length}，可以访问 nums[i]。此刻已处理前 ${processed} 项。` : `i=${i} 等于长度，循环结束；所有 ${processed} 项已经参与异或。`);
    if (!condition) break;
    const previous = result;
    result ^= nums[i]!;
    processed++;
    append('xor-value', `${previous} ^ ${nums[i]} = ${result}。result 现在代表前 ${processed} 项的异或；i 还没有增加，所以这一刻前缀为 nums[0..i+1)。`, processed === 1 ? 'first-xor' : undefined);
    i++;
    condition = undefined;
    append('advance-index', `i 前进到 ${i}，不改数组。循环边界不变量恢复：result 等于 nums[0..i) 的异或，已处理 ${processed} 项。`);
  }
  append('return-result', `返回 ${result}。相同的两份 32 位模式全部抵消，唯一未配对的值保留下来；输入顺序不影响结果。`, 'final-result');
  const finalOutput = { kind: 'int' as const, value: result };
  const expected = expectedOutput('136', input);
  if (expected.kind !== 'int' || expected.value !== result) throw new Error('参考模型与独立频次判定不一致');
  return finalizeTrace({ problemId: '136', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input: { nums }, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const value = snapshot.variables.find(variable => variable.name === 'result')?.value;
  if (value?.kind !== 'int') throw new Error('异或预测缺少 result');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: snapshot.stepId === 'xor-value' ? '先预测，再揭示：第一项参与异或后 result 是多少？' : '先预测，再揭示：所有项参与异或后，返回的 result 是多少？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
