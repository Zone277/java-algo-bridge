import { BinarySearchInputSchema, ReferenceTraceSchema, type BinarySearchInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Preset reference algorithm only. Never accepts or interprets student Java. */
export async function buildReferenceTrace(rawInput: BinarySearchInput, inputId: string): Promise<ReferenceTrace & { readonly finalOutput: { readonly kind: 'int'; readonly value: number } }> {
  const input = BinarySearchInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const [inputHash, referenceSourceHash] = await Promise.all([
    sha256(JSON.stringify({ nums: input.nums, target: input.target })), sha256(REFERENCE_SOURCE),
  ]);
  let left: number | undefined;
  let right: number | undefined;
  let mid: number | undefined;
  let comparison: boolean | undefined;
  let result: number | undefined;
  const snapshots: Snapshot[] = [];
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
    ];
    const indices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right], ['mid', mid]] as const) {
      if (value !== undefined) { variables.push({ name, value: { kind: 'int', value } }); indices.push({ name, index: value }); }
    }
    if (comparison !== undefined) variables.push({ name: '条件结果', value: { kind: 'boolean', value: comparison } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...input.nums], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到数组与 target；尚未执行局部变量初始化。') };
  const append = (stepId: string, explanation: string, checkpoint?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    const range = REFERENCE_STEP_MAP.find(item => item.stepId === stepId);
    if (!range) throw new Error(`参考代码缺少步骤映射：${stepId}`);
    const snapshotId = `${stepId}-${snapshots.length}`;
    snapshots.push({ snapshotId, stepId, codeRange: { startLine: range.startLine, endLine: range.endLine }, ...state(explanation),
      ...(checkpoint ? { checkpointId: `${ALGORITHM_VERSION}:${inputHash}:${snapshotId}:${checkpoint}` } : {}),
    });
  };
  left = 0; append('init-left', 'left = 0，左边界从首个下标开始。');
  right = input.nums.length - 1; append('init-right', `right = length - 1 = ${right}，闭区间包含两端。`);
  let firstMid = true;
  let firstBoundary = true;
  while (true) {
    mid = undefined; comparison = left <= right;
    append('check-loop', comparison ? `[${left}, ${right}] 非空，继续查找。` : `left=${left} > right=${right}，候选区间为空。`);
    if (!comparison) break;
    comparison = undefined;
    mid = left + Math.floor((right - left) / 2);
    append('compute-mid', `mid = ${left} + (${right} - ${left}) / 2 的整数部分 = ${mid}。`, firstMid ? 'first-mid' : undefined);
    firstMid = false;
    comparison = input.nums[mid] === input.target;
    append('check-equal', `nums[${mid}] = ${input.nums[mid]}，与 target ${input.target} ${comparison ? '相等' : '不相等'}。`);
    if (comparison) {
      result = mid;
      append('found', `返回下标 ${result}（不是元素值 ${input.nums[mid]}）。`, firstBoundary ? 'first-boundary' : undefined);
      break;
    }
    comparison = input.nums[mid]! < input.target;
    append('check-less', `nums[mid] < target 为 ${comparison}；严格升序使一侧可被排除。`);
    if (comparison) {
      left = mid + 1;
      append('move-left', `目标若存在，必在右侧；left = mid + 1 = ${left}。旧 mid 已排除。`, firstBoundary ? 'first-boundary' : undefined);
    } else {
      right = mid - 1;
      append('move-right', `目标若存在，必在左侧；right = mid - 1 = ${right}。旧 mid 已排除。`, firstBoundary ? 'first-boundary' : undefined);
    }
    firstBoundary = false;
  }
  if (result === undefined) { result = -1; comparison = undefined; append('not-found', '区间为空且此前未命中，返回 -1。'); }
  const trace = { schemaVersion: 1 as const, mode: 'reference-model' as const, problemId: '704' as const, algorithmVersion: ALGORITHM_VERSION, referenceSourceHash, inputId, inputHash, initialState, snapshots, finalOutput: { kind: 'int' as const, value: result } };
  ReferenceTraceSchema.parse(trace);
  return freeze(trace);
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-mid' ? 'mid' : snapshot.stepId === 'move-left' ? 'left' : snapshot.stepId === 'move-right' ? 'right' : '返回值';
  const variable = snapshot.variables.find(v => v.name === name);
  if (variable?.value.kind !== 'int') throw new Error('预测检查点没有整数状态');
  return { checkpointId: snapshot.checkpointId, prompt: `先预测，再揭示：执行下一步后，${name} 是多少？`, answer: variable.value.value, explanation: snapshot.explanation };
}
