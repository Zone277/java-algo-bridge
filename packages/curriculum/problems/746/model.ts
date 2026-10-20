import {
  MinCostStairsInputSchema, expectedOutput,
  type MinCostStairsInput, type ReferencePrediction, type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

export async function buildReferenceTrace(raw: MinCostStairsInput, inputId: string): Promise<ReferenceTrace> {
  const input = MinCostStairsInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.cost.length > 30) throw new Error('参考状态演示最多 30 个台阶；真实判题支持 1000 个');
  const cost = [...input.cost];
  // This teaching ledger is not an array allocated by the reference Java.
  const arrival: (number | null)[] = Array.from({ length: cost.length + 1 }, (_, k) => k < 2 ? 0 : null);
  const snapshots: Snapshot[] = [];
  let twoBack: number | undefined;
  let oneBack: number | undefined;
  let i: number | undefined;
  let fromOne: number | undefined;
  let fromTwo: number | undefined;
  let next: number | undefined;
  let condition: boolean | undefined;
  let known = 1;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'cost', value: { kind: 'reference', objectId: 'cost' } },
      { name: 'D(0)（教学基例）', value: { kind: 'int', value: 0 } },
      { name: 'D(1)（教学基例）', value: { kind: 'int', value: 0 } },
      { name: '顶楼位置 n（教学标记）', value: { kind: 'int', value: cost.length } },
    ];
    for (const [name, value] of [['twoBack', twoBack], ['oneBack', oneBack], ['i', i], ['fromOne', fromOne], ['fromTwo', fromTwo], ['next', next]] as const) {
      if (value !== undefined) variables.push({ name, value: { kind: 'int', value } });
    }
    if (condition !== undefined) variables.push({ name: 'i <= cost.length', value: { kind: 'boolean', value: condition } });
    return {
      variables,
      structures: [
        { kind: 'array', id: 'cost', values: [...cost], indices: i !== undefined && i <= cost.length
          ? [{ name: 'i-2', index: i - 2 }, { name: 'i-1', index: i - 1 }] : [] },
        { kind: 'dp', id: 'D(k+2)：状态 k 是到达位置 k+2 的最小费用（教学表）', values: arrival.slice(2), activeIndex: known < 2 ? null : known - 2 },
      ],
      explanation,
    };
  };
  const initialState: State = {
    snapshotId: 'initial',
    ...state('到达位置 0 或 1 可以作为起点，费用均为 0；离开台阶才支付 cost。顶楼是 n，没有 cost[n]。两个基例单列，教学表状态 k 对应 D(k+2)，并非 Java 实际分配的数组。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考快照超限，拒绝生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation), ...(checkpointId ? { checkpointId } : {}),
    });
  };
  twoBack = 0;
  append('init-two-back', 'twoBack=D(0)=0，选择从台阶 0 开始不需支付到达费用。');
  oneBack = 0;
  append('init-one-back', 'oneBack=D(1)=0，也允许直接从台阶 1 开始；这不意味着离开它免费。');
  for (let destination = 2; destination <= cost.length + 1; destination++) {
    i = destination;
    fromOne = undefined; fromTwo = undefined; next = undefined;
    condition = i <= cost.length;
    append('check-destination', condition
      ? `准备计算到达位置 ${i} 的最小费用。twoBack=D(${i - 2})=${twoBack}，oneBack=D(${i - 1})=${oneBack}。${i === cost.length ? '本轮目的地就是顶楼。' : ''}`
      : `i=${i} 已超过顶楼 n=${cost.length}，循环结束；不会访问 cost[n]。`);
    if (!condition) break;
    fromOne = oneBack + cost[i - 1]!;
    append('compute-from-one', `最后走一步：到达 ${i - 1} 的最小费用 ${oneBack}，加上离开该台阶的 cost[${i - 1}]=${cost[i - 1]}，得到 ${fromOne}。`);
    fromTwo = twoBack + cost[i - 2]!;
    append('compute-from-two', `最后走两步：到达 ${i - 2} 的最小费用 ${twoBack}，加上 cost[${i - 2}]=${cost[i - 2]}，得到 ${fromTwo}。跨过的台阶不付款。`);
    next = Math.min(fromOne, fromTwo);
    arrival[i] = next;
    known = i;
    append('compute-next', `next=min(${fromOne},${fromTwo})=${next}=D(${i})。旧 twoBack 和 oneBack 仍未被覆盖。`, i === 2 ? 'first-arrival' : undefined);
    twoBack = oneBack;
    append('shift-two-back', `复制旧 oneBack 给 twoBack；此刻两者都等于 D(${i - 1})=${oneBack}，尚未完成滚动更新。`);
    oneBack = next;
    append('shift-one-back', `把 next 复制给 oneBack；现在 twoBack=D(${i - 1})，oneBack=D(${i})，下一轮所需状态已就位。`);
  }
  i = undefined; condition = undefined;
  append('return-cost', `返回 oneBack=D(${cost.length})=${oneBack}，这是到达顶楼的费用；顶楼自身没有费用项。`, 'final-cost');
  const finalOutput = { kind: 'int' as const, value: oneBack };
  if (JSON.stringify(expectedOutput('746', input)) !== JSON.stringify(finalOutput)) throw new Error('746 参考模型与可信期望不一致');
  return finalizeTrace({
    problemId: '746', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { cost }, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const first = snapshot.stepId === 'compute-next';
  const value = snapshot.variables.find(v => v.name === (first ? 'next' : 'oneBack'))?.value;
  if (value?.kind !== 'int') throw new Error('费用预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: first ? '先预测，再揭示：第一次算出的 next，也就是到达位置 2 的最小费用是多少？' : '先预测，再揭示：到达顶楼时最终返回的 oneBack 是多少？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
