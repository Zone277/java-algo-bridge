import { RansomNoteInputSchema, expectedOutput, type RansomNoteInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure teaching model of the fixed Java reference, never an interpreter of student Java. */
export async function buildReferenceTrace(raw: RansomNoteInput, inputId: string): Promise<ReferenceTrace> {
  const input = RansomNoteInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.ransomNote.length > 30 || input.magazine.length > 30) {
    throw new Error('参考状态演示每串最多 30 字符；真实 Java 判题仍可接受本站的 10000 字符上限');
  }

  const available = Array<number>(26).fill(0);
  const snapshots: Snapshot[] = [];
  let initialized = false;
  let phase: 'magazine' | 'ransomNote' = 'magazine';
  let counted = 0;
  let consumed = 0;
  let i: number | undefined;
  let character: string | undefined;
  let slot: number | undefined;
  let stockBefore: number | undefined;
  let canTake: boolean | undefined;
  let loopCondition: boolean | undefined;
  let result: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'ransomNote（显示文本）', value: { kind: 'string', value: input.ransomNote } },
      { name: 'magazine（显示文本）', value: { kind: 'string', value: input.magazine } },
      { name: '当前轮次（教学）', value: { kind: 'string', value: phase === 'magazine' ? '先建库存' : '逐张取用' } },
    ];
    if (initialized) variables.push({ name: 'available', value: { kind: 'reference', objectId: 'available' } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (loopCondition !== undefined) variables.push({ name: '循环条件（表达式）', value: { kind: 'boolean', value: loopCondition } });
    if (character !== undefined) variables.push({ name: '本次字符（表达式）', value: { kind: 'char', value: character } });
    if (slot !== undefined) variables.push({ name: '字符槽号（表达式）', value: { kind: 'int', value: slot } });
    if (stockBefore !== undefined) variables.push({ name: '取用前库存（表达式）', value: { kind: 'int', value: stockBefore } });
    if (canTake !== undefined) variables.push({ name: '还有字母卡（表达式）', value: { kind: 'boolean', value: canTake } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const structures: State['structures'][number][] = [
      { kind: 'window', id: 'magazine 已计数前缀（教学视图）', text: input.magazine, left: 0, rightExclusive: counted, members: [...new Set(input.magazine.slice(0, counted))].map(value => ({ kind: 'char' as const, value })) },
      { kind: 'window', id: 'ransomNote 已消耗前缀（教学视图）', text: input.ransomNote, left: 0, rightExclusive: consumed, members: [...new Set(input.ransomNote.slice(0, consumed))].map(value => ({ kind: 'char' as const, value })) },
    ];
    if (initialized) structures.push({ kind: 'array', id: 'available', values: [...available], indices: slot === undefined ? [] : [{ name: '字符槽号', index: slot }] });
    return { variables, structures, explanation };
  };

  const initialState: State = { snapshotId: 'initial', ...state('方法接收两个 String 引用值的副本；这里只显示文本。尚未创建 available 数组，两个 for 的局部变量 i 也尚未声明。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考状态模型超过 2000 快照上限');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  initialized = true;
  append('init-available', 'new int[26] 创建数组对象，26 个 int 元素初始都为 0；这不意味着 Java 局部变量也会自动初始化。');
  for (let index = 0; ; index++) {
    i = index; character = undefined; slot = undefined; stockBefore = undefined; canTake = undefined;
    loopCondition = i < input.magazine.length;
    append('check-magazine-loop', loopCondition ? `杂志扫描 i=${i}，available 恰为 magazine[0..${i}) 的字母频次。` : `杂志扫描 i=${i} 已到末尾；available 现在是完整杂志的频次。`);
    if (!loopCondition) break;
    loopCondition = undefined;
    character = input.magazine.charAt(index);
    slot = character.charCodeAt(0) - 97;
    available[slot]!++;
    counted = index + 1;
    append('add-magazine-char', `读 magazine.charAt(${i})='${character}'，把槽 ${slot} 的可用张数加到 ${available[slot]}；库存对应 magazine[0..${counted})。`);
  }

  phase = 'ransomNote';
  i = undefined; character = undefined; slot = undefined; stockBefore = undefined; canTake = undefined; loopCondition = undefined;
  for (let index = 0; ; index++) {
    i = index; character = undefined; slot = undefined; stockBefore = undefined; canTake = undefined;
    loopCondition = i < input.ransomNote.length;
    append('check-note-loop', loopCondition ? `需求扫描 i=${i}，前 ${i} 张已成功取用；available 是完整杂志减去已用卡片后的非负库存。` : `需求扫描 i=${i} 已到末尾；每张需求卡都已成功取用。`);
    if (!loopCondition) break;
    loopCondition = undefined;
    character = input.ransomNote.charAt(index);
    slot = character.charCodeAt(0) - 97;
    stockBefore = available[slot]!;
    canTake = stockBefore > 0;
    append('check-available', `第 ${i + 1} 张需求卡是 '${character}'，槽 ${slot} 的可用张数为 ${stockBefore}；${canTake ? '可以取用。' : '已无库存，不能再取。'}`, index === 0 ? 'first-stock' : undefined);
    if (!canTake) {
      result = false;
      append('return-false', `缺少第 ${i + 1} 张 '${character}'；无法拼出全部需求，返回 false。`, 'final-result');
      break;
    }
    available[slot]!--;
    consumed = index + 1;
    append('consume-char', `取用一张 '${character}'，槽 ${slot} 从 ${stockBefore} 变为 ${available[slot]}；库存仍非负，已满足前 ${consumed} 张需求。`);
  }
  if (result === undefined) {
    i = undefined; character = undefined; slot = undefined; stockBefore = undefined; canTake = undefined; loopCondition = undefined;
    result = true;
    append('return-true', '需求字符串的每一张字母卡都成功取用，返回 true；杂志可留下多余卡片。', 'final-result');
  }

  const finalOutput = { kind: 'boolean' as const, value: result };
  const trusted = expectedOutput('383', input);
  if (trusted.kind !== 'boolean' || trusted.value !== result) throw new Error('383 参考状态与独立可信期望不一致');
  return finalizeTrace({ problemId: '383', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-available') {
    const value = snapshot.variables.find(item => item.name === '取用前库存（表达式）')?.value;
    if (value?.kind !== 'int') throw new Error('383 首张库存预测缺少整数状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：第一张所需字母在完整杂志中有几张可用？', answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
  }
  if (snapshot.stepId !== 'return-true' && snapshot.stepId !== 'return-false') throw new Error('383 未知预测步骤');
  const value = snapshot.variables.find(item => item.name === '返回值')?.value;
  if (value?.kind !== 'boolean') throw new Error('383 最终结果预测缺少布尔状态');
  return {
    checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：全部需求字母能否从杂志各取用一次？',
    answer: { kind: 'choice', optionId: value.value ? 'yes' : 'no' },
    options: [{ id: 'yes', label: '可以（true）' }, { id: 'no', label: '不可以（false）' }], explanation: snapshot.explanation,
  };
}
