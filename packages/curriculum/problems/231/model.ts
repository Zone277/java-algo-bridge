import { PowerOfTwoInputSchema, expectedOutput, type PowerOfTwoInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** A model of the preset reference algorithm, never an interpretation of student Java. */
export async function buildReferenceTrace(raw: PowerOfTwoInput, inputId: string): Promise<ReferenceTrace> {
  const input = PowerOfTwoInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const n = input.n;
  const snapshots: Snapshot[] = [];
  let nonpositive: boolean | undefined = undefined;
  let predecessor: number | undefined;
  let lowerBits: number | undefined;
  let result: boolean | undefined;

  const binary = (value: number) => (value >>> 0).toString(2).padStart(32, '0');
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'n', value: { kind: 'int', value: n } },
      { name: 'n 的 32 位视图（教学辅助）', value: { kind: 'string', value: binary(n) } },
    ];
    if (nonpositive !== undefined) variables.push({ name: 'n <= 0（表达式）', value: { kind: 'boolean', value: nonpositive } });
    if (predecessor !== undefined) {
      variables.push({ name: 'n - 1（表达式）', value: { kind: 'int', value: predecessor } });
      variables.push({ name: 'n - 1 的 32 位视图（教学辅助）', value: { kind: 'string', value: binary(predecessor) } });
    }
    if (lowerBits !== undefined) {
      variables.push({ name: 'lowerBits', value: { kind: 'int', value: lowerBits } });
      variables.push({ name: 'lowerBits 的 32 位视图（教学辅助）', value: { kind: 'string', value: binary(lowerBits) } });
    }
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });
    return { variables, structures: [], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 int 基本值 n。32 位视图仅是教学辅助，Java 代码并未创建数组或字符串。学生代码另走真实 Java 执行。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  nonpositive = n <= 0;
  append('check-positive', nonpositive
    ? `n=${n} 不大于 0，不满足 2 的非负整数次幂定义；接下来直接返回 false。`
    : `n=${n} 是正数，接下来计算 n & (n - 1)。`, 'positive-gate');

  if (nonpositive) {
    result = false;
    append('return-nonpositive', '提前返回 false；不会计算 n - 1 或 lowerBits。即使最小 int 的最高位为 1，也不能当作正的 2 的幂。', 'final-result');
  } else {
    predecessor = n - 1;
    lowerBits = n & predecessor;
    append('clear-lowest-one', `正数 ${n} 与 ${predecessor} 按位与，结果是 ${lowerBits}。n-1 会把最低的 1 改为 0，并把其右侧的 0 改为 1，因此按位与恰好清除 n 最低的那个 1。`);
    result = lowerBits === 0;
    append('return-result', `lowerBits=${lowerBits}，所以返回 ${result}。只有正数且仅有一个 1 位时结果为 true。`, 'final-result');
  }

  const oracle = expectedOutput('231', input);
  if (oracle.kind !== 'boolean' || oracle.value !== result) throw new Error('231 参考状态模型与独立除 2 期望不一致');
  return finalizeTrace({ problemId: '231', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const nValue = snapshot.variables.find(variable => variable.name === 'n')?.value;
  if (nValue?.kind !== 'int') throw new Error('231 预测缺少 n');
  const first = snapshot.stepId === 'check-positive';
  const value = snapshot.variables.find(variable => variable.name === (first ? 'n <= 0（表达式）' : '返回值'))?.value;
  if (value?.kind !== 'boolean') throw new Error('231 预测缺少布尔判断');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: first
      ? `先预测，再揭示：n=${nValue.value} 会因 n<=0 提前返回吗？`
      : `先预测，再揭示：n=${nValue.value} 最终返回 true 还是 false？`,
    answer: { kind: 'choice', optionId: first ? (value.value ? 'early' : 'continue') : (value.value ? 'true' : 'false') },
    options: first
      ? [{ id: 'early', label: '提前返回 false' }, { id: 'continue', label: '继续按位计算' }]
      : [{ id: 'true', label: 'true：是 2 的幂' }, { id: 'false', label: 'false：不是 2 的幂' }],
    explanation: snapshot.explanation,
  };
}
