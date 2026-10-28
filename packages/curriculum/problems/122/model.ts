import { StockProfitIIInputSchema, expectedOutput, type StockProfitIIInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure trace of the published greedy reference; never executes or inspects student Java. */
export async function buildReferenceTrace(raw: StockProfitIIInput, inputId: string): Promise<ReferenceTrace> {
  const input = StockProfitIIInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.prices.length > 30) throw new Error('参考演示最多显示 30 天；真实 Java 判题仍接受本站 10000 天上限');

  const prices = [...input.prices];
  const snapshots: Snapshot[] = [];
  let phase = '尚未开始';
  let day: number | undefined;
  let loopCondition: boolean | undefined;
  let profit: number | undefined;
  let gain: number | undefined;
  let positive: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'prices', value: { kind: 'reference', objectId: 'prices' } },
      { name: 'prices.length（表达式）', value: { kind: 'int', value: prices.length } },
      { name: '阶段（教学标记）', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (profit !== undefined) variables.push({ name: 'profit', value: { kind: 'int', value: profit } });
    if (day !== undefined) {
      variables.push({ name: 'day', value: { kind: 'int', value: day } });
      indices.push({ name: 'day（今日）', index: day });
      if (day < prices.length) indices.push({ name: 'day - 1（昨日）', index: day - 1 });
    }
    if (loopCondition !== undefined) variables.push({ name: 'day < prices.length（表达式）', value: { kind: 'boolean', value: loopCondition } });
    if (gain !== undefined) variables.push({ name: 'gain', value: { kind: 'int', value: gain } });
    if (positive !== undefined) variables.push({ name: 'gain > 0（表达式）', value: { kind: 'boolean', value: positive } });
    return { variables, structures: [{ kind: 'array', id: 'prices', values: [...prices], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到价格数组的引用值；局部 profit 尚未初始化。Java 的 int 是基本值，prices 是数组引用值。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  phase = '初始化总收益';
  profit = 0;
  append('init-profit', 'profit=0；选择不交易时收益为 0。每次取相邻正增量，等价于在上涨段低点买入、高点卖出。', 'initial-profit');

  phase = '逐日检查相邻价格';
  let firstGainPredicted = false;
  for (day = 1; ; day++) {
    gain = undefined;
    positive = undefined;
    loopCondition = day < prices.length;
    append('check-day', loopCondition
      ? `day=${day} 在范围内；此前 profit 已等于第 1 天至第 ${day - 1} 天所有相邻正增量之和。`
      : `day=${day} 已达到 length；所有相邻价格对均已检查，未访问越界位置。`);
    if (!loopCondition) break;

    loopCondition = undefined;
    gain = prices[day]! - prices[day - 1]!;
    append('compute-gain', `今天 ${prices[day]} 减去昨天 ${prices[day - 1]}，得 gain=${gain}。此行只计算差值，不改变 profit。`, !firstGainPredicted ? 'first-gain' : undefined);
    firstGainPredicted = true;

    positive = gain > 0;
    append('check-positive', positive
      ? `gain=${gain}>0；这一段上涨可以转化为合法收益，进入 if。`
      : `gain=${gain} 不大于 0；下跌或持平不必交易，跳过 if，profit 保持 ${profit}。`);
    if (positive) {
      profit += gain;
      append('add-gain', `把正增长 ${gain} 加入总收益；profit=${profit} 现在覆盖到第 ${day} 天。`);
    }
  }

  phase = '返回总收益';
  day = undefined; loopCondition = undefined; gain = undefined; positive = undefined;
  append('return-profit', `返回 profit=${profit}。每段可获利的上涨都已计入，总收益非负；没有借未来日期买入过去的股票。`, 'final-profit');
  const finalOutput = { kind: 'int' as const, value: profit };
  const trusted = expectedOutput('122', input);
  if (trusted.kind !== 'int' || trusted.value !== profit) throw new Error('122 参考状态模型与独立 cash/hold 可信期望不一致');
  return finalizeTrace({ problemId: '122', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const isGain = snapshot.stepId === 'compute-gain';
  const name = isGain ? 'gain' : 'profit';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`122 预测缺少 ${name} 的整数状态`);
  const prompt = isGain
    ? '先预测，再揭示：第一对相邻日期的 gain（今天减昨天）是多少？负数也要写负号。'
    : snapshot.stepId === 'init-profit'
      ? '先预测，再揭示：没有任何交易前，profit 应初始化为多少？'
      : '先预测，再揭示：跳过持平和下跌后，最终总收益 profit 是多少？';
  return { checkpointId: snapshot.checkpointId, prompt, answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
