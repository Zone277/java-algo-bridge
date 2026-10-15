import {
  ValidAnagramInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type ValidAnagramInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure teaching model of the fixed Java reference solution, never an interpreter for student code. */
export async function buildReferenceTrace(rawInput: ValidAnagramInput, inputId: string): Promise<ReferenceTrace> {
  const input = ValidAnagramInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30 || input.t.length > 30) {
    throw new Error('参考状态演示每个字符串最多支持 30 个字符；真实判题仍接受本站公布的更长输入');
  }

  const count = Array<number>(26).fill(0);
  const snapshots: Snapshot[] = [];
  const lengthsEqual = input.s.length === input.t.length;
  let hasComparedLengths = false;
  let countInitialized = false;
  let i: number | undefined;
  let sChar: string | undefined;
  let tChar: string | undefined;
  let letter: number | undefined;
  let nonzero: boolean | undefined;
  let result: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's（显示文本）', value: { kind: 'string', value: input.s } },
      { name: 't（显示文本）', value: { kind: 'string', value: input.t } },
    ];
    if (hasComparedLengths) variables.push({ name: '长度相同', value: { kind: 'boolean', value: lengthsEqual } });
    if (countInitialized) variables.push({ name: 'count', value: { kind: 'reference', objectId: 'count' } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (sChar !== undefined) variables.push({ name: '本轮 s.charAt(i)', value: { kind: 'char', value: sChar } });
    if (tChar !== undefined) variables.push({ name: '本轮 t.charAt(i)', value: { kind: 'char', value: tChar } });
    if (letter !== undefined) variables.push({ name: 'letter', value: { kind: 'int', value: letter } });
    if (nonzero !== undefined) variables.push({ name: '当前槽非零', value: { kind: 'boolean', value: nonzero } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const structures: State['structures'][number][] = countInitialized ? [{
      kind: 'array',
      id: 'count',
      values: [...count],
      indices: letter === undefined ? [] : [{ name: 'letter', index: letter }],
    }] : [];
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到两个 String 引用值。表中显示的是文本内容，未表示 String 的对象身份或 JVM 内部存储。此时尚未建立计数数组。'),
  };

  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限；未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  hasComparedLengths = true;
  append('check-length', `s.length()=${input.s.length}，t.length()=${input.t.length}；长度${lengthsEqual ? '相同，继续比较频次' : '不同，不可能是异位词'}。`, '242-length');
  if (!lengthsEqual) {
    result = false;
    append('return-length-false', '两个字符串的长度不同，直接返回 false；没有创建 count 数组。', '242-result');
  } else {
    countInitialized = true;
    append('init-count', '创建 int[26]，所有元素自动初始化为 0；槽 0..25 分别对应 a..z。');
    for (let index = 0; index < input.s.length; index++) {
      i = index;
      sChar = undefined;
      tChar = undefined;
      append('loop-index', `进入 i=${index}。此前 ${index} 对字符已处理，count[k] 是两串已读前缀中第 k 个字母次数之差。`);

      sChar = input.s.charAt(index);
      const sSlot = sChar.charCodeAt(0) - 97;
      count[sSlot]!++;
      append('increase-s', `s.charAt(${index})='${sChar}'，对应槽 ${sSlot}（${sChar}）加一，现在该槽为 ${count[sSlot]}。`);

      tChar = input.t.charAt(index);
      const tSlot = tChar.charCodeAt(0) - 97;
      count[tSlot]!--;
      append('decrease-t', `t.charAt(${index})='${tChar}'，对应槽 ${tSlot}（${tChar}）减一；处理完第 ${index + 1} 对后，所有槽都表示两串前缀的频次差。`, index === 0 ? '242-first-net' : undefined);
    }

    i = undefined;
    sChar = undefined;
    tChar = undefined;
    for (let slot = 0; slot < count.length; slot++) {
      letter = slot;
      nonzero = undefined;
      append('loop-letter', `检查槽 ${slot}（${String.fromCharCode(97 + slot)}）。完整字符串的频次差已算好，扫描尚未修改 count。`);
      nonzero = count[slot] !== 0;
      append('check-count', `槽 ${slot}（${String.fromCharCode(97 + slot)}）的频次差为 ${count[slot]}，${nonzero ? '非零，已找到不匹配字母' : '为零，继续检查其他字母'}。`);
      if (nonzero) {
        result = false;
        append('return-mismatch', `至少一个字母的出现次数不同，返回 false。`, '242-result');
        break;
      }
    }
    if (result === undefined) {
      letter = undefined;
      nonzero = undefined;
      result = true;
      append('return-true', '26 个字母槽全部为零，两串每种字母出现次数相同，返回 true。', '242-result');
    }
  }

  const finalOutput = expectedOutput('242', input);
  if (finalOutput.kind !== 'boolean' || finalOutput.value !== result) throw new Error('242 状态模型与可信期望不一致');
  return finalizeTrace({
    problemId: '242', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-length') {
    const value = snapshot.variables.find(variable => variable.name === '长度相同')?.value;
    if (value?.kind !== 'boolean') throw new Error('长度预测检查点缺少状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前 s 和 t 的长度相同吗？',
      answer: { kind: 'choice', optionId: value.value ? 'same' : 'different' },
      options: [{ id: 'same', label: '相同' }, { id: 'different', label: '不同' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'decrease-t') {
    const firstChar = snapshot.variables.find(variable => variable.name === '本轮 s.charAt(i)')?.value;
    const counts = snapshot.structures.find(structure => structure.id === 'count');
    if (firstChar?.kind !== 'char' || counts?.kind !== 'array') throw new Error('第一对频次预测缺少状态');
    const slot = firstChar.value.charCodeAt(0) - 97;
    return {
      checkpointId: snapshot.checkpointId,
      prompt: `先预测，再揭示：第一对字符都处理后，${firstChar.value} 槽是多少？`,
      answer: { kind: 'int', value: counts.values[slot]! },
      explanation: snapshot.explanation,
    };
  }
  const returned = snapshot.variables.find(variable => variable.name === '返回值')?.value;
  if (returned?.kind !== 'boolean') throw new Error('结果预测检查点缺少状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最终返回 true 还是 false？',
    answer: { kind: 'choice', optionId: returned.value ? 'anagram' : 'different' },
    options: [{ id: 'anagram', label: 'true' }, { id: 'different', label: 'false' }],
    explanation: snapshot.explanation,
  };
}
