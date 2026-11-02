import {
  RemoveDuplicatesInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type RemoveDuplicatesInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset reference-algorithm states. Student Java is never parsed or executed here. */
export async function buildReferenceTrace(raw: RemoveDuplicatesInput, inputId: string): Promise<ReferenceTrace> {
  const input = RemoveDuplicatesInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多显示 30 项；真实 Java 判题仍支持 10000 项');

  const original = [...input.nums];
  const nums = [...original];
  let write: number | undefined;
  let read: number | undefined;
  let isNewValue: boolean | undefined;
  let phase = '尚未开始';
  const snapshots: Snapshot[] = [];

  const state = (explanation: string, returnedK?: number): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'length', value: { kind: 'int', value: nums.length } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (read !== undefined) {
      variables.push({ name: 'read', value: { kind: 'int', value: read } });
      indices.push({ name: 'read', index: read });
    }
    if (write !== undefined) {
      variables.push({ name: 'write', value: { kind: 'int', value: write } });
      indices.push({ name: 'write', index: write });
      variables.push({ name: '已确认前缀长度', value: { kind: 'int', value: write } });
    }
    if (isNewValue !== undefined) variables.push({ name: '是否为新值', value: { kind: 'boolean', value: isNewValue } });
    if (returnedK !== undefined) variables.push({ name: '返回 k', value: { kind: 'int', value: returnedK } });
    const structures: State['structures'][number][] = [{ kind: 'array', id: 'nums', values: [...nums], indices }];
    if (returnedK !== undefined) structures.push({ kind: 'array', id: 'submitted-prefix', values: nums.slice(0, returnedK), indices: [] });
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('nums 保存数组对象的引用值；尚未建立不重复前缀。这里是参考解法的算法状态，不是学生 Java 的运行轨迹。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string, returnedK?: number) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation, returnedK),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  phase = '建立不重复前缀';
  write = 1;
  append('init-write', '输入至少有一项；nums[0..1) 已是不重复前缀，write=1 指向下一处可写位置。');
  let firstDecision = true;
  for (read = 1; ; read++) {
    isNewValue = undefined;
    const inRange = read < nums.length;
    append(
      'check-read',
      inRange ? `read=${read} 仍在数组内，检查当前值。` : `read=${read} 到达 length，扫描结束。`,
      !inRange && firstDecision ? 'first-decision' : undefined,
    );
    if (!inRange) break;

    isNewValue = nums[read] !== nums[write - 1]!;
    append(
      'check-unique',
      `比较 nums[${read}]=${nums[read]} 与不重复前缀最后一项 nums[${write - 1}]=${nums[write - 1]}：${isNewValue ? '不同，需要写入前缀' : '相同，是重复项，跳过'}。`,
      firstDecision ? 'first-decision' : undefined,
    );
    firstDecision = false;
    if (!isNewValue) continue;

    nums[write] = nums[read]!;
    append('copy-unique', `把新值 ${nums[read]} 写到 nums[${write}]。数组尾部尚未纳入结果，不要求保持原样。`);
    write++;
    append('advance-write', `write 前进到 ${write}；nums[0..${write}) 恰好是已扫描输入前缀的有序去重结果。`);
  }

  phase = '返回有效前缀长度';
  read = undefined;
  isNewValue = undefined;
  append('return-length', `返回 k=${write}。可信调用器只提交 nums[0..${write}) 给判题器，k 之后的元素不参与判定。`, 'final-count', write);
  const finalOutput = expectedOutput('26', { nums: original });
  if (finalOutput.kind !== 'int-array') throw new Error('26 可信输出必须是 int-array');
  const submitted = nums.slice(0, write);
  if (submitted.length !== finalOutput.values.length || submitted.some((value, index) => value !== finalOutput.values[index])) {
    throw new Error('参考模型与独立 oracle 的有效前缀不一致');
  }
  return finalizeTrace({
    problemId: '26', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { nums: original }, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-unique') {
    const value = snapshot.variables.find(variable => variable.name === '是否为新值')?.value;
    if (value?.kind !== 'boolean') throw new Error('新值预测缺少 boolean 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前 read 指向的值会写入不重复前缀吗？',
      answer: { kind: 'choice', optionId: value.value ? 'copy' : 'skip' },
      options: [{ id: 'copy', label: '会写入 nums[write]' }, { id: 'skip', label: '会跳过，不推进 write' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'check-read') {
    const read = snapshot.variables.find(variable => variable.name === 'read')?.value;
    const length = snapshot.variables.find(variable => variable.name === 'length')?.value;
    if (read?.kind !== 'int' || length?.kind !== 'int') throw new Error('循环预测缺少整数状态');
    const enters = read.value < length.value;
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：read 还会进入一次比较，还是扫描已经结束？',
      answer: { kind: 'choice', optionId: enters ? 'compare' : 'stop' },
      options: [{ id: 'compare', label: '进入比较' }, { id: 'stop', label: '结束扫描' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '返回 k')?.value;
  if (value?.kind !== 'int') throw new Error('最终长度预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最终返回的有效前缀长度 k 是多少？',
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
