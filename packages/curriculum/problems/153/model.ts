import { RotatedMinimumInputSchema, type RotatedMinimumInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Models only the declared reference Java, never a student's editable source. */
export async function buildReferenceTrace(raw: RotatedMinimumInput, inputId: string): Promise<ReferenceTrace> {
  const input = RotatedMinimumInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题支持 5000 项');
  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let mid: number | undefined;
  let condition: boolean | undefined;
  let compare: boolean | undefined;
  let result: number | undefined = undefined;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'nums', value: { kind: 'reference', objectId: 'nums' } }];
    const indices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right], ['mid', mid]] as const) {
      if (value !== undefined) {
        variables.push({ name, value: { kind: 'int', value } });
        indices.push({ name, index: value });
      }
    }
    if (condition !== undefined) variables.push({ name: 'left < right', value: { kind: 'boolean', value: condition } });
    if (compare !== undefined) variables.push({ name: '本轮 nums[mid] > nums[right]', value: { kind: 'boolean', value: compare } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 nums 的引用值；数组保持原样。left、right、mid 尚未声明，区间尚未建立。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };
  left = 0;
  append('init-left', 'left=0，候选区间从第一个元素开始。');
  right = nums.length - 1;
  append('init-right', `right=${right}，闭区间 [0,${right}] 包含全部元素，最小值一定在其中。`, nums.length === 1 ? 'first-candidate' : undefined);
  let firstMid = true;
  while (true) {
    mid = undefined;
    compare = undefined;
    condition = left < right;
    append('check-loop', condition ? `候选闭区间 [${left},${right}] 还有至少两项，继续二分。` : `left=right=${left}，候选区间只剩一个元素，循环结束。`);
    if (!condition) break;
    condition = undefined;
    mid = left + Math.floor((right - left) / 2);
    append('compute-mid', `mid=${left}+(${right}-${left})/2 的整数部分=${mid}。left<=mid<right，比较的两项下标不同。`, firstMid ? 'first-candidate' : undefined);
    firstMid = false;
    compare = nums[mid]! > nums[right]!;
    append('compare-right', `nums[mid]=${nums[mid]}，nums[right]=${nums[right]}，比较结果为 ${compare}。${compare ? '跨过下降处后才会到达右端，最小值在 mid 右侧。' : 'mid 到 right 已升序，但 mid 本身仍可能是最小值。'}`);
    const oldMid = mid;
    const oldRight = right;
    if (compare) {
      left = mid + 1;
      append('move-left', `排除到旧 mid=${oldMid} 为止的前半段，left=${left}。候选区间变为 [${left},${right}]。mid 仍保存本轮旧下标，比较结果也属于移动前的两项；下一轮才重新计算。`);
    } else {
      right = mid;
      append('keep-mid', `right 从 ${oldRight} 移到 mid=${mid}，保留 mid 作为候选，区间为 [${left},${right}]。不能写 mid-1；本轮比较结果属于修改前的 right=${oldRight}，并非重新比较更新后的同一下标。`);
    }
  }
  result = nums[left]!;
  append('return-min', `返回 nums[${left}]=${result}，返回的是元素值，不是下标 ${left}。这是参考模型结果；学生 Java 必须经真实 javac/java 判定。`, 'final-result');
  return finalizeTrace({ problemId: '153', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-mid' ? 'mid' : snapshot.stepId === 'init-right' ? 'right' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error('153 预测缺少整数状态');
  return { checkpointId: snapshot.checkpointId, prompt: `先预测，再揭示：${name === '返回值' ? '循环结束，方法返回哪个元素值' : `执行这一步后 ${name} 是多少`}？`, answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
