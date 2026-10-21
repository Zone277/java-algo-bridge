import { RotatedSearchInputSchema, type RotatedSearchInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Models the fixed reference only; student Java has a separate execution channel. */
export async function buildReferenceTrace(raw: RotatedSearchInput, inputId: string): Promise<ReferenceTrace> {
  const input = RotatedSearchInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题支持 5000 项');
  const { target } = input;
  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let mid: number | undefined;
  let condition: { name: string; value: boolean } | undefined;
  let result: number | undefined;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: target } },
    ];
    const indices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right], ['mid', mid]] as const) {
      if (value !== undefined) {
        variables.push({ name, value: { kind: 'int', value } });
        indices.push({ name, index: value });
      }
    }
    if (condition) variables.push({ name: condition.name, value: { kind: 'boolean', value: condition.value } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('nums 是数组引用值，target 是 int 基本值；边界和中点尚未声明。数组不会被修改。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };
  left = 0;
  append('init-left', 'left=0；右边界尚未初始化。');
  right = nums.length - 1;
  append('init-right', `right=${right}，建立候选闭区间 [0,${right}]；target 若存在，一定在该区间内。`);
  let firstMid = true;
  while (true) {
    mid = undefined;
    condition = { name: 'left <= right', value: left <= right };
    append('check-loop', condition.value ? `闭区间 [${left},${right}] 非空。只剩一项也需要检查。` : `left=${left}>right=${right}，候选区间为空；没有读取任何越界元素。`);
    if (!condition.value) break;
    condition = undefined;
    mid = left + Math.floor((right - left) / 2);
    append('compute-mid', `mid=${left}+(${right}-${left})/2 的整数部分=${mid}，这是下标，不是元素值 ${nums[mid]}。`, firstMid ? 'first-mid' : undefined);
    firstMid = false;
    condition = { name: 'nums[mid] == target', value: nums[mid] === target };
    append('check-equal', `nums[${mid}]=${nums[mid]}，target=${target}，相等判断为 ${condition.value}。先检查命中，再讨论哪一半有序。`);
    if (condition.value) {
      result = mid;
      condition = undefined;
      append('found', `命中 target=${target}，返回它在原数组中的下标 ${result}。mid 仍在当前循环体作用域内。`, 'final-result');
      break;
    }
    condition = { name: 'nums[left] <= nums[mid]', value: nums[left]! <= nums[mid]! };
    append('check-left-sorted', `nums[left]=${nums[left]}，nums[mid]=${nums[mid]}，左半有序判断为 ${condition.value}。${condition.value ? '包含 left=mid 的单项区间。' : '左半跨越下降处，所以右半 [mid,right] 有序。'}`);
    let stepId: string;
    let explanation: string;
    if (condition.value) {
      condition = { name: 'nums[left] <= target && target < nums[mid]', value: nums[left]! <= target && target < nums[mid]! };
      append('check-left-range', `检查 ${nums[left]}<=${target}<${nums[mid]}，结果为 ${condition.value}。有序只提供值域判断，不能仅看 target 比中点小就决定向左。`);
      if (condition.value) {
        right = mid - 1;
        stepId = 'keep-left';
        explanation = 'target 落在有序左半的值域内；保留左半并排除已经检查过的 mid';
      } else {
        left = mid + 1;
        stepId = 'discard-left';
        explanation = 'target 不在有序左半的值域内；排除左半以及已经检查过的 mid';
      }
    } else {
      condition = { name: 'nums[mid] < target && target <= nums[right]', value: nums[mid]! < target && target <= nums[right]! };
      append('check-right-range', `检查 ${nums[mid]}<${target}<=${nums[right]}，结果为 ${condition.value}。右端点也在候选范围内，不能漏掉等号。`);
      if (condition.value) {
        left = mid + 1;
        stepId = 'keep-right';
        explanation = 'target 落在有序右半的值域内；保留右半并排除已经检查过的 mid';
      } else {
        right = mid - 1;
        stepId = 'discard-right';
        explanation = 'target 不在有序右半的值域内；排除右半以及已经检查过的 mid';
      }
    }
    condition = undefined;
    append(stepId, `${explanation}。新候选区间 [${left},${right}]；mid=${mid} 仍是本轮旧值，下一轮离开作用域后才清除并重算。空区间是正常的未找到状态。`);
  }
  if (result === undefined) {
    result = -1;
    condition = undefined;
    append('not-found', '所有候选都已排除，返回 -1；这是未找到的返回值，不是要读取 nums[-1]。', 'final-result');
  }
  return finalizeTrace({ problemId: '33', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-mid' ? 'mid' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error('33 预测缺少整数状态');
  return { checkpointId: snapshot.checkpointId, prompt: name === 'mid' ? '先预测，再揭示：这一轮计算出的 mid 下标是多少？' : '先预测，再揭示：方法返回哪个下标，或返回 -1？', answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
