import {
  MaxProfitInputSchema,
  expectedOutput,
  type MaxProfitInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure model of the preset one-pass solution. It never reads or executes student Java. */
export async function buildReferenceTrace(raw: MaxProfitInput, inputId: string): Promise<ReferenceTrace> {
  const input = MaxProfitInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.prices.length > 30) throw new Error('参考演示最多显示 30 天；真实判题仍支持 10000 天');

  const prices = [...input.prices];
  const snapshots: Snapshot[] = [];
  let phase = '尚未开始';
  let day: number | undefined;
  let loopCondition: boolean | undefined;
  let minPrice: number | undefined;
  let minDay: number | undefined;
  let best: number | undefined;
  let today: number | undefined;
  let profit: number | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'prices', value: { kind: 'reference', objectId: 'prices' } },
      { name: 'length', value: { kind: 'int', value: prices.length } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (day !== undefined) {
      variables.push({ name: 'day', value: { kind: 'int', value: day } });
      indices.push({ name: 'day（候选卖出日）', index: day });
    }
    if (loopCondition !== undefined) variables.push({ name: 'day < length', value: { kind: 'boolean', value: loopCondition } });
    if (minPrice !== undefined) variables.push({ name: 'minPrice', value: { kind: 'int', value: minPrice } });
    if (minDay !== undefined) {
      variables.push({ name: '最低价日（演示标记）', value: { kind: 'int', value: minDay } });
      indices.push({ name: 'minPrice 来源', index: minDay });
    }
    if (best !== undefined) variables.push({ name: 'best', value: { kind: 'int', value: best } });
    if (today !== undefined) variables.push({ name: 'today', value: { kind: 'int', value: today } });
    if (profit !== undefined) variables.push({ name: 'profit', value: { kind: 'int', value: profit } });
    return {
      variables,
      structures: [{ kind: 'array', id: 'prices', values: [...prices], indices }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 prices 数组对象的引用值；尚未选择买入价，也未考察卖出日。'),
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

  phase = '初始化第 0 天的买入候选';
  minPrice = prices[0]!;
  minDay = 0;
  append('init-min', `minPrice=${minPrice}，来源是第 0 天。它只能供后面的卖出日使用。`, 'initial-minimum');

  best = 0;
  append('init-best', 'best=0：如果所有后续价格都更低，就选择不交易，利润保持为 0。');

  phase = '从第 1 天枚举卖出日';
  for (day = 1; ; day++) {
    today = undefined;
    profit = undefined;
    loopCondition = day < prices.length;
    append(
      'check-day',
      loopCondition
        ? `day=${day} 在数组内；此时 minPrice 只来自第 0 天到第 ${day - 1} 天，所以买入严格早于今天卖出。`
        : `day=${day} 已到 length，所有可作为卖出日的日期都已检查。`,
    );
    if (!loopCondition) break;

    today = prices[day]!;
    append('read-today', `读取第 ${day} 天价格 today=${today}，把今天当作候选卖出日。`);

    profit = today - minPrice;
    append('compute-profit', `若在此前最低价 ${minPrice} 买入、今天以 ${today} 卖出，候选利润 profit=${profit}。`);

    const oldBest = best;
    best = Math.max(best, profit);
    append(
      'update-best',
      best === oldBest
        ? `候选利润 ${profit} 没有超过已有 best=${oldBest}，best 保持不变。`
        : `候选利润 ${profit} 超过旧 best=${oldBest}，best 更新为 ${best}。`,
    );

    const oldMinimum = minPrice;
    if (today < minPrice) {
      minPrice = today;
      minDay = day;
    }
    append(
      'update-min',
      minPrice < oldMinimum
        ? `今天价格 ${today} 更低，minPrice 更新为 ${minPrice}。它从下一天起才作为买入候选。`
        : `今天价格 ${today} 不低于已有 minPrice=${minPrice}，最低买入候选不变。`,
    );
  }

  phase = '完成';
  loopCondition = undefined;
  today = undefined;
  profit = undefined;
  append(
    'return-best',
    best === 0
      ? '没有出现先低价买入、后高价卖出的正利润，返回 0，表示不交易。'
      : `best=${best} 是所有合法先买后卖组合中的最大利润，返回它。`,
    'final-result',
  );

  return finalizeTrace({
    problemId: '121',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input: { prices: [...prices] },
    initialState,
    snapshots,
    finalOutput: expectedOutput('121', { prices: [...prices] }),
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'init-min') {
    const minimum = snapshot.variables.find(variable => variable.name === 'minPrice')?.value;
    if (minimum?.kind !== 'int') throw new Error('最低价预测缺少 int 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：扫描卖出日之前，minPrice 应初始化为多少？',
      answer: { kind: 'int', value: minimum.value },
      explanation: snapshot.explanation,
    };
  }
  const result = snapshot.variables.find(variable => variable.name === 'best')?.value;
  if (result?.kind !== 'int') throw new Error('终态预测缺少 int 状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：检查完所有卖出日后，maxProfit 最终返回多少？',
    answer: { kind: 'int', value: result.value },
    explanation: snapshot.explanation,
  };
}
