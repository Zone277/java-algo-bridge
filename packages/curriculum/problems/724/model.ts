import { PivotIndexInputSchema, type PivotIndexInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** This is the fixed reference algorithm, never a trace of student Java. */
export async function buildReferenceTrace(raw: PivotIndexInput, inputId: string): Promise<ReferenceTrace> {
  const input = PivotIndexInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题支持 10000 项');
  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let total: number | undefined;
  let j: number | undefined;
  let left: number | undefined;
  let i: number | undefined;
  let right: number | undefined;
  let result: number | undefined;
  let condition: { name: string; value: boolean } | undefined;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'nums', value: { kind: 'reference', objectId: 'nums' } }];
    for (const [name, value] of [['total', total], ['j', j], ['left', left], ['i', i], ['right', right], ['返回值', result]] as const) {
      if (value !== undefined) variables.push({ name, value: { kind: 'int', value } });
    }
    if (condition) variables.push({ name: condition.name, value: { kind: 'boolean', value: condition.value } });
    const indices: { name: string; index: number }[] = [];
    if (j !== undefined) indices.push({ name: 'j', index: j });
    if (i !== undefined) indices.push({ name: 'i', index: i });
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('nums 保存数组引用值；total、left、循环下标和 right 尚未声明。局部变量没有自动可用的默认值，数组保持原样。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  total = 0;
  append('init-total', '显式初始化 total=0；尚未计入任何数组元素。此时 total 只是空前缀的和。');
  for (j = 0; ; j++) {
    condition = { name: 'j < nums.length', value: j < nums.length };
    append('check-total-loop', condition.value ? `j=${j}，已经计入 [0,${j})，准备累加 nums[${j}]=${nums[j]}。` : `j=${j} 等于数组长度，求和循环结束；total=${total} 才是完整总和。没有读取 nums[${j}]。`);
    if (!condition.value) break;
    total += nums[j]!;
    condition = undefined;
    append('add-total', `把 nums[${j}]=${nums[j]} 加入 total，得到 ${total}；现在计入 [0,${j + 1})。j++ 尚未执行。`);
  }
  j = undefined;
  condition = undefined;
  left = 0;
  append('init-left', `求和循环的 j 已离开作用域。total=${total}；left=0 表示第一个候选左边没有元素，空侧和为 0。`);
  for (i = 0; ; i++) {
    right = undefined;
    condition = { name: 'i < nums.length', value: i < nums.length };
    append('check-pivot-loop', condition.value ? `候选 i=${i}，left=${left} 只包含 [0,${i})；本轮 right 尚未声明。` : `i=${i} 等于长度，所有候选都已检查且不平衡；不访问 nums[${i}]，right 已离开上一轮作用域。`);
    if (!condition.value) break;
    condition = undefined;
    right = total - left - nums[i]!;
    append('compute-right', `right=${total}-${left}-(${nums[i]})=${right}，对应 [${i + 1},${nums.length})。左侧 [0,${i}) 的和为 ${left}；中心 nums[${i}]=${nums[i]} 不计入任一侧。`, i === 0 ? 'first-right' : undefined);
    condition = { name: 'left == right', value: left === right };
    append('check-balance', `候选 ${i} 的 left=${left}、right=${right}，相等判断为 ${condition.value}。${condition.value ? '之前所有下标都已失败，所以它是最左合法下标。' : '此候选不成立，下一步才把当前元素移入下一候选的左侧。'}`);
    if (condition.value) {
      condition = undefined;
      result = i;
      append('found', `返回最左中心下标 ${result}，不是元素值 ${nums[i]}。当前 i 与 right 仍在 return 所在作用域内，后面的累加与候选检查不再执行。`, 'final-result');
      break;
    }
    condition = undefined;
    left += nums[i]!;
    append('advance-left', `left 加上 nums[${i}]=${nums[i]} 后为 ${left}，覆盖 [0,${i + 1})，供下一个候选使用。i 尚未递增；right=${right} 保留本轮计算值，并未随 left 自动重算，下一轮会重新声明。`);
  }
  if (result === undefined) {
    i = undefined;
    right = undefined;
    condition = undefined;
    result = -1;
    append('not-found', '循环结束，i 与 right 都已离开作用域；left 已包含所有元素。返回 -1 表示无解，不是访问 nums[-1]。', 'final-result');
  }
  return finalizeTrace({ problemId: '724', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-right' ? 'right' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error('724 预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: name === 'right' ? '先预测，再揭示：第一个候选 i=0 的严格右侧元素和 right 是多少？' : '先预测，再揭示：方法返回哪个最左中心下标，或返回 -1？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
