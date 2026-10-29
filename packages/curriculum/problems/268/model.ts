import { MissingNumberInputSchema, expectedOutput, type MissingNumberInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Models only the published reference algorithm; student Java is executed by the separate runner. */
export async function buildReferenceTrace(raw: MissingNumberInput, inputId: string): Promise<ReferenceTrace> {
  const input = MissingNumberInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 项；真实 Java 判题仍支持 10000 项');

  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let missing: number | undefined;
  let i: number | undefined;
  let loopCondition: boolean | undefined;
  let completedPairs = 0;
  let indexApplied = false;
  let result: number | undefined = undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'nums.length（表达式）', value: { kind: 'int', value: nums.length } },
      { name: '已完整配对项数（教学）', value: { kind: 'int', value: completedPairs } },
      { name: '本轮仅并入下标（教学）', value: { kind: 'boolean', value: indexApplied } },
    ];
    if (missing !== undefined) variables.push({ name: 'missing', value: { kind: 'int', value: missing } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (loopCondition !== undefined) variables.push({ name: 'i < nums.length（条件表达式）', value: { kind: 'boolean', value: loopCondition } });
    if (i !== undefined && i < nums.length) variables.push({ name: 'nums[i]（表达式）', value: { kind: 'int', value: nums[i]! } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    const indices = i === undefined ? [] : [{ name: 'i', index: i }];
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('参数 nums 保存数组对象的引用值副本。局部 missing 和 i 尚未初始化；两个带“教学”字样的读数并非 Java 变量。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('第 268 题参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  missing = nums.length;
  append('init-missing', `先把候选值 n=${nums.length} 放入 missing。数组只存 n 项，但候选值有 0..n 共 n+1 个。`, 'initial-n');
  i = 0;
  append('init-index', 'i=0，准备把下标与对应数组值成对异或。循环入口不变量：missing=n ^ 已处理下标 ^ 已处理数组值。');
  while (true) {
    loopCondition = i < nums.length;
    append('check-index', loopCondition
      ? `i=${i}<${nums.length}；此前完整配对 ${completedPairs} 项，下一项可安全访问。`
      : `i=${i} 已等于长度，所有 ${completedPairs} 对都已处理，不能再访问 nums[i]。`);
    if (!loopCondition) break;

    missing ^= i;
    indexApplied = true;
    append('xor-index', `先把下标 ${i} 异或进 missing，暂得 ${missing}。此时 nums[i] 尚未异或，完整配对数仍为 ${completedPairs}。`);

    missing ^= nums[i]!;
    completedPairs++;
    indexApplied = false;
    append('xor-value', `再把 nums[${i}]=${nums[i]} 异或进去，得 ${missing}。前 ${completedPairs} 对完成；i 尚未增加。`, completedPairs === 1 ? 'first-pair' : undefined);

    i++;
    loopCondition = undefined;
    append('advance-index', `i 前进到 ${i}。循环入口不变量恢复：missing 等于 n、前 ${completedPairs} 个下标及前 ${completedPairs} 个数组值的异或。`);
  }
  result = missing;
  append('return-missing', `返回 ${result}。0..n 的全部候选值与实际数组值逐个抵消后，仅缺失值留下；数组并未修改。`, 'final-missing');

  const trusted = expectedOutput('268', input);
  if (trusted.kind !== 'int' || trusted.value !== result) throw new Error('268 参考状态模型与独立 seen 位图可信期望不一致');
  return finalizeTrace({ problemId: '268', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'return-missing' ? '返回值' : 'missing';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`268 预测缺少 ${name} 的整数状态`);
  const prompt = snapshot.stepId === 'init-missing'
    ? '先预测，再揭示：数组有 n 项，missing 应先设为哪个候选值？'
    : snapshot.stepId === 'xor-value'
      ? '先预测，再揭示：第一对下标 0 与 nums[0] 都异或后，missing 是多少？'
      : '先预测，再揭示：所有项处理后，返回哪个缺失值？';
  return { checkpointId: snapshot.checkpointId, prompt, answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
