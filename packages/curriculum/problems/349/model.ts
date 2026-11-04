import {
  ArrayIntersectionInputSchema,
  expectedOutput,
  type ArrayIntersectionInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type Phase = 'second' | 'first' | 'result' | 'done';

const sorted = (values: ReadonlySet<number>) => [...values].sort((a, b) => a - b);

/** Pure model of the fixed reference algorithm. It never reads or interprets student Java source. */
export async function buildReferenceTrace(raw: ArrayIntersectionInput, inputId: string): Promise<ReferenceTrace> {
  const input = ArrayIntersectionInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums1.length > 30 || input.nums2.length > 30) {
    throw new Error('参考状态演示要求每个数组最多 30 项；真实 Java 判题仍接受每个数组 1000 项');
  }

  const members = new Set<number>();
  const common = new Set<number>();
  const snapshots: Snapshot[] = [];
  let membersCreated = false;
  let commonCreated = false;
  const resultState: { values?: number[] } = {};
  let phase: Phase = 'second';
  let scanIndex: number | undefined;
  let current: number | undefined;
  let inMembers: boolean | undefined;
  let resultIndex: number | undefined;

  const membershipTable = (id: string, values: ReadonlySet<number>): State['structures'][number] => ({
    kind: 'map',
    id,
    entries: sorted(values).map(value => ({
      key: { kind: 'int', value },
      value: { kind: 'boolean', value: true },
    })),
  });

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums1', value: { kind: 'reference', objectId: 'nums1' } },
      { name: 'nums2', value: { kind: 'reference', objectId: 'nums2' } },
    ];
    if (membersCreated) variables.push({ name: 'members', value: { kind: 'reference', objectId: 'members' } });
    if (commonCreated) {
      variables.push({ name: 'common', value: { kind: 'reference', objectId: 'common' } });
      variables.push({ name: 'common.size()', value: { kind: 'int', value: common.size } });
    }
    if (current !== undefined) variables.push({ name: 'value', value: { kind: 'int', value: current } });
    if (inMembers !== undefined) variables.push({ name: 'members 包含 value', value: { kind: 'boolean', value: inMembers } });
    if (resultIndex !== undefined) variables.push({ name: 'index', value: { kind: 'int', value: resultIndex } });
    if (phase === 'done' && resultState.values !== undefined) {
      variables.push({ name: '返回数组长度', value: { kind: 'int', value: resultState.values.length } });
    }

    const structures: State['structures'][number][] = [
      {
        kind: 'array', id: 'nums1', values: [...input.nums1],
        indices: phase === 'first' && scanIndex !== undefined ? [{ name: '当前增强 for 项', index: scanIndex }] : [],
      },
      {
        kind: 'array', id: 'nums2', values: [...input.nums2],
        indices: phase === 'second' && scanIndex !== undefined ? [{ name: '当前增强 for 项', index: scanIndex }] : [],
      },
    ];
    if (membersCreated) structures.push(membershipTable('members', members));
    if (commonCreated) structures.push(membershipTable('common', common));
    if (resultState.values !== undefined) {
      structures.push({
        kind: 'array', id: 'result', values: [...resultState.values],
        indices: resultIndex === undefined ? [] : [{ name: 'index（下一写入位）', index: resultIndex }],
      });
    }
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到两个数组的引用值；参考代码尚未创建任何集合，也没有修改输入数组。'),
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

  membersCreated = true;
  append('init-members', '创建空 HashSet members；它将保存 nums2 已扫描前缀中的不同值。');
  for (let index = 0; index < input.nums2.length; index++) {
    phase = 'second';
    scanIndex = index;
    current = input.nums2[index]!;
    inMembers = undefined;
    append('scan-second', `增强 for 取到 nums2[${index}]=${current}；加入前 members 等于 nums2[0..${index - 1}] 的不同值集合。`);
    const oldSize = members.size;
    members.add(current);
    append('add-second', members.size === oldSize
      ? `${current} 已经在 members 中，重复 add 不改变集合；不变量继续成立。`
      : `把 ${current} 加入 members；现在它等于 nums2[0..${index}] 的不同值集合。`);
  }

  phase = 'first';
  scanIndex = undefined;
  current = undefined;
  commonCreated = true;
  append('init-common', 'nums2 已完整扫描。创建空 HashSet common，准备收集不同的共同值。');
  for (let index = 0; index < input.nums1.length; index++) {
    phase = 'first';
    scanIndex = index;
    current = input.nums1[index]!;
    inMembers = undefined;
    append('scan-first', `增强 for 取到 nums1[${index}]=${current}；此时 common 只含 nums1 更早前缀中确认过的共同值。`);
    inMembers = members.has(current);
    append('check-member', inMembers
      ? `${current} 存在于 members，说明它也出现在 nums2，可以加入 common。`
      : `${current} 不在 members 中，说明它没有出现在 nums2，不能加入 common。`, index === 0 ? 'first-membership' : undefined);
    if (inMembers) {
      const oldSize = common.size;
      common.add(current);
      append('add-common', common.size === oldSize
        ? `${current} 已在 common 中，再次 add 不会制造重复结果。`
        : `把 ${current} 加入 common；common 仍恰好是已扫描 nums1 前缀与 nums2 的不同共同值。`);
    }
  }

  phase = 'result';
  scanIndex = undefined;
  current = undefined;
  inMembers = undefined;
  const resultValues = Array<number>(common.size).fill(0);
  resultState.values = resultValues;
  append('allocate-result', `按 common.size()=${common.size} 创建结果数组；长度不会多出默认零，也不会漏掉共同值。`);
  resultIndex = 0;
  append('init-index', '令 index=0，表示下一项共同值要写入的位置。');
  for (const value of sorted(common)) {
    current = value;
    resultValues[resultIndex] = value;
    append('write-result', `值域扫描命中 common 中的 ${value}，把它写入 result[${resultIndex}]。`);
    resultIndex++;
    append('advance-index', `index 增加到 ${resultIndex}；每个 common 成员只会写入一次。`);
  }

  phase = 'done';
  current = undefined;
  append('return-result', `返回长度为 ${resultValues.length} 的 int[]。这里为稳定演示按值递增；本站判题接受任意顺序。`, 'result-length');

  const finalOutput = expectedOutput('349', input);
  if (finalOutput.kind !== 'int-array' || finalOutput.values.length !== resultValues.length ||
      finalOutput.values.some((value, index) => value !== resultValues[index])) {
    throw new Error('参考状态模型与 349 可信期望输出不一致');
  }
  return finalizeTrace({
    problemId: '349',
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
  if (snapshot.stepId === 'check-member') {
    const current = snapshot.variables.find(variable => variable.name === 'value')?.value;
    const membership = snapshot.variables.find(variable => variable.name === 'members 包含 value')?.value;
    if (current?.kind !== 'int' || membership?.kind !== 'boolean') throw new Error('成员预测检查点缺少状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: `先预测，再揭示：第一次查询 value=${current.value} 时，members 包含它吗？`,
      answer: { kind: 'choice', optionId: membership.value ? 'present' : 'absent' },
      options: [{ id: 'present', label: '包含' }, { id: 'absent', label: '不包含' }],
      explanation: snapshot.explanation,
    };
  }
  const length = snapshot.variables.find(variable => variable.name === '返回数组长度')?.value;
  if (length?.kind !== 'int') throw new Error('结果长度预测检查点缺少状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最终 int[] 中有多少个不同共同值？',
    answer: { kind: 'int', value: length.value },
    explanation: snapshot.explanation,
  };
}
