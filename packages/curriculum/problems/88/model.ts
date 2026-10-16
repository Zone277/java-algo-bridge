import { MergeSortedArrayInputSchema, type MergeSortedArrayInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure state model of the preset Java solution, never an interpreter for student code. */
export async function buildReferenceTrace(raw: MergeSortedArrayInput, inputId: string): Promise<ReferenceTrace> {
  const input = MergeSortedArrayInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums1.length > 30) throw new Error('参考演示最多显示 30 项；真实判题仍支持 200 项');
  const original = { nums1: [...input.nums1], m: input.m, nums2: [...input.nums2], n: input.n };
  const nums1 = [...input.nums1];
  const nums2 = [...input.nums2];
  const snapshots: Snapshot[] = [];
  let i: number | undefined;
  let j: number | undefined;
  let write: number | undefined;
  let loopCondition: boolean | undefined;
  let chooseFirst: boolean | undefined;
  let phase = '尚未初始化';

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums1', value: { kind: 'reference', objectId: 'nums1' } },
      { name: 'm', value: { kind: 'int', value: input.m } },
      { name: 'nums2', value: { kind: 'reference', objectId: 'nums2' } },
      { name: 'n', value: { kind: 'int', value: input.n } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const firstIndices: { name: string; index: number }[] = [];
    const secondIndices: { name: string; index: number }[] = [];
    if (i !== undefined) { variables.push({ name: 'i', value: { kind: 'int', value: i } }); firstIndices.push({ name: 'i', index: i }); }
    if (j !== undefined) { variables.push({ name: 'j', value: { kind: 'int', value: j } }); secondIndices.push({ name: 'j', index: j }); }
    if (write !== undefined) { variables.push({ name: 'write', value: { kind: 'int', value: write } }); firstIndices.push({ name: 'write', index: write }); }
    if (loopCondition !== undefined) variables.push({ name: 'j >= 0', value: { kind: 'boolean', value: loopCondition } });
    if (chooseFirst !== undefined) variables.push({ name: '选 nums1[i]', value: { kind: 'boolean', value: chooseFirst } });
    return {
      variables,
      structures: [
        { kind: 'array', id: 'nums1', values: [...nums1], indices: firstIndices },
        { kind: 'array', id: 'nums2', values: [...nums2], indices: secondIndices },
      ],
      explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到两个数组的引用值；nums1 的后 n 格是预留位置，尚未写入合并结果。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  phase = '从右往左填充';
  i = input.m - 1;
  append('init-i', `i=${i}，指向 nums1 已有的最后一个有效元素；-1 表示这部分为空。`);
  j = input.n - 1;
  append('init-j', `j=${j}，指向 nums2 的最后一个元素；-1 表示 nums2 为空。`);
  write = input.m + input.n - 1;
  append('init-write', `write=${write}，从原 nums1 的末尾向左放较大的元素。`, 'first-write-index');
  let firstChoice = true;
  for (;;) {
    loopCondition = j >= 0;
    chooseFirst = undefined;
    append('check-loop', loopCondition ? `j=${j}，nums2 尚有元素必须放入 nums1。` : 'nums2 已空；nums1 未移动的前缀本来就在正确位置，方法结束。', !loopCondition && firstChoice ? 'first-choice' : undefined);
    if (!loopCondition) break;

    chooseFirst = i >= 0 && nums1[i]! > nums2[j]!;
    append('choose-branch', chooseFirst ? `nums1[${i}]=${nums1[i]} 大于 nums2[${j}]=${nums2[j]}，取 nums1 当前末尾。` : i < 0 ? 'nums1 的有效前缀已空，取 nums2 当前末尾。' : `nums1[${i}]=${nums1[i]} 不大于 nums2[${j}]=${nums2[j]}，取 nums2 当前末尾。`, firstChoice ? 'first-choice' : undefined);
    firstChoice = false;
    if (chooseFirst) {
      nums1[write] = nums1[i]!;
      append('write-first', `把 nums1[${i}] 的值写入原数组的 nums1[${write}]；从这一格到末尾已是最终合并后缀。`);
      i--;
      append('move-i', `i 移到 ${i}，下次比较 nums1 剩余有效前缀的末尾。`);
    } else {
      nums1[write] = nums2[j]!;
      append('write-second', `把 nums2[${j}] 的值写入原数组的 nums1[${write}]；从这一格到末尾已是最终合并后缀。`);
      j--;
      append('move-j', `j 移到 ${j}；nums2 从旧 j 往后的值都已经放入 nums1。`);
    }
    write--;
    append('move-write', `write 移到 ${write}；已填后缀从 ${write + 1} 开始，不再更改。`);
  }
  phase = '完成';
  return finalizeTrace({
    problemId: '88', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: original, initialState, snapshots,
    finalOutput: { kind: 'int-array', values: nums1 },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'init-write') {
    const value = snapshot.variables.find(variable => variable.name === 'write')?.value;
    if (value?.kind !== 'int') throw new Error('写入下标预测缺少整数状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：开始写入时，write 是 nums1 的哪个 Java 下标？', answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
  }
  const chooseFirst = snapshot.variables.find(variable => variable.name === '选 nums1[i]')?.value;
  const answer = chooseFirst?.kind === 'boolean' ? (chooseFirst.value ? 'nums1' : 'nums2') : 'stop';
  return {
    checkpointId: snapshot.checkpointId,
    prompt: chooseFirst?.kind === 'boolean' ? '先预测，再揭示：第一次比较后，应该从哪个数组取数写入 nums1[write]？' : '先预测，再揭示：nums2 没有有效元素时，循环应如何处理？',
    answer: { kind: 'choice', optionId: answer },
    options: answer === 'stop'
      ? [{ id: 'stop', label: '不进入循环，原数组已是答案' }, { id: 'overwrite', label: '把 nums1 全部重写为零' }]
      : [{ id: 'nums1', label: '取 nums1[i]' }, { id: 'nums2', label: '取 nums2[j]' }],
    explanation: snapshot.explanation,
  };
}
