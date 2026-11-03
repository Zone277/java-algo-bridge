import {
  IsomorphicStringsInputSchema,
  expectedOutput,
  type IsomorphicStringsInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

const showChar = (value: string) => value === ' ' ? '空格 ␠' : `'${value}'`;
const SEEN_S_VIEW = 'seenS 非零槽（int[128] 稀疏视图）';
const SEEN_T_VIEW = 'seenT 非零槽（int[128] 稀疏视图）';

/** Pure teaching model of the fixed reference algorithm, never an interpreter of student Java. */
export async function buildReferenceTrace(raw: IsomorphicStringsInput, inputId: string): Promise<ReferenceTrace> {
  const input = IsomorphicStringsInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30) {
    throw new Error('参考状态演示每串最多 30 个字符；真实 Java 判题仍接受本站公布的 10000 字符上限');
  }

  const seenS = Array<number>(128).fill(0);
  const seenT = Array<number>(128).fill(0);
  const snapshots: Snapshot[] = [];
  let hasSeenS = false;
  let hasSeenT = false;
  let i: number | undefined;
  let loopCondition: boolean | undefined;
  let a: string | undefined;
  let b: string | undefined;
  let seenA: number | undefined;
  let seenB: number | undefined;
  let samePattern: boolean | undefined;
  let processed = 0;
  let result: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's（显示文本）', value: { kind: 'string', value: input.s } },
      { name: 't（显示文本）', value: { kind: 'string', value: input.t } },
      { name: '已确认前缀长度（教学）', value: { kind: 'int', value: processed } },
    ];
    if (hasSeenS) variables.push({ name: 'seenS', value: { kind: 'reference', objectId: SEEN_S_VIEW } });
    if (hasSeenT) variables.push({ name: 'seenT', value: { kind: 'reference', objectId: SEEN_T_VIEW } });
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (loopCondition !== undefined) variables.push({ name: '循环条件', value: { kind: 'boolean', value: loopCondition } });
    if (a !== undefined) variables.push({ name: 'a', value: { kind: 'char', value: a } });
    if (b !== undefined) variables.push({ name: 'b', value: { kind: 'char', value: b } });
    if (seenA !== undefined) variables.push({ name: 'seenS[a]（更新前）', value: { kind: 'int', value: seenA } });
    if (seenB !== undefined) variables.push({ name: 'seenT[b]（更新前）', value: { kind: 'int', value: seenB } });
    if (samePattern !== undefined) variables.push({ name: '最近位置相同', value: { kind: 'boolean', value: samePattern } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const structures: State['structures'][number][] = [];
    if (hasSeenS) {
      structures.push({
        kind: 'map', id: SEEN_S_VIEW, presentation: 'sparse-array',
        entries: seenS.flatMap((value, code) => value === 0 ? [] : [{
          key: { kind: 'char' as const, value: String.fromCharCode(code) },
          value: { kind: 'int' as const, value },
        }]),
      });
    }
    if (hasSeenT) {
      structures.push({
        kind: 'map', id: SEEN_T_VIEW, presentation: 'sparse-array',
        entries: seenT.flatMap((value, code) => value === 0 ? [] : [{
          key: { kind: 'char' as const, value: String.fromCharCode(code) },
          value: { kind: 'int' as const, value },
        }]),
      });
    }
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到两个 String 引用值的副本；这里只显示文本内容。尚未创建两个最近位置数组，也没有开始确认字符对应关系。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考状态模型超过 2000 快照上限');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  hasSeenS = true;
  append('init-seen-s', 'new int[128] 创建 seenS 数组对象。每个 int 槽自动为 0，0 表示对应 ASCII 字符尚未出现；演示只列出非零槽，当前稀疏视图为空。');
  hasSeenT = true;
  append('init-seen-t', '再创建独立的 seenT 数组对象。两个数组分别记录字符在各自字符串中的最近出现位置加一；稀疏视图不是 Java Map。');

  const predictionIndex = input.s.length === 1 ? 0 : 1;
  for (let index = 0; ; index++) {
    i = index;
    a = undefined; b = undefined; seenA = undefined; seenB = undefined; samePattern = undefined;
    loopCondition = i < input.s.length;
    append('loop-index', loopCondition
      ? `i=${i} 仍在字符串范围内；前 ${processed} 对字符已具有一致的一一映射。`
      : `i=${i} 已到字符串末尾；所有 ${processed} 对字符都保持相同重复模式。`);
    if (!loopCondition) break;

    loopCondition = undefined;
    a = input.s.charAt(index);
    append('read-s-char', `s.charAt(${index}) 得到 ${showChar(a)}；char 是基本值，数组下标使用其可打印 ASCII 码 ${a.charCodeAt(0)}。`);
    b = input.t.charAt(index);
    append('read-t-char', `t.charAt(${index}) 得到 ${showChar(b)}；本站输入限制保证字符码 ${b.charCodeAt(0)} 落在 0..127。`);

    seenA = seenS[a.charCodeAt(0)]!;
    seenB = seenT[b.charCodeAt(0)]!;
    samePattern = seenA === seenB;
    append(
      'check-pattern',
      `更新前，${showChar(a)} 最近位置标记为 ${seenA}，${showChar(b)} 最近位置标记为 ${seenB}。${samePattern ? '二者相同，可以让这对字符继续对应。' : '二者不同：一侧重复的位置与另一侧不一致，无法维持双向一一映射。'}`,
      index === predictionIndex ? 'pattern-check' : undefined,
    );
    if (!samePattern) {
      result = false;
      append('return-false', '最近位置模式不一致，返回 false；数组不再更新。', 'final-result');
      break;
    }

    seenS[a.charCodeAt(0)] = index + 1;
    append('record-s', `把 seenS[${a.charCodeAt(0)}] 写成 i+1=${index + 1}。使用一基位置后，0 可以专门表示“未见过”。`);
    seenT[b.charCodeAt(0)] = index + 1;
    processed = index + 1;
    append('record-t', `把 seenT[${b.charCodeAt(0)}] 也写成 ${index + 1}。前 ${processed} 对字符现在具有相同的出现位置模式。`);
  }

  if (result === undefined) {
    loopCondition = undefined; a = undefined; b = undefined; seenA = undefined; seenB = undefined; samePattern = undefined;
    result = true;
    append('return-true', '扫描结束仍未发现模式冲突，因此每个 s 字符恰好对应一个 t 字符，反向也唯一，返回 true。', 'final-result');
  }

  const finalOutput = { kind: 'boolean' as const, value: result };
  const trusted = expectedOutput('205', input);
  if (trusted.kind !== 'boolean' || trusted.value !== result) throw new Error('205 参考状态与独立可信期望不一致');
  return finalizeTrace({
    problemId: '205', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-pattern') {
    const value = snapshot.variables.find(item => item.name === '最近位置相同')?.value;
    if (value?.kind !== 'boolean') throw new Error('205 模式预测缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前两个字符在各自字符串中的最近位置标记相同吗？',
      answer: { kind: 'choice', optionId: value.value ? 'same' : 'different' },
      options: [{ id: 'same', label: '相同，可以继续' }, { id: 'different', label: '不同，应返回 false' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId !== 'return-true' && snapshot.stepId !== 'return-false') throw new Error('205 未知预测步骤');
  const value = snapshot.variables.find(item => item.name === '返回值')?.value;
  if (value?.kind !== 'boolean') throw new Error('205 结果预测缺少布尔状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：这两个字符串是否同构？',
    answer: { kind: 'choice', optionId: value.value ? 'yes' : 'no' },
    options: [{ id: 'yes', label: '是（true）' }, { id: 'no', label: '否（false）' }],
    explanation: snapshot.explanation,
  };
}
