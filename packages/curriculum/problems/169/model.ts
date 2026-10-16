import {
  MajorityElementInputSchema,
  expectedOutput,
  type MajorityElementInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** State of the preset Boyer-Moore reference, never a trace of student Java. */
export async function buildReferenceTrace(raw: MajorityElementInput, inputId: string): Promise<ReferenceTrace> {
  const input = MajorityElementInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多支持 30 项；真实判题仍接受最多 10000 项');

  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let candidate: number | undefined;
  let votes: number | undefined;
  let i: number | undefined;
  let value: number | undefined;
  let empty: boolean | undefined;
  let equal: boolean | undefined;
  let phase = '尚未开始';

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: '阶段（演示标记）', value: { kind: 'string', value: phase } },
    ];
    if (candidate !== undefined) variables.push({ name: 'candidate', value: { kind: 'int', value: candidate } });
    if (votes !== undefined) variables.push({ name: 'votes', value: { kind: 'int', value: votes } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (value !== undefined) variables.push({ name: 'nums[i]（表达式）', value: { kind: 'int', value } });
    if (empty !== undefined) variables.push({ name: 'votes == 0', value: { kind: 'boolean', value: empty } });
    if (equal !== undefined) variables.push({ name: 'nums[i] == candidate', value: { kind: 'boolean', value: equal } });
    const indices = i === undefined || i >= nums.length ? [] : [{ name: 'i', index: i }];
    return {
      variables,
      structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法按值收到 nums 的引用值；Java 数组对象不被复制。此刻候选值和票数尚未初始化。'),
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

  phase = '初始化';
  candidate = nums[0]!;
  append('init-candidate', `把首项 ${candidate} 放入 candidate；这只是初始候选，不表示首项一定过半。`);
  votes = 0;
  append('init-votes', 'votes=0；此时没有尚未配对的候选值。');

  phase = '逐项抵消';
  for (let position = 0; position <= nums.length; position++) {
    i = position;
    value = position < nums.length ? nums[position]! : undefined;
    empty = undefined;
    equal = undefined;
    append('loop-index', position < nums.length
      ? `进入 i=${position}；此前的异值配对已经抵消，votes 表示尚未配对的 candidate 个数。`
      : `i=${position}，循环条件不成立；所有 ${nums.length} 项都已处理。`);
    if (position === nums.length) break;

    empty = votes === 0;
    append('check-empty', empty
      ? '没有留下待配对票数，当前值可以成为新候选。'
      : `还有 ${votes} 张 ${candidate} 的待配对票；先与当前值比较。`);
    if (empty) {
      candidate = value!;
      append('choose-candidate', `票数为 0，改选 nums[${position}]=${candidate}；这一步只改变局部 int 变量 candidate。`,
        position === 0 ? 'first-candidate' : undefined);
    }

    equal = value === candidate;
    append('compare-value', equal
      ? `nums[${position}]=${value} 等于 candidate=${candidate}，保留一张同值票。`
      : `nums[${position}]=${value} 不等于 candidate=${candidate}，它们可抵消一对。`);
    if (equal) {
      votes++;
      append('add-vote', `同值票数增加到 ${votes}；处理完前 ${position + 1} 项。`);
    } else {
      votes--;
      append('remove-vote', `异值抵消后票数降到 ${votes}；不会把当前值写回数组。`);
    }
  }

  phase = '完成';
  i = undefined;
  value = undefined;
  empty = undefined;
  equal = undefined;
  append('return-candidate', `返回 candidate=${candidate}。题目保证某值严格超过一半；其他值无法把它全部抵消。`, 'final-candidate');

  if (candidate === undefined || votes === undefined || votes <= 0) {
    throw new Error('参考状态模型结束时缺少有效候选和票数');
  }
  const finalOutput = { kind: 'int' as const, value: candidate };
  const trusted = expectedOutput('169', input);
  if (trusted.kind !== 'int' || trusted.value !== finalOutput.value) {
    throw new Error('参考状态模型与 169 多数元素契约不一致');
  }
  return finalizeTrace({
    problemId: '169', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { nums }, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const candidate = snapshot.variables.find(variable => variable.name === 'candidate')?.value;
  if (candidate?.kind !== 'int') throw new Error('候选值检查点缺少 int 状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: snapshot.stepId === 'choose-candidate'
      ? '先预测，再揭示：第一次遇到 votes==0 并选取当前项后，candidate 是多少？'
      : '先预测，再揭示：全部异值抵消之后返回的 candidate 是多少？',
    answer: { kind: 'int', value: candidate.value },
    explanation: snapshot.explanation,
  };
}
