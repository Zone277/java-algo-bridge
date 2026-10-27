import { FirstUniqueCharInputSchema, expectedOutput, type FirstUniqueCharInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure two-pass reference algorithm state, never a trace of student Java. */
export async function buildReferenceTrace(raw: FirstUniqueCharInput, inputId: string): Promise<ReferenceTrace> {
  const input = FirstUniqueCharInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30) throw new Error('参考状态演示最多 30 字符；真实 Java 判题仍接受本站公布的 10000 字符上限');

  const count = Array<number>(26).fill(0);
  const snapshots: Snapshot[] = [];
  let countInitialized = false;
  let phase: 'count' | 'scan' = 'count';
  let counted = 0;
  let scanned = 0;
  let i: number | undefined;
  let slot: number | undefined;
  let character: string | undefined;
  let frequency: number | undefined;
  let unique: boolean | undefined;
  let loopCondition: boolean | undefined;
  let result: number | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's（字符串内容）', value: { kind: 'string', value: input.s } },
      { name: '当前轮次（教学）', value: { kind: 'string', value: phase === 'count' ? '统计全串' : '从左找唯一' } },
    ];
    if (countInitialized) variables.push({ name: 'count', value: { kind: 'reference', objectId: 'count' } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (loopCondition !== undefined) variables.push({ name: '循环条件（表达式）', value: { kind: 'boolean', value: loopCondition } });
    if (character !== undefined) variables.push({ name: 's.charAt(i)（表达式）', value: { kind: 'char', value: character } });
    if (slot !== undefined) variables.push({ name: '字符槽号（表达式）', value: { kind: 'int', value: slot } });
    if (frequency !== undefined) variables.push({ name: '当前字符总频次（表达式）', value: { kind: 'int', value: frequency } });
    if (unique !== undefined) variables.push({ name: '频次等于 1（表达式）', value: { kind: 'boolean', value: unique } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    const shown = phase === 'count' ? counted : scanned;
    const members = [...new Set(input.s.slice(0, shown))].map(value => ({ kind: 'char' as const, value }));
    const structures: State['structures'][number][] = [
      { kind: 'window', id: 's 已处理前缀（教学视图）', text: input.s, left: 0, rightExclusive: shown, members },
    ];
    if (countInitialized) structures.push({
      kind: 'array', id: 'count', values: [...count], indices: slot === undefined ? [] : [{ name: '字符槽号', index: slot }],
    });
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('参数 s 接收 String 引用值的副本；显示文本只是教学视图。count 数组尚未创建，局部变量 i 尚未声明。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考状态模型超过 2000 快照上限');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  countInitialized = true;
  append('init-count', 'new int[26] 创建单独数组对象，每个 int 槽默认是 0；不是说局部变量会自动初始化。此时尚未读取 s 的字符。');
  for (let index = 0; ; index++) {
    i = index;
    character = undefined; slot = undefined; frequency = undefined; unique = undefined;
    loopCondition = i < input.s.length;
    append('check-count-loop', loopCondition ? `第一趟 i=${i}，count 恰是 s[0..${i}) 的各字母频次；准备计入当前位置。` : `第一趟 i=${i} 达到长度，count 已是全串频次；不会访问 s.charAt(${i})。`);
    if (!loopCondition) break;
    loopCondition = undefined;
    character = input.s[i]!;
    slot = character.charCodeAt(0) - 97;
    count[slot]!++;
    counted = i + 1;
    frequency = count[slot];
    append('increment-count', `读 s[${i}]='${character}'，只让槽 ${slot}（'${character}'）加一到 ${frequency}；现在 count 对应 s[0..${counted})。i++ 还未执行。`);
  }

  phase = 'scan';
  i = undefined; character = undefined; slot = undefined; frequency = undefined; unique = undefined; loopCondition = undefined;
  let predictedFirstFrequency = false;
  for (let index = 0; ; index++) {
    i = index;
    character = undefined; slot = undefined; frequency = undefined; unique = undefined;
    loopCondition = i < input.s.length;
    append('check-scan-loop', loopCondition ? `第二趟 i=${i}，count 保持全串频次不变；前面 [0,${i}) 均已检查且不唯一。` : `第二趟 i=${i} 已到结尾，没有唯一字符；不会越界读取。`);
    if (!loopCondition) break;
    loopCondition = undefined;
    character = input.s[i]!;
    slot = character.charCodeAt(0) - 97;
    frequency = count[slot]!;
    unique = frequency === 1;
    scanned = i + 1;
    append('check-unique', `检查 s[${i}]='${character}' 的全串频次 count[${slot}]=${frequency}；${unique ? '它只出现一次，且所有更小下标已失败。' : '它并不唯一，继续向右检查。'} 此检查不修改 count。`, !predictedFirstFrequency ? 'first-frequency' : undefined);
    predictedFirstFrequency = true;
    if (unique) {
      result = i;
      append('return-index', `返回最左唯一字符的下标 ${i}，不是字符本身、字母槽号或从右边数的下标。`, 'final-result');
      break;
    }
  }
  if (result === undefined) {
    i = undefined; character = undefined; slot = undefined; frequency = undefined; unique = undefined; loopCondition = undefined;
    result = -1;
    append('return-missing', '全串所有位置对应的总频次都大于 1；没有唯一字符，返回 -1。两个 for 的 i 都已离开作用域。', 'final-result');
  }
  const finalOutput = { kind: 'int' as const, value: result };
  const trusted = expectedOutput('387', input);
  if (trusted.kind !== 'int' || trusted.value !== result) throw new Error('参考状态模型与独立可信期望不一致');
  return finalizeTrace({ problemId: '387', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const frequencyCheck = snapshot.stepId === 'check-unique';
  const name = frequencyCheck ? '当前字符总频次（表达式）' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error('387 预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: frequencyCheck ? '先预测，再揭示：首个候选字符在完整字符串中总共出现几次？' : '先预测，再揭示：最靠左的唯一字符下标是多少？没有则填 -1。',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
