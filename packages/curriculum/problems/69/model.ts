import { SqrtInputSchema, expectedOutput, type ReferencePrediction, type ReferenceTrace, type SqrtInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Only the preset reference Java algorithm is modeled; student Java runs through the separate Docker runner. */
export async function buildReferenceTrace(raw: SqrtInput, inputId: string): Promise<ReferenceTrace> {
  const input = SqrtInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const { x } = input;
  const snapshots: Snapshot[] = [];
  let smallCondition: boolean | undefined = undefined;
  let left: number | undefined;
  let right: number | undefined;
  let answer: number | undefined;
  let loopCondition: boolean | undefined;
  let mid: number | undefined;
  let quotient: number | undefined;
  let comparison: boolean | undefined;
  let result: number | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'x', value: { kind: 'int', value: x } }];
    if (smallCondition !== undefined) variables.push({ name: 'x < 2（条件表达式）', value: { kind: 'boolean', value: smallCondition } });
    for (const [name, value] of [['left', left], ['right', right], ['answer', answer], ['mid', mid]] as const) {
      if (value !== undefined) variables.push({ name, value: { kind: 'int', value } });
    }
    if (loopCondition !== undefined) variables.push({ name: 'left <= right（条件表达式）', value: { kind: 'boolean', value: loopCondition } });
    if (quotient !== undefined) variables.push({ name: 'x / mid（表达式）', value: { kind: 'int', value: quotient } });
    if (comparison !== undefined) variables.push({ name: 'mid <= x / mid（条件表达式）', value: { kind: 'boolean', value: comparison } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });

    // A compact teaching view of numerical bounds, not a Java Map or a materialized number array.
    const bounds = [['left', left], ['right', right], ['answer', answer], ['mid', mid]] as const;
    const entries = bounds.flatMap(([name, value]) => value === undefined ? [] : [{ key: { kind: 'string' as const, value: name }, value: { kind: 'int' as const, value } }]);
    const structures: State['structures'][number][] = entries.length ? [{ kind: 'map', id: 'numeric-interval', entries }] : [];
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 x 的 int 数值副本。尚未判断 x<2；left、right、answer、mid 都没有声明。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('第 69 题参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation), ...(checkpointId ? { checkpointId } : {}),
    });
  };

  smallCondition = x < 2;
  append('check-small', smallCondition ? `x=${x}<2 成立，直接返回参数值，避免让候选中点为 0。` : `x=${x} 不小于 2，继续建立二分区间。`, 'small-branch');
  if (smallCondition) {
    result = x;
    append('return-small', `直接返回 x=${x}；此路径没有创建搜索区间，也没有执行除法。`, 'final-root');
  } else {
    left = 1;
    append('init-left', 'left=1；候选中点始终大于 0，后续 x/mid 不会除以 0。');
    right = Math.floor(x / 2);
    append('init-right', `right=x/2=${right}。x≥2 时，向下取整的平方根不大于 x/2。`);
    answer = 1;
    append('init-answer', 'answer=1 已经可行，因为 x≥2。真答案要么在候选闭区间内，要么就是 answer。');
    let firstMid = true;
    while (true) {
      // The previous iteration's Java block-local mid is out of scope at the next while test.
      mid = undefined;
      quotient = undefined;
      comparison = undefined;
      loopCondition = left <= right;
      append('check-loop', loopCondition
        ? `候选闭区间 [${left},${right}] 仍非空，继续检查其中点。`
        : `left=${left}>right=${right}，候选区间已空；已确认值 answer=${answer} 就是最大可行整数。`);
      if (!loopCondition) break;

      loopCondition = undefined;
      mid = left + Math.floor((right - left) / 2);
      append('compute-mid', `mid=${left}+(${right}-${left})/2 的整数部分=${mid}；此时 1≤mid≤${Math.floor(x / 2)}。`, firstMid ? 'first-mid' : undefined);
      firstMid = false;

      quotient = Math.floor(x / mid);
      comparison = mid <= quotient;
      append('compare-square', `x/mid=${x}/${mid} 的整数商为 ${quotient}；mid≤x/mid 为 ${comparison}，等价于 mid²≤x。`);
      if (comparison) {
        answer = mid;
        append('record-answer', `mid=${mid} 已证实可行，记录 answer=${answer}；还要尝试更大的整数。`);
        left = mid + 1;
        append('move-left', `1 到 ${mid} 均可行，新的候选区间为 [${left},${right}]。本快照里的 mid 和 x/mid 仍是移动前本轮算出的值。`);
      } else {
        right = mid - 1;
        append('move-right', `${mid} 及更大整数均不可行，新的候选区间为 [${left},${right}]。本轮 mid 的比较结果保留供解释。`);
      }
    }
    result = answer;
    append('return-answer', `返回最大已确认可行整数 ${result}；此值满足 result²≤x，下一整数的平方超过 x。`, 'final-root');
  }

  const expected = expectedOutput('69', input);
  if (expected.kind !== 'int' || expected.value !== result) throw new Error('69 参考状态模型与独立可信期望不一致');
  return finalizeTrace({
    problemId: '69', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-small') {
    const condition = snapshot.variables.find(variable => variable.name === 'x < 2（条件表达式）')?.value;
    if (condition?.kind !== 'boolean') throw new Error('69 提前返回预测缺少条件结果');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前 x<2 成立、会直接返回吗？',
      answer: { kind: 'choice', optionId: condition.value ? 'return' : 'continue' },
      options: [{ id: 'return', label: '成立，直接返回 x' }, { id: 'continue', label: '不成立，继续二分' }],
      explanation: snapshot.explanation,
    };
  }
  const name = snapshot.stepId === 'compute-mid' ? 'mid' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`69 预测缺少 ${name} 整数状态`);
  return {
    checkpointId: snapshot.checkpointId,
    prompt: name === 'mid' ? '先预测，再揭示：第一次算出的 mid 是多少？' : '先预测，再揭示：这个输入最终返回哪个整数？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
