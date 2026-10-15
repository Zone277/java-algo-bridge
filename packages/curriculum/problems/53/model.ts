import {
  MaximumSubarrayInputSchema,
  type MaximumSubarrayInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure state model for the preset Java solution; it never observes student code. */
export async function buildReferenceTrace(raw: MaximumSubarrayInput, inputId: string): Promise<ReferenceTrace> {
  const input = MaximumSubarrayInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题仍支持 10000 项');

  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let phase = '尚未开始';
  let i: number | undefined;
  let loopCondition: boolean | undefined;
  let value: number | undefined;
  let current: number | undefined;
  let best: number | undefined;
  // These boundaries are teaching markers, not extra variables in the Java method.
  let currentStart: number | undefined;
  let currentEnd: number | undefined;
  let bestStart: number | undefined;
  let bestEnd: number | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'length', value: { kind: 'int', value: nums.length } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (i !== undefined) {
      variables.push({ name: 'i', value: { kind: 'int', value: i } });
      if (i < nums.length) indices.push({ name: 'i（待处理）', index: i });
    }
    if (loopCondition !== undefined) variables.push({ name: 'i < length', value: { kind: 'boolean', value: loopCondition } });
    if (value !== undefined) variables.push({ name: 'value', value: { kind: 'int', value } });
    if (current !== undefined) variables.push({ name: 'current', value: { kind: 'int', value: current } });
    if (best !== undefined) variables.push({ name: 'best', value: { kind: 'int', value: best } });
    if (currentStart !== undefined && currentEnd !== undefined) {
      variables.push({ name: '当前段起点（演示标记）', value: { kind: 'int', value: currentStart } });
      indices.push({ name: '当前段起点', index: currentStart });
      indices.push({ name: '当前段终点', index: currentEnd });
    }
    if (bestStart !== undefined && bestEnd !== undefined) {
      variables.push({ name: '最佳段起点（演示标记）', value: { kind: 'int', value: bestStart } });
      indices.push({ name: '最佳段起点', index: bestStart });
      indices.push({ name: '最佳段终点', index: bestEnd });
    }
    return {
      variables,
      structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 nums 数组对象的引用值；尚未扫描任何元素。必须选择非空连续子数组。'),
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

  phase = '选择第 0 项作为首个非空连续段';
  current = nums[0]!;
  currentStart = 0;
  currentEnd = 0;
  append('init-current', `current=${current}：只看 nums[0]，唯一以第 0 项结尾的非空连续段就是它自己。`, 'initial-current');
  best = nums[0]!;
  bestStart = 0;
  bestEnd = 0;
  append('init-best', `best=${best}；不能初始化为 0，否则全负数输入会被错误地当成可以选空数组。`);

  phase = '逐项维护以当前位置结尾的最大和';
  for (i = 1; ; i++) {
    value = undefined;
    loopCondition = i < nums.length;
    append('check-index', loopCondition
      ? `i=${i} 在数组范围内；此时 current 是以第 ${i - 1} 项结尾的最大和，best 是前 ${i} 项中某个非空连续段的最大和。`
      : `i=${i} 已到数组末尾；所有非空连续段的末尾位置都已考虑。`);
    if (!loopCondition) break;

    value = nums[i]!;
    append('read-value', `读取 nums[${i}]=${value}；可以从这一项重新开始，也可以接在之前以第 ${i - 1} 项结尾的最优段后面。`);

    const extended = current + value;
    const restarted = value > extended;
    current = Math.max(value, extended);
    if (restarted) currentStart = i;
    currentEnd = i;
    append('update-current', restarted
      ? `重新从第 ${i} 项开始：${value} > ${extended}，current=${current}。`
      : `延长此前连续段：${extended} >= ${value}，current=${current}，这一段必须以第 ${i} 项结尾。`);

    if (current > best) {
      best = current;
      bestStart = currentStart;
      bestEnd = i;
      append('update-best', `current=${current} 超过此前 best，更新 best=${best}。最佳段只是教学标记，参考 Java 只保存和。`);
    } else {
      append('update-best', `current=${current} 没超过已有 best=${best}，历史最大和保留。`);
    }
  }

  phase = '完成';
  loopCondition = undefined;
  value = undefined;
  append('return-best', `返回 best=${best}；它来自至少一个元素的连续子数组。`, 'final-result');

  return finalizeTrace({
    problemId: '53',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input: { nums: [...nums] },
    initialState,
    snapshots,
    finalOutput: { kind: 'int', value: best },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'init-current' ? 'current' : 'best';
  const answer = snapshot.variables.find(variable => variable.name === name)?.value;
  if (answer?.kind !== 'int') throw new Error(`预测检查点缺少 ${name} 的 int 状态`);
  return {
    checkpointId: snapshot.checkpointId,
    prompt: snapshot.stepId === 'init-current'
      ? '先预测，再揭示：选择第 0 项后，current 应是多少？'
      : '先预测，再揭示：扫描结束后，最大非空连续子数组和 best 是多少？',
    answer: { kind: 'int', value: answer.value },
    explanation: snapshot.explanation,
  };
}
