import {
  ContainsDuplicateInputSchema,
  expectedOutput,
  type ContainsDuplicateInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure state model for the preset Java reference solution. It never interprets student source. */
export async function buildReferenceTrace(raw: ContainsDuplicateInput, inputId: string): Promise<ReferenceTrace> {
  const input = ContainsDuplicateInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 个数组项；真实判题仍接受契约规定的更长输入');

  const seen = new Set<number>();
  const snapshots: Snapshot[] = [];
  let setInitialized = false;
  let index: number | undefined;
  let current: number | undefined;
  let alreadySeen: boolean | undefined;
  let result: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
    ];
    if (setInitialized) variables.push({ name: 'seen', value: { kind: 'reference', objectId: 'seen' } });
    if (index !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: index } });
    if (current !== undefined) variables.push({ name: 'nums[i]', value: { kind: 'int', value: current } });
    if (alreadySeen !== undefined) variables.push({ name: '当前值已在 seen', value: { kind: 'boolean', value: alreadySeen } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const structures: State['structures'][number][] = [
      {
        kind: 'array',
        id: 'nums',
        values: [...input.nums],
        indices: index === undefined ? [] : [{ name: 'i', index }],
      },
    ];
    if (setInitialized) {
      structures.push({
        kind: 'map',
        id: 'seen',
        entries: [...seen].map(value => ({
          key: { kind: 'int', value },
          value: { kind: 'boolean', value: true },
        })),
      });
    }
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 nums 的引用值；此时参考代码还没有创建 seen 集合。'),
  };

  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  setInitialized = true;
  append('init-set', '创建空 HashSet。检查下标 0 前，seen 尚不包含任何数组值。');

  for (let i = 0; i < input.nums.length; i++) {
    index = i;
    current = input.nums[i]!;
    alreadySeen = undefined;
    result = undefined;
    append('loop-index', `进入 i=${i}；此刻 seen 只包含下标小于 ${i} 的不同值。`);

    alreadySeen = seen.has(current);
    append(
      'check-seen',
      alreadySeen
        ? `查询 ${current}：seen 已包含这个值，较早位置与下标 ${i} 构成重复。`
        : `查询 ${current}：seen 尚未包含这个值，当前还不能断定存在重复。`,
      i === 0 ? 'first-membership' : undefined,
    );

    if (alreadySeen) {
      result = true;
      append('return-true', `发现重复值 ${current}，立即返回 true；当前值不需要再次加入集合。`, 'final-result');
      break;
    }

    seen.add(current);
    append('add-current', `把 ${current} 加入 seen。现在集合恰好表示下标 0 到 ${i} 已扫描过的不同值。`);
  }

  if (result === undefined) {
    index = undefined;
    current = undefined;
    alreadySeen = undefined;
    result = false;
    append('return-false', '所有元素都已检查，始终没有在加入前命中 seen，因此返回 false。', 'final-result');
  }

  const finalOutput = expectedOutput('217', input);
  if (finalOutput.kind !== 'boolean' || finalOutput.value !== result) {
    throw new Error('参考状态模型与 217 可信期望输出不一致');
  }
  return finalizeTrace({
    problemId: '217',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input,
    initialState,
    snapshots,
    finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;

  if (snapshot.stepId === 'check-seen') {
    const membership = snapshot.variables.find(variable => variable.name === '当前值已在 seen')?.value;
    const current = snapshot.variables.find(variable => variable.name === 'nums[i]')?.value;
    if (membership?.kind !== 'boolean' || current?.kind !== 'int') throw new Error('成员预测检查点缺少状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: `先预测，再揭示：检查当前值 ${current.value} 时，seen 已经包含它吗？`,
      answer: { kind: 'choice', optionId: membership.value ? 'present' : 'absent' },
      options: [{ id: 'present', label: '已经包含' }, { id: 'absent', label: '尚未包含' }],
      explanation: snapshot.explanation,
    };
  }

  const returned = snapshot.variables.find(variable => variable.name === '返回值')?.value;
  if (returned?.kind !== 'boolean') throw new Error('结果预测检查点缺少布尔返回值');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：参考算法在这个结束点返回 true 还是 false？',
    answer: { kind: 'choice', optionId: returned.value ? 'duplicate' : 'all-unique' },
    options: [{ id: 'duplicate', label: 'true' }, { id: 'all-unique', label: 'false' }],
    explanation: snapshot.explanation,
  };
}

