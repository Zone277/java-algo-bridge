import { NearbyDuplicateInputSchema, type NearbyDuplicateInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Models only the preset reference algorithm, never the student's Java source. */
export async function buildReferenceTrace(raw: NearbyDuplicateInput, inputId: string): Promise<ReferenceTrace> {
  const input = NearbyDuplicateInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 个数组项；真实判题仍接受最多 10000 项，不截断输入');
  const last = new Map<number, number>();
  const snapshots: Snapshot[] = [];
  let initialized = false;
  let i: number | undefined;
  let previous: number | undefined;
  let seen: boolean | undefined;
  let nearby: boolean | undefined;
  let result: boolean | undefined;
  let finalLookup = -1;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'k', value: { kind: 'int', value: input.k } },
    ];
    if (initialized) variables.push({ name: 'last', value: { kind: 'reference', objectId: 'last' } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } }, { name: 'nums[i]（表达式）', value: { kind: 'int', value: input.nums[i]! } });
    if (seen !== undefined) variables.push({ name: '本次查询已见（表达式）', value: { kind: 'boolean', value: seen } });
    if (previous !== undefined) variables.push({ name: 'previous', value: { kind: 'int', value: previous } });
    if (nearby !== undefined && i !== undefined && previous !== undefined) variables.push(
      { name: 'i - previous（表达式）', value: { kind: 'int', value: i - previous } },
      { name: '距离不超过 k（表达式）', value: { kind: 'boolean', value: nearby } },
    );
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });
    const structures: State['structures'][number][] = [{ kind: 'array', id: 'nums', values: [...input.nums], indices: i === undefined ? [] : [{ name: 'i', index: i }, ...(previous === undefined ? [] : [{ name: 'previous', index: previous }])] }];
    if (initialized) structures.push({ kind: 'map', id: 'last', entries: [...last].map(([key, value]) => ({ key: { kind: 'int', value: key }, value: { kind: 'int', value } })) });
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('参数 nums 接收数组引用值的副本，k 接收 int 基本值的副本；数组未修改，last 尚未创建。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  initialized = true;
  append('init-map', '创建空 HashMap。表中键和值展示 Integer 的数值内容，不描述装箱对象身份或 JVM 布局。');
  for (let index = 0; index < input.nums.length; index++) {
    i = index;
    previous = undefined; seen = undefined; nearby = undefined;
    append('loop-index', `进入 i=${i}；last 恰好保存 nums[0..${i}) 中每个值最近一次出现的下标，尚未存入当前位置。`);
    seen = last.has(input.nums[i]!);
    finalLookup = snapshots.length;
    append('check-seen', `查询 nums[${i}]=${input.nums[i]}：${seen ? '已在前缀中出现，接下来读取最近下标' : '尚未出现，不能组成不同位置的一对'}。查询本身不修改 last。`);
    if (seen) {
      previous = last.get(input.nums[i]!)!;
      append('read-previous', `读取最近旧下标 previous=${previous}。Java get 返回 Integer，再拆箱为 int；由于已检查 containsKey，这里不会拆箱 null。`);
      nearby = i - previous <= input.k;
      append('check-distance', `距离 ${i}-${previous}=${i - previous}，${nearby ? '不超过' : '超过'} k=${input.k}。previous<i 保证两个位置不同。`);
      if (nearby) {
        result = true;
        append('return-true', `下标 ${previous} 与 ${i} 的值同为 ${input.nums[i]}，距离不超过 k，立即返回 true；不再写入当前下标。`, 'final-result');
        break;
      }
    }
    // previous belongs to the Java if block and is no longer in scope here.
    previous = undefined; nearby = undefined; seen = undefined;
    last.set(input.nums[i]!, i);
    append('store-current', `写入 ${input.nums[i]} → ${i}。若已有旧位置则覆盖，即使刚才距离太远也必须更新；现在表恰好描述 nums[0..${i + 1})。`);
  }
  if (result === undefined) {
    i = undefined; previous = undefined; seen = undefined; nearby = undefined;
    result = false;
    append('return-false', '扫描结束，所有相等候选的最近距离都大于 k，返回 false。i 和 previous 已离开各自作用域；k=0 时不同位置不可能满足距离条件。', 'final-result');
  }
  // Choose a query that varies with input while preserving a second check even for one item.
  const lookup = snapshots[finalLookup]!;
  snapshots[finalLookup] = { ...lookup, checkpointId: 'last-membership' };
  return finalizeTrace({ problemId: '219', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: result } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const isQuery = snapshot.stepId === 'check-seen';
  const value = snapshot.variables.find(variable => variable.name === (isQuery ? '本次查询已见（表达式）' : '返回值'))?.value;
  if (value?.kind !== 'boolean') throw new Error('219 预测检查点缺少布尔状态');
  const current = snapshot.variables.find(variable => variable.name === 'nums[i]（表达式）')?.value;
  return {
    checkpointId: snapshot.checkpointId,
    prompt: isQuery ? `先预测，再揭示：查询当前值 ${current?.kind === 'int' ? current.value : ''} 时，last 已经有这个键吗？回答 true 或 false。` : '先预测，再揭示：是否找到相等且足够近的两个不同位置？返回 true 还是 false？',
    answer: { kind: 'text', value: String(value.value) }, explanation: snapshot.explanation,
  };
}
