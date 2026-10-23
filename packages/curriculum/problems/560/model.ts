import { SubarraySumInputSchema, type SubarraySumInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset online prefix-frequency model; never interprets student Java. */
export async function buildReferenceTrace(raw: SubarraySumInput, inputId: string): Promise<ReferenceTrace> {
  const input = SubarraySumInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 29) throw new Error('参考状态演示最多支持 29 项，以容纳初始零在内最多 30 个前缀键；真实判题仍支持 10000 项');
  const freq = new Map<number, number>();
  let mapCreated = false;
  let prefix: number | undefined;
  let count: number | undefined;
  let i: number | undefined;
  let needed: number | undefined;
  let matches: number | undefined;
  let condition: boolean | undefined;
  let result: number | undefined = undefined;
  let storedPrefixes = 0;
  let prefixLength = 0;
  let countedEnds = 0;
  const snapshots: Snapshot[] = [];
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'k', value: { kind: 'int', value: input.k } },
    ];
    if (mapCreated) variables.push(
      { name: 'freq', value: { kind: 'reference', objectId: 'freq' } },
      { name: '已收录前缀数（教学标记）', value: { kind: 'int', value: storedPrefixes } },
    );
    if (prefix !== undefined) variables.push(
      { name: 'prefix', value: { kind: 'int', value: prefix } },
      { name: 'prefix 对应前缀长度（教学标记）', value: { kind: 'int', value: prefixLength } },
    );
    if (count !== undefined) variables.push(
      { name: 'count', value: { kind: 'int', value: count } },
      { name: '已计数右端位置数（教学标记）', value: { kind: 'int', value: countedEnds } },
    );
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (needed !== undefined) variables.push({ name: 'needed', value: { kind: 'int', value: needed } });
    if (matches !== undefined) variables.push({ name: 'matches', value: { kind: 'int', value: matches } });
    if (condition !== undefined) variables.push({ name: 'i < nums.length（表达式）', value: { kind: 'boolean', value: condition } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    const structures: State['structures'][number][] = [
      { kind: 'array', id: 'nums', values: [...input.nums], indices: i === undefined ? [] : [{ name: 'i', index: i }] },
    ];
    if (mapCreated) structures.push({
      kind: 'map', id: 'freq', entries: [...freq].map(([key, value]) => ({ key: { kind: 'int', value: key }, value: { kind: 'int', value } })),
    });
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法刚收到 nums 的引用值与 k 的整数值；freq 尚未创建，prefix 与 count 尚未初始化。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };
  mapCreated = true;
  append('create-map', '创建空 HashMap；键表示前缀和，值表示此前有多少个前缀位置得到这个和。');
  freq.set(0, 1); storedPrefixes = 1;
  append('seed-empty-prefix', '写入 0→1，代表数组之前唯一的长度 0 前缀 P(0)。它不是计入答案的空子数组；此时 count 还未初始化。');
  prefix = 0;
  append('init-prefix', 'prefix=0，对应 P(0)。prefix 是 int 基本值，源码没有创建前缀数组。');
  count = 0;
  append('init-count', 'count=0：尚未统计任何非空子数组。');
  for (let current = 0; current <= input.nums.length; current++) {
    i = current; needed = undefined; matches = undefined;
    condition = i < input.nums.length;
    append('check-loop', condition ? `准备处理 i=${i}。prefix=P(${i})，freq 恰好收录 P(0)…P(${i})，count 已统计右端下标小于 ${i} 的子数组。` : `i=${i} 等于 nums.length，循环结束；这个边界不对应可读取的数组元素。`);
    condition = undefined;
    if (!conditionForIndex(i, input.nums.length)) break;
    prefix += input.nums[i]!; prefixLength = i + 1;
    append('add-prefix', `加上 nums[${i}]=${input.nums[i]} 后，prefix=P(${i + 1})=${prefix}。freq 仍只有更早的 P(0)…P(${i})。`);
    needed = prefix - input.k;
    append('compute-needed', `要使 P(${i + 1})-P(l)=k，需要 P(l)=prefix-k=${prefix}-${input.k}=${needed}，且 l≤${i}。`);
    matches = freq.get(needed) ?? 0;
    append('lookup-frequency', `更早前缀和 ${needed} 共出现 ${matches} 次，对应 ${matches} 个不同起点。这里只查次数，count 与 freq 均尚未改变。`, i === 0 ? 'first-matches' : undefined);
    count += matches; countedEnds = i + 1;
    append('add-count', `把 ${matches} 个以 ${i} 为右端的子数组加入 count，累计 ${count}。当前 P(${i + 1}) 尚未入表，因此没有把长度 0 区间计入。`);
    freq.set(prefix, (freq.get(prefix) ?? 0) + 1); storedPrefixes++;
    append('store-prefix', `现在才把 P(${i + 1})=${prefix} 的出现次数加 1，freq[${prefix}]=${freq.get(prefix)}。本次 matches=${matches} 保留的是写入前查到的次数；新前缀只供未来右端使用。`);
  }
  i = undefined; needed = undefined; matches = undefined;
  result = count;
  append('return-count', `已处理 ${input.nums.length} 个右端位置，返回 count=${count}。所有计入的区间连续且非空，每个由起点与右端唯一确定。`, 'final-count');
  return finalizeTrace({ problemId: '560', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: count } });
}

function conditionForIndex(index: number, length: number): boolean { return index < length; }

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const first = snapshot.stepId === 'lookup-frequency';
  const value = snapshot.variables.find(variable => variable.name === (first ? 'matches' : '返回值'))?.value;
  if (value?.kind !== 'int') throw new Error('子数组计数预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: first ? '先预测，再揭示：第一次查找 needed 时，此前频次 matches 是多少？' : '先预测，再揭示：全部处理后，和为 k 的非空连续子数组共有多少个？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
