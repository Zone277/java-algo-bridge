import {
  HouseRobberInputSchema,
  expectedOutput,
  type HouseRobberInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset rolling-prefix model, separate from execution of student Java. */
export async function buildReferenceTrace(raw: HouseRobberInput, inputId: string): Promise<ReferenceTrace> {
  const input = HouseRobberInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 间房屋；真实判题仍支持 100 间');

  const nums = [...input.nums];
  // D(k) is a teaching ledger, not an array allocated by the reference Java.
  const prefixBest: (number | null)[] = Array.from({ length: nums.length + 1 }, (_, k) => k === 0 ? 0 : null);
  const snapshots: Snapshot[] = [];
  let i: number | undefined;
  let twoBack: number | undefined;
  let oneBack: number | undefined;
  let take: number | undefined;
  let skip: number | undefined;
  let next: number | undefined;
  let condition: boolean | undefined;
  let activePrefix = 0;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'D(0)（教学基例）', value: { kind: 'int', value: 0 } },
    ];
    if (twoBack !== undefined) variables.push({ name: 'twoBack', value: { kind: 'int', value: twoBack } });
    if (oneBack !== undefined) variables.push({ name: 'oneBack', value: { kind: 'int', value: oneBack } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (condition !== undefined) variables.push({ name: 'i < nums.length', value: { kind: 'boolean', value: condition } });
    if (take !== undefined) variables.push({ name: 'take', value: { kind: 'int', value: take } });
    if (skip !== undefined) variables.push({ name: 'skip', value: { kind: 'int', value: skip } });
    if (next !== undefined) variables.push({ name: 'next', value: { kind: 'int', value: next } });
    return {
      variables,
      structures: [
        { kind: 'array', id: 'nums', values: [...nums], indices: i !== undefined && i < nums.length ? [{ name: 'i', index: i }] : [] },
        { kind: 'dp', id: 'D(i+1)：状态 i 是前 i+1 间最优值（教学表）', values: prefixBest.slice(1), activeIndex: activePrefix === 0 ? null : activePrefix - 1 },
      ],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 nums 的引用值；数组元素不会被修改。D(k) 表示前 k 间的最优金额。D(0)=0 单独显示为教学基例；表中状态 i 对应 D(i+1)，与数组下标 i 对齐。DP 表是教学账本，不是参考 Java 创建的数组。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`, stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  twoBack = 0;
  append('init-two-back', 'twoBack=0。准备处理第一间时，它对应空前缀的最优值；约定 D(-1)=0 仅用于统一第一轮公式。');
  oneBack = 0;
  append('init-one-back', 'oneBack=D(0)=0；尚未处理任何房屋，金额为 0。');

  for (let position = 0; position <= nums.length; position++) {
    i = position;
    take = undefined;
    skip = undefined;
    next = undefined;
    condition = position < nums.length;
    activePrefix = position;
    append('check-index', condition
      ? `准备处理下标 i=${i}：oneBack=D(${i})=${oneBack}，twoBack=D(${Math.max(0, i - 1)})=${twoBack}；都还没有纳入当前房屋。`
      : `i=${i}，i < nums.length 为 false。所有房屋已处理，oneBack=D(${i})=${oneBack}。`);
    if (!condition) break;

    take = twoBack + nums[position]!;
    append('compute-take', `如果选下标 ${i} 的金额 ${nums[position]}，${i === 0 ? '左侧没有房屋，前缀金额是 0' : `必须跳过下标 ${i - 1}`}；take=旧 twoBack+nums[i]=${take}。这是候选方案，尚未决定最优值。`);
    skip = oneBack;
    append('compute-skip', `如果不选当前房屋，就沿用前 ${i} 间的最优值：skip=旧 oneBack=${skip}。`);
    next = Math.max(skip, take);
    prefixBest[position + 1] = next;
    activePrefix = position + 1;
    append('compute-next', `两类方案覆盖所有可能：next=max(skip=${skip}, take=${take})=${next}=D(${i + 1})。两个滚动变量此时仍是旧值。`,
      position === 0 ? 'first-prefix' : undefined);

    twoBack = oneBack;
    append('shift-two-back', `先把旧 oneBack=${oneBack} 复制给 twoBack。现在两个变量都等于 D(${i})；next 已保存 D(${i + 1})，不能在这一步提前解释为下一轮的完整状态。`);
    oneBack = next;
    append('shift-one-back', `再把 next=${next} 复制给 oneBack。现在 twoBack=D(${i})，oneBack=D(${i + 1})，下一轮需要的两个前缀值已就位。`);
  }

  i = undefined;
  condition = undefined;
  append('return-best', `返回 oneBack=D(${nums.length})=${oneBack}，即整排房屋中不选相邻项的最大金额。`, 'final-result');
  const finalOutput = { kind: 'int' as const, value: oneBack };
  const trusted = expectedOutput('198', input);
  if (trusted.kind !== 'int' || trusted.value !== finalOutput.value) throw new Error('参考模型与 198 前缀最优契约不一致');
  return finalizeTrace({
    problemId: '198', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { nums }, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const first = snapshot.stepId === 'compute-next';
  const value = snapshot.variables.find(variable => variable.name === (first ? 'next' : 'oneBack'))?.value;
  if (value?.kind !== 'int') throw new Error('前缀最优预测缺少 int 状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: first
      ? '先预测，再揭示：第一间的 take 与 skip 比较后，next（前 1 间的最优金额）是多少？'
      : '先预测，再揭示：处理完整排房屋后，返回的 oneBack 是多少？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
