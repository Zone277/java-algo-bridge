import {
  MoveZeroesInputSchema,
  expectedOutput,
  type MoveZeroesInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '@jab/curriculum/model-utils';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type InitialState = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Preset reference algorithm model. It never accepts or interprets student Java. */
export async function buildReferenceTrace(rawInput: MoveZeroesInput, inputId: string): Promise<ReferenceTrace> {
  const input = MoveZeroesInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；未截断生成轨迹，真实判题上限仍为 10000 项');

  const original = [...input.nums];
  const nums = [...original];
  let write: number | undefined;
  let read: number | undefined;
  let condition: boolean | undefined;
  let phase = '尚未开始';
  let writtenIndex: number | undefined;
  let writtenValue: number | undefined;
  const snapshots: Snapshot[] = [];

  const state = (explanation: string): Omit<InitialState, 'snapshotId'> => {
    const variables: InitialState['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'length', value: { kind: 'int', value: nums.length } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (read !== undefined) { variables.push({ name: 'read', value: { kind: 'int', value: read } }); indices.push({ name: 'read', index: read }); }
    if (write !== undefined) { variables.push({ name: 'write', value: { kind: 'int', value: write } }); indices.push({ name: 'write', index: write }); }
    if (condition !== undefined) variables.push({ name: '条件结果', value: { kind: 'boolean', value: condition } });
    if (writtenIndex !== undefined && writtenValue !== undefined) {
      variables.push({ name: '最近写入下标', value: { kind: 'int', value: writtenIndex } });
      variables.push({ name: '最近写入值', value: { kind: 'int', value: writtenValue } });
      indices.push({ name: '最近写入', index: writtenIndex });
    }
    return { variables, structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }], explanation };
  };
  const initialState: InitialState = { snapshotId: 'initial', ...state('方法收到数组对象的引用值；尚未初始化读写指针，数组对象仍是 nums。') };
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

  phase = '扫描非零元素';
  write = 0;
  append('init-write', 'write=0：下标 write 之前将保存已经稳定收集的非零元素。');
  let firstDecision = true;
  let firstWrite = true;
  for (read = 0; ; read++) {
    writtenIndex = undefined; writtenValue = undefined;
    condition = read < nums.length;
    append('check-read', condition ? `read=${read} 仍在数组内，检查当前元素。` : `read=${read} 等于 length，原数组已经扫描完。`);
    if (!condition) break;

    condition = nums[read] !== 0;
    append('check-nonzero', `nums[${read}]=${nums[read]}，${condition ? '需要按原顺序写入非零前缀' : '是零，本轮不推进 write'}。`, firstDecision ? 'first-decision' : undefined);
    firstDecision = false;
    if (!condition) continue;

    const sourceValue = nums[read]!;
    nums[write] = sourceValue;
    writtenIndex = write; writtenValue = sourceValue;
    append('copy-nonzero', `把原扫描位置的非零值 ${sourceValue} 写到 nums[${write}]；修改的是同一个数组对象。`, firstWrite ? 'first-write' : undefined);
    firstWrite = false;
    writtenIndex = undefined; writtenValue = undefined;
    write++;
    append('advance-write', `write 前进到 ${write}；nums[0..${write}) 恰是已扫描前缀中的全部非零值，且次序不变。`);
  }

  phase = '补齐尾部零';
  condition = undefined;
  for (;;) {
    writtenIndex = undefined; writtenValue = undefined;
    condition = write < nums.length;
    append('check-fill', condition ? `write=${write} 尚未到 length，尾部这一格应写成 0。` : `write=${write} 已到 length，尾部零已补齐。`);
    if (!condition) break;
    nums[write] = 0;
    writtenIndex = write; writtenValue = 0;
    append('fill-zero', `nums[${write}]=0；稳定非零前缀不再改变。`, firstWrite ? 'first-write' : undefined);
    firstWrite = false;
    writtenIndex = undefined; writtenValue = undefined;
    write++;
    append('advance-fill', `write 前进到 ${write}；已经补零的区间继续扩大。`);
  }

  phase = '完成'; condition = undefined; writtenIndex = undefined; writtenValue = undefined;
  append('finish', 'void 方法结束，不返回数组；调用器观察传入的同一个 nums 对象已经完成原地修改。');
  return finalizeTrace({
    problemId: '283', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input: { nums: original }, initialState, snapshots,
    finalOutput: expectedOutput('283', { nums: original }),
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-nonzero') {
    const conditionValue = snapshot.variables.find(variable => variable.name === '条件结果')?.value;
    if (conditionValue?.kind !== 'boolean') throw new Error('首次判断预测缺少 boolean 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前 read 指向的元素会被复制到非零前缀，还是跳过？',
      answer: { kind: 'choice', optionId: conditionValue.value ? 'copy' : 'skip' },
      options: [{ id: 'copy', label: '复制并随后推进 write' }, { id: 'skip', label: '跳过，write 不变' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '最近写入值')?.value;
  const target = snapshot.variables.find(variable => variable.name === '最近写入下标')?.value;
  if (value?.kind !== 'int' || target?.kind !== 'int') throw new Error('首次写入预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: `先预测，再揭示：这次写入完成后，nums[${target.value}] 是多少？`,
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
