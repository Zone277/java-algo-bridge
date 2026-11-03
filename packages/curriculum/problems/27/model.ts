import {
  RemoveElementInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type RemoveElementInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset reference-algorithm states. Student Java is never parsed or executed here. */
export async function buildReferenceTrace(raw: RemoveElementInput, inputId: string): Promise<ReferenceTrace> {
  const input = RemoveElementInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考状态演示最多显示 30 项；真实 Java 判题仍支持 10000 项');

  const original = [...input.nums];
  const nums = [...original];
  let write = 0;
  let read: number | undefined;
  let keep: boolean | undefined;
  let phase = '尚未开始';
  const snapshots: Snapshot[] = [];

  const state = (explanation: string, returnedK?: number): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'val', value: { kind: 'int', value: input.val } },
      { name: 'length', value: { kind: 'int', value: nums.length } },
      { name: 'write', value: { kind: 'int', value: write } },
      { name: '已保留数量', value: { kind: 'int', value: write } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [{ name: 'write', index: write }];
    if (read !== undefined) {
      variables.push({ name: 'read', value: { kind: 'int', value: read } });
      indices.push({ name: 'read', index: read });
    }
    if (keep !== undefined) variables.push({ name: '是否保留', value: { kind: 'boolean', value: keep } });
    if (returnedK !== undefined) variables.push({ name: '返回 k', value: { kind: 'int', value: returnedK } });
    const structures: State['structures'][number][] = [{ kind: 'array', id: 'nums', values: [...nums], indices }];
    if (returnedK !== undefined) structures.push({ kind: 'array', id: 'submitted-prefix', values: nums.slice(0, returnedK), indices: [] });
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('nums 保存数组对象的引用值；尚未扫描任何元素。这里是参考解法的算法状态，不是学生 Java 的运行轨迹。'),
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

  phase = '建立保留前缀';
  append('init-write', 'write=0：空前缀已经等于空的已扫描结果，write 同时表示保留数量和下一写入位置。');
  let firstDecision = true;
  for (read = 0; ; read++) {
    keep = undefined;
    const inRange = read < nums.length;
    append('check-read', inRange ? `read=${read} 仍在数组内，检查该元素。` : `read=${read} 到达 length，扫描结束。`);
    if (!inRange) break;

    keep = original[read] !== input.val;
    append(
      'check-keep',
      `原输入第 ${read} 项是 ${original[read]}，与 val=${input.val} ${keep ? '不同，需要保留' : '相同，应移除'}。`,
      firstDecision ? 'first-decision' : undefined,
    );
    firstDecision = false;
    if (!keep) continue;

    nums[write] = original[read]!;
    append('copy-keep', `把 ${original[read]} 写入 nums[${write}]；数组尾部还不属于结果。`);
    write++;
    append('advance-write', `write 前进到 ${write}；nums[0..${write}) 是已扫描原输入的稳定过滤结果。`);
  }

  phase = '返回有效前缀长度';
  read = undefined;
  keep = undefined;
  append('return-length', `返回 k=${write}。可信调用器只提交 nums[0..${write})；本站判题也接受相同保留元素的其他排列。`, 'final-count', write);
  const finalOutput = expectedOutput('27', { nums: original, val: input.val });
  if (finalOutput.kind !== 'int-array') throw new Error('27 可信输出必须是 int-array');
  const submitted = nums.slice(0, write);
  if (submitted.length !== finalOutput.values.length || submitted.some((value, index) => value !== finalOutput.values[index])) {
    throw new Error('参考模型与独立 oracle 的稳定过滤前缀不一致');
  }
  return finalizeTrace({
    problemId: '27', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { nums: original, val: input.val }, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-keep') {
    const value = snapshot.variables.find(variable => variable.name === '是否保留')?.value;
    if (value?.kind !== 'boolean') throw new Error('保留预测缺少 boolean 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前 read 指向的值会进入有效前缀吗？',
      answer: { kind: 'choice', optionId: value.value ? 'keep' : 'remove' },
      options: [{ id: 'keep', label: '保留并写入 nums[write]' }, { id: 'remove', label: '移除且 write 不变' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '返回 k')?.value;
  if (value?.kind !== 'int') throw new Error('最终长度预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最终返回的保留元素数量 k 是多少？',
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
