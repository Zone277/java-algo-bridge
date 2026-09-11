import {
  ClimbStairsInputSchema,
  expectedOutput,
  type ClimbStairsInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure model of the preset rolling-DP reference solution; it never reads student Java. */
export async function buildReferenceTrace(raw: ClimbStairsInput, inputId: string): Promise<ReferenceTrace> {
  const input = ClimbStairsInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.n > 30) throw new Error('参考演示最多展开 30 级的递推表；真实判题仍支持 n 到 45');

  // This table is a teaching ledger for the recurrence. The Java source itself uses rolling variables.
  const ways: (number | null)[] = Array(input.n + 1).fill(null) as null[];
  const snapshots: Snapshot[] = [];
  let phase = '尚未开始';
  let activeStep: number | null = null;
  let step: number | undefined;
  const baseCase = input.n === 1;
  let baseChecked = false;
  let loopCondition: boolean | undefined;
  let previous: number | undefined;
  let current: number | undefined;
  let next: number | undefined;
  let result: number | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'n', value: { kind: 'int', value: input.n } },
      { name: '阶段', value: { kind: 'string', value: phase } },
      { name: 'ways（教学递推表）', value: { kind: 'reference', objectId: 'ways-definition' } },
    ];
    if (baseChecked) variables.push({ name: 'n == 1', value: { kind: 'boolean', value: baseCase } });
    if (step !== undefined) variables.push({ name: 'step', value: { kind: 'int', value: step } });
    if (loopCondition !== undefined) variables.push({ name: 'step <= n', value: { kind: 'boolean', value: loopCondition } });
    if (previous !== undefined) variables.push({ name: 'previous', value: { kind: 'int', value: previous } });
    if (current !== undefined) variables.push({ name: 'current', value: { kind: 'int', value: current } });
    if (next !== undefined) variables.push({ name: 'next', value: { kind: 'int', value: next } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return {
      variables,
      structures: [{ kind: 'dp', id: 'ways-definition', values: [...ways], activeIndex: activeStep }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 int 基本值 n；ways 表是用于解释递推定义的教学视图，不是参考 Java 实际创建的数组。'),
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

  phase = '处理基例';
  baseChecked = true;
  append(
    'check-base',
    baseCase ? 'n=1 命中基例：只能走一次 1 级。' : `n=${input.n} 不是 1，继续建立滚动状态。`,
    'base-decision',
  );
  if (baseCase) {
    ways[1] = 1;
    activeStep = 1;
    result = 1;
    phase = '结束：基例';
    append('return-base', 'ways[1]=1；参考 Java 直接 return 1，避免访问不存在的第 2 级状态。', 'final-result');
    return finish(input, inputId, initialState, snapshots);
  }

  phase = '初始化滚动状态';
  previous = 1;
  ways[1] = 1;
  activeStep = 1;
  append('init-previous', 'previous=1 对应 ways[1]：到第 1 级只有一种走法。');
  current = 2;
  ways[2] = 2;
  activeStep = 2;
  append('init-current', 'current=2 对应 ways[2]：可以 1+1，也可以一次走 2 级。');

  phase = '递推并滚动';
  for (step = 3; ; step++) {
    next = undefined;
    loopCondition = step <= input.n;
    append(
      'check-loop',
      loopCondition ? `step=${step} 仍不超过 n，要计算 ways[${step}]。` : `step=${step} 已超过 n=${input.n}，递推完成。`,
    );
    if (!loopCondition) break;

    next = previous + current;
    ways[step] = next;
    activeStep = step;
    append('compute-next', `next=${previous}+${current}=${next}，即 ways[${step}]=ways[${step - 2}]+ways[${step - 1}]。此时 previous/current 仍是更新前的旧值。`);

    previous = current;
    append('move-previous', `previous 先变为旧 current=${previous}；current 此刻尚未被 next 覆盖，因此 next 已安全保存。`);

    current = next;
    append('move-current', `current 再变为 next=${current}。更新后 previous=ways[${step - 1}]，current=ways[${step}]。`);
  }

  loopCondition = undefined;
  next = undefined;
  result = current;
  activeStep = input.n;
  phase = '结束：返回第 n 级方案数';
  append('return-current', `current 就是 ways[${input.n}]=${current}，返回这个 int 值。`, 'final-result');
  return finish(input, inputId, initialState, snapshots);
}

function finish(
  input: ClimbStairsInput,
  inputId: string,
  initialState: State,
  snapshots: Snapshot[],
): Promise<ReferenceTrace> {
  return finalizeTrace({
    problemId: '70',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input,
    initialState,
    snapshots,
    finalOutput: expectedOutput('70', input),
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-base') {
    const base = snapshot.variables.find(variable => variable.name === 'n == 1')?.value;
    if (base?.kind !== 'boolean') throw new Error('基例预测缺少 boolean 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：这个 n 会直接返回基例，还是继续初始化滚动变量？',
      answer: { kind: 'choice', optionId: base.value ? 'return-base' : 'continue' },
      options: [
        { id: 'return-base', label: '直接返回 1' },
        { id: 'continue', label: '继续初始化 previous/current' },
      ],
      explanation: snapshot.explanation,
    };
  }
  const result = snapshot.variables.find(variable => variable.name === '返回值')?.value;
  if (result?.kind !== 'int') throw new Error('终态预测缺少 int 返回值');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：这个输入的 climbStairs 最终返回多少？',
    answer: { kind: 'int', value: result.value },
    explanation: snapshot.explanation,
  };
}
