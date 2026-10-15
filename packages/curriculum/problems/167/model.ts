import { TwoSumSortedInputSchema, type ReferencePrediction, type ReferenceTrace, type TwoSumSortedInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure state model of the preset Java solution; it never interprets student source. */
export async function buildReferenceTrace(raw: TwoSumSortedInput, inputId: string): Promise<ReferenceTrace> {
  const input = TwoSumSortedInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.numbers.length > 30) throw new Error('参考演示最多显示 30 个数组项；真实判题仍支持 10000 项');
  const numbers = [...input.numbers];
  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let sum: number | undefined;
  let loopCondition: boolean | undefined;
  let equal: boolean | undefined;
  let less: boolean | undefined;
  let result: [number, number] | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'numbers', value: { kind: 'reference', objectId: 'numbers' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (left !== undefined) { variables.push({ name: 'left', value: { kind: 'int', value: left } }); indices.push({ name: 'left', index: left }); }
    if (right !== undefined) { variables.push({ name: 'right', value: { kind: 'int', value: right } }); indices.push({ name: 'right', index: right }); }
    if (sum !== undefined) variables.push({ name: 'sum', value: { kind: 'int', value: sum } });
    if (loopCondition !== undefined) variables.push({ name: 'left < right', value: { kind: 'boolean', value: loopCondition } });
    if (equal !== undefined) variables.push({ name: 'sum == target', value: { kind: 'boolean', value: equal } });
    if (less !== undefined) variables.push({ name: 'sum < target', value: { kind: 'boolean', value: less } });
    if (result) variables.push(
      { name: '返回值', value: { kind: 'reference', objectId: 'result' } },
      { name: '第一个 1 起始下标', value: { kind: 'int', value: result[0] } },
      { name: '第二个 1 起始下标', value: { kind: 'int', value: result[1] } },
    );
    return {
      variables,
      structures: [
        { kind: 'array', id: 'numbers', values: [...numbers], indices },
        ...(result ? [{ kind: 'array' as const, id: 'result', values: [...result], indices: [] }] : []),
      ],
      explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到有序数组引用值与 target；尚未初始化指针，也尚未创建结果数组。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  left = 0;
  append('init-left', 'left=0，指向数组第一个元素。Java 数组下标从 0 开始。');
  right = numbers.length - 1;
  append('init-right', `right=${right}，指向最后一个元素；尚未排除任何可能组成答案的下标。`);
  let firstSum = true;
  let firstMove = true;
  while (true) {
    sum = undefined; equal = undefined; less = undefined;
    loopCondition = left < right;
    append('check-loop', loopCondition ? `left=${left}<right=${right}，两个指针指向不同下标，可以比较。` : '左右指针已相遇；有效输入保证此前已经找到唯一答案。');
    if (!loopCondition) break;
    loopCondition = undefined;
    sum = numbers[left]! + numbers[right]!;
    append('compute-sum', `numbers[${left}]=${numbers[left]} 与 numbers[${right}]=${numbers[right]}，和为 ${sum}。`, firstSum ? 'first-sum' : undefined);
    firstSum = false;
    equal = sum === input.target;
    append('check-equal', equal ? `sum=${sum} 等于 target；两个下标不同。` : `sum=${sum} 不等于 target=${input.target}，继续决定移动哪一端。`);
    if (equal) {
      result = [left + 1, right + 1];
      append('return-pair', `Java 内部下标是 ${left}、${right}；题目要求返回 1 起始下标 [${result[0]},${result[1]}]。`, firstMove ? 'first-return-index' : undefined);
      break;
    }
    less = sum < input.target;
    append('check-less', less ? `sum=${sum} 偏小；固定 left，选任何更靠左的 right 只会更小。` : `sum=${sum} 偏大；固定 right，选任何更靠右的 left 只会更大。`);
    if (less) {
      left++;
      append('move-left', `left 移到 ${left}；原左端不可能与当前范围内任何右端组成 target。`, firstMove ? 'first-move' : undefined);
    } else {
      right--;
      append('move-right', `right 移到 ${right}；原右端不可能与当前范围内任何左端组成 target。`, firstMove ? 'first-move' : undefined);
    }
    firstMove = false;
  }
  if (!result) {
    append('no-pair', '本站有效输入保证恰有一个不同下标的解；走到这里表示契约或模型有误。');
    throw new Error('TwoSumSortedInput contract promised one pair');
  }
  return finalizeTrace({ problemId: '167', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int-array', values: [...result] } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'compute-sum' ? 'sum' : snapshot.stepId === 'move-left' ? 'left' : snapshot.stepId === 'move-right' ? 'right' : snapshot.stepId === 'return-pair' ? '第一个 1 起始下标' : null;
  if (!name) throw new Error('未知的 167 预测检查点');
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`预测检查点缺少 ${name} 整数状态`);
  return { checkpointId: snapshot.checkpointId, prompt: `先预测，再揭示：执行这一步后 ${name} 是多少？`, answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
