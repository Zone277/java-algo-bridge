import {
  SearchInsertInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type SearchInsertInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure model of the preset half-open lower-bound solution. It never reads student Java. */
export async function buildReferenceTrace(raw: SearchInsertInput, inputId: string): Promise<ReferenceTrace> {
  const input = SearchInsertInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 个数组项；真实判题仍支持 10000 项');

  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let mid: number | undefined;
  let loopCondition: boolean | undefined;
  let lessThan: boolean | undefined;
  let result: number | undefined = undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
    ];
    const indices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right], ['mid', mid]] as const) {
      if (value !== undefined) {
        variables.push({ name, value: { kind: 'int', value } });
        indices.push({ name, index: value });
      }
    }
    if (loopCondition !== undefined) variables.push({ name: 'left < right', value: { kind: 'boolean', value: loopCondition } });
    if (lessThan !== undefined) variables.push({ name: 'nums[mid] < target', value: { kind: 'boolean', value: lessThan } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return {
      variables,
      structures: [{ kind: 'array', id: 'nums', values: [...input.nums], indices }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到严格升序数组与 target；尚未执行 left/right 初始化。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  left = 0;
  append('init-left', 'left=0；尚未排除数组开头的任何位置。');
  right = input.nums.length;
  append('init-right', `right=nums.length=${right}。待比较元素区间是 [0,${right})，right 本身是位置哨兵。`);

  let firstMid = true;
  let firstBoundary = true;
  while (true) {
    mid = undefined;
    lessThan = undefined;
    loopCondition = left < right;
    append(
      'check-loop',
      loopCondition
        ? `[${left},${right}) 非空，仍有元素需要判定。`
        : `left==right==${left}，[${left},${right}) 为空；lower_bound 位置已经确定。`,
    );
    if (!loopCondition) break;

    loopCondition = undefined;
    mid = left + Math.floor((right - left) / 2);
    append(
      'compute-mid',
      `mid=${left}+(${right}-${left})/2 的整数部分=${mid}，且 ${left}<=mid<${right}，可以安全读取 nums[mid]。`,
      firstMid ? 'first-mid' : undefined,
    );
    firstMid = false;

    lessThan = input.nums[mid]! < input.target;
    append(
      'check-less',
      `nums[${mid}]=${input.nums[mid]} < target ${input.target} 为 ${lessThan}。`,
    );
    if (lessThan) {
      left = mid + 1;
      append(
        'move-left',
        `mid 及其左侧都小于 target；left=mid+1=${left}，这些位置从候选范围中排除。`,
        firstBoundary ? 'first-boundary' : undefined,
      );
    } else {
      right = mid;
      append(
        'move-right',
        `nums[mid]>=target，mid 仍可能是第一个合格位置；right=mid=${right}，保留这个位置。`,
        firstBoundary ? 'first-boundary' : undefined,
      );
    }
    firstBoundary = false;
  }

  loopCondition = undefined;
  lessThan = undefined;
  mid = undefined;
  result = left;
  append('return-left', `left 与 right 汇合在 ${left}；它是第一个大于等于 target 的位置，返回 ${left}。`);

  return finalizeTrace({
    problemId: '35',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input,
    initialState,
    snapshots,
    finalOutput: expectedOutput('35', input),
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-mid'
    ? 'mid'
    : snapshot.stepId === 'move-left'
      ? 'left'
      : snapshot.stepId === 'move-right'
        ? 'right'
        : null;
  if (name === null) throw new Error('未知的搜索插入预测检查点');
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`预测检查点缺少 ${name} 整数状态`);
  return {
    checkpointId: snapshot.checkpointId,
    prompt: `先预测，再揭示：执行这一步后，${name} 是多少？`,
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
