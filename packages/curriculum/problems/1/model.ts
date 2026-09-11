import { TwoSumInputSchema, type ReferencePrediction, type ReferenceTrace, type TwoSumInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure model of the preset reference solution. It never reads or interprets student Java. */
export async function buildReferenceTrace(raw: TwoSumInput, inputId: string): Promise<ReferenceTrace> {
  const input = TwoSumInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const seen = new Map<number, number>();
  const snapshots: Snapshot[] = [];
  let mapInitialized = false;
  let index: number | undefined;
  let complement: number | undefined;
  let hit: boolean | undefined;
  let oldIndex: number | undefined;
  let result: [number, number] | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
    ];
    if (mapInitialized) variables.push({ name: 'seen', value: { kind: 'reference', objectId: 'seen' } });
    if (index !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: index } });
    if (complement !== undefined) variables.push({ name: 'complement', value: { kind: 'int', value: complement } });
    if (hit !== undefined) variables.push({ name: '补数已出现', value: { kind: 'boolean', value: hit } });
    if (oldIndex !== undefined) variables.push({ name: '旧下标', value: { kind: 'int', value: oldIndex } });
    if (result) variables.push(
      { name: '返回值', value: { kind: 'reference', objectId: 'result' } },
      { name: '返回下标0', value: { kind: 'int', value: result[0] } },
      { name: '返回下标1', value: { kind: 'int', value: result[1] } },
    );
    const structures: State['structures'][number][] = [
      { kind: 'array', id: 'nums', values: [...input.nums], indices: index === undefined ? [] : [{ name: 'i', index }] },
      { kind: 'map', id: 'seen', entries: [...seen].map(([key, value]) => ({ key: { kind: 'int', value: key }, value: { kind: 'int', value } })) },
    ];
    if (result) structures.push({ kind: 'array', id: 'result', values: [...result], indices: [] });
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 nums 与 target；HashMap 尚未创建，演示区中的 Map 为空。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  mapInitialized = true;
  append('init-map', '创建空的 seen：键是已经处理过的元素值，值是该元素的下标。');
  let firstComplement = true;
  for (let current = 0; current < input.nums.length; current++) {
    index = current; complement = undefined; hit = undefined; oldIndex = undefined;
    append('loop-index', `进入 i=${index}。此刻 seen 只包含下标小于 ${index} 的已处理项。`);
    complement = input.target - input.nums[index]!;
    append('compute-complement', `要与 nums[${index}]=${input.nums[index]} 配对的补数是 ${input.target}-${input.nums[index]}=${complement}。`, firstComplement ? 'first-complement' : undefined);
    firstComplement = false;
    hit = seen.has(complement);
    append('check-complement', hit ? `seen 已有补数 ${complement}；可以使用旧下标和当前下标。` : `seen 尚无补数 ${complement}；当前元素还不能组成答案。`);
    if (hit) {
      oldIndex = seen.get(complement)!;
      result = [oldIndex, index];
      append('return-pair', `返回 [${oldIndex}, ${index}]。旧下标 ${oldIndex} < 当前下标 ${index}，两个位置必不相同。`, 'first-hit-index');
      break;
    }
    seen.set(input.nums[index]!, index);
    append('store-current', `记录 ${input.nums[index]} → ${index}。先查后存，防止当前元素与自己配对。`);
  }
  if (!result) {
    append('no-pair', '本站有效输入保证恰有一个不同下标的解；走到这里表示契约或参考模型有误。');
    throw new Error('TwoSumInput contract promised one pair');
  }
  return finalizeTrace({
    problemId: '1', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input,
    initialState, snapshots, finalOutput: { kind: 'int-array', values: [...result] },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const variableName = snapshot.stepId === 'compute-complement' ? 'complement' : '返回下标0';
  const value = snapshot.variables.find(variable => variable.name === variableName)?.value;
  if (value?.kind !== 'int') throw new Error('预测检查点缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: snapshot.stepId === 'compute-complement'
      ? '先预测，再揭示：当前元素需要寻找的 complement 是多少？'
      : '先预测，再揭示：补数命中 Map 后，返回数组中的旧下标是多少？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
