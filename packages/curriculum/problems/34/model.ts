import { SearchRangeInputSchema, type ReferencePrediction, type ReferenceTrace, type SearchRangeInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** A model of the preset Java reference, never a trace of a student's source. */
export async function buildReferenceTrace(raw: SearchRangeInput, inputId: string): Promise<ReferenceTrace> {
  const input = SearchRangeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题仍支持 10000 项');

  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let phase: 'lower' | 'upper' = 'lower';
  let left: number | undefined;
  let right: number | undefined;
  let mid: number | undefined;
  let first: number | undefined = undefined;
  let condition: { name: string; value: boolean } | undefined;
  let result: [number, number] | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
      { name: '阶段（教学标记）', value: { kind: 'string', value: phase === 'lower' ? '第一个 >= target' : '第一个 > target' } },
    ];
    const indices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right], ['mid', mid], ['first', first]] as const) {
      if (value !== undefined) {
        variables.push({ name, value: { kind: 'int', value } });
        indices.push({ name, index: value });
      }
    }
    if (condition) variables.push({ name: condition.name, value: { kind: 'boolean', value: condition.value } });
    const structures: State['structures'][number][] = [{ kind: 'array', id: 'nums', values: [...nums], indices }];
    if (result) {
      variables.push({ name: '返回值', value: { kind: 'reference', objectId: 'result' } });
      structures.push({ kind: 'array', id: 'result', values: [...result], indices: [] });
    }
    return { variables, structures, explanation };
  };
  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 nums 的数组引用值和 target 的 int 基本值；尚未执行边界初始化。参考模型不执行学生 Java。'),
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
  append('lower-init-left', '第一轮二分从位置 0 开始；left 左侧尚无已排除元素。');
  right = nums.length;
  append('lower-init-right', `第一轮候选元素区间是 [0,${right})。right 可以等于 length，但不能作为数组元素下标读取。`);
  while (true) {
    mid = undefined;
    condition = { name: 'left < right（下界表达式）', value: left < right };
    append('lower-check-loop', condition.value ? `下界候选元素区间 [${left},${right}) 非空。` : `下界区间已空，left=right=${left} 是第一个 >= target 的位置。`);
    if (!condition.value) break;
    condition = undefined;
    mid = left + Math.floor((right - left) / 2);
    append('lower-compute-mid', `mid=${mid}，只读取半开区间内的 nums[mid]=${nums[mid]}。`);
    condition = { name: 'nums[mid] < target（下界表达式）', value: nums[mid]! < input.target };
    append('lower-check-less', `${nums[mid]} < ${input.target} 为 ${condition.value}；相等时不能丢弃 mid。`);
    if (condition.value) {
      condition = undefined;
      left = mid + 1;
      append('lower-move-left', `nums[mid] 和更左元素都 < target；left=mid+1=${left}。`);
    } else {
      condition = undefined;
      right = mid;
      append('lower-move-right', `nums[mid]>=target；mid 仍可能是第一个目标值，right=mid=${right}。`);
    }
  }
  condition = undefined;
  mid = undefined;
  first = left;
  append('save-first', `first=${first}：这是数组中第一个 >= target 的位置，可能等于 length。`, 'first-bound');
  const absent = first === nums.length || nums[first] !== input.target;
  condition = { name: 'first == nums.length || nums[first] != target（表达式）', value: absent };
  append('check-absent', absent
    ? `first=${first}${first === nums.length ? ' 已等于 length，Java 的 || 短路，不读取 nums[length]' : ` 指向 ${nums[first]} 而非 ${input.target}`}；目标不存在。`
    : `nums[first]=${nums[first]} 等于 target，继续查找第一个 > target 的位置。`);
  condition = undefined;
  if (absent) {
    result = [-1, -1];
    append('return-absent', '找不到 target；新建并返回 {-1,-1}。空数组也在此路径，不进入第二轮循环。', 'final-range');
  } else {
    left = first;
    phase = 'upper';
    append('upper-init-left', `第二轮从 first=${first} 开始；它已指向一个 target。right 尚未重设。`);
    right = nums.length;
    append('upper-init-right', `上界候选元素区间重设为 [${left},${right})，寻找第一个 > target 的位置。`);
    let firstUpperMid = true;
    while (true) {
      mid = undefined;
      condition = { name: 'left < right（上界表达式）', value: left < right };
      append('upper-check-loop', condition.value ? `上界候选元素区间 [${left},${right}) 非空。` : `上界区间已空，第一个 > target 的位置是 ${left}。`);
      if (!condition.value) break;
      condition = undefined;
      mid = left + Math.floor((right - left) / 2);
      append('upper-compute-mid', `mid=${mid}，数组下标合法，nums[mid]=${nums[mid]}。`, firstUpperMid ? 'upper-first-mid' : undefined);
      firstUpperMid = false;
      condition = { name: 'nums[mid] <= target（上界表达式）', value: nums[mid]! <= input.target };
      append('upper-check-less-equal', `${nums[mid]} <= ${input.target} 为 ${condition.value}；相等元素仍属于目标区段。`);
      if (condition.value) {
        condition = undefined;
        left = mid + 1;
        append('upper-move-left', `nums[mid] 及左侧都 <= target；left=mid+1=${left}，继续寻找第一个更大值。`);
      } else {
        condition = undefined;
        right = mid;
        append('upper-move-right', `nums[mid]>target，第一个更大值不晚于 mid；right=mid=${right}。`);
      }
    }
    condition = undefined;
    mid = undefined;
    result = [first, left - 1];
    append('return-range', `上界位置为 ${left}，其前一项 ${left - 1} 是最后一个 target；返回 [${first},${left - 1}]。`, 'final-range');
  }

  return finalizeTrace({
    problemId: '34', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots,
    finalOutput: { kind: 'int-array', values: [...result] },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'save-first' || snapshot.stepId === 'upper-compute-mid') {
    const name = snapshot.stepId === 'save-first' ? 'first' : 'mid';
    const value = snapshot.variables.find(variable => variable.name === name)?.value;
    if (value?.kind !== 'int') throw new Error(`第 34 题预测缺少 ${name} 整数状态`);
    return {
      checkpointId: snapshot.checkpointId,
      prompt: snapshot.stepId === 'save-first' ? '先预测，再揭示：下界循环结束后 first 是多少？' : '先预测，再揭示：上界循环第一次取到的 mid 是多少？',
      answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'return-absent' || snapshot.stepId === 'return-range') {
    const output = snapshot.structures.find(structure => structure.id === 'result');
    if (output?.kind !== 'array' || output.values.length !== 2) throw new Error('第 34 题预测缺少双下标返回数组');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：最终返回的两个下标是什么？请按 [first,last] 填写。',
      answer: { kind: 'text', value: `[${output.values[0]},${output.values[1]}]` },
      explanation: snapshot.explanation,
    };
  }
  throw new Error(`未知的第 34 题预测步骤：${snapshot.stepId}`);
}
