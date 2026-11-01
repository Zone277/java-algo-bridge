import { LastWordInputSchema, expectedOutput, type LastWordInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Pure state model of the preset Java reference; it never interprets student Java. */
export async function buildReferenceTrace(raw: LastWordInput, inputId: string): Promise<ReferenceTrace> {
  const input = LastWordInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30) throw new Error('参考状态演示最多 30 字符；真实 Java 判题仍接受本站的 10000 字符上限');

  const snapshots: Snapshot[] = [];
  let i: number | undefined;
  let length: number | undefined;
  let skipCondition: boolean | undefined;
  let countCondition: boolean | undefined;
  let wordEnd = input.s.length;
  let countedLeft: number | undefined;
  let returned = false;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's（字符串内容）', value: { kind: 'string', value: input.s } },
    ];
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (length !== undefined) variables.push({ name: 'length', value: { kind: 'int', value: length } });
    if (skipCondition !== undefined) variables.push({ name: '尾部仍是空格（表达式）', value: { kind: 'boolean', value: skipCondition } });
    if (countCondition !== undefined) variables.push({ name: '当前仍是末词字母（表达式）', value: { kind: 'boolean', value: countCondition } });
    if (returned && length !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: length } });
    const left = countedLeft ?? input.s.length;
    const rightExclusive = wordEnd;
    const structures: State['structures'][number][] = [{
      kind: 'window', id: '已计数末词区间（教学辅助）', text: input.s,
      left, rightExclusive,
      members: [...new Set(input.s.slice(left, rightExclusive))].map(value => ({ kind: 'char' as const, value })),
    }];
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法还未执行。s 是 String 引用值的参数副本；空区间是教学辅助视图，不是 Java 新建数组或字符串。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('58 参考状态模型超过 2000 快照上限');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  i = input.s.length - 1;
  append('init-index', `i 设为 s.length()-1=${i}，指向最后一个字符。尚未读取或修改字符串。`);
  for (;;) {
    // Mirrors Java's short circuit: charAt is evaluated only for a valid index.
    skipCondition = i >= 0 && input.s.charAt(i) === ' ';
    append('check-trailing-space', skipCondition
      ? `i=${i} 处为空格；i 右侧已扫描部分全是尾部空格，准备左移。`
      : `i=${i} 处是最后一个单词的字母；尾部空格全部越过，不再左移空格。`,
    skipCondition ? undefined : 'after-trailing-skip');
    if (!skipCondition) break;
    skipCondition = undefined;
    i--;
    append('skip-trailing-space', `i 左移到 ${i}；刚越过的字符是尾部空格。`);
  }

  skipCondition = undefined;
  length = 0;
  wordEnd = i + 1;
  countedLeft = wordEnd;
  append('init-length', `length 明确初始化为 0；末词右边界在 ${wordEnd}，当前已计数字母区间为空。`);
  for (;;) {
    countCondition = i >= 0 && input.s.charAt(i) !== ' ';
    append('check-word-char', countCondition
      ? `i=${i} 仍指向末词字母；length=${length} 恰是右侧已计数字母数。`
      : `i=${i} 已到单词前的空格或越过左边界；length=${length} 是完整末词长度。`);
    if (!countCondition) break;
    countCondition = undefined;
    length++;
    countedLeft = i;
    append('count-word-char', `计入 s.charAt(${i})='${input.s.charAt(i)}'，length 增至 ${length}；已计数区间 [${countedLeft},${wordEnd})。`);
    i--;
    append('move-left', `i 左移到 ${i}，下一次只在下标有效时读取字符；已计数区间不变。`);
  }

  countCondition = undefined;
  returned = true;
  append('return-length', `返回末词字符数 ${length}；参数 s 指向的原 String 未被修改。`, 'final-length');
  const finalOutput = { kind: 'int' as const, value: length };
  const trusted = expectedOutput('58', input);
  if (trusted.kind !== 'int' || trusted.value !== length) throw new Error('58 参考状态模型与独立可信期望不一致');
  return finalizeTrace({ problemId: '58', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const isIndex = snapshot.stepId === 'check-trailing-space';
  if (!isIndex && snapshot.stepId !== 'return-length') throw new Error('58 未知预测步骤');
  const name = isIndex ? 'i' : '返回值';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error('58 预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: isIndex ? '先预测，再揭示：跳过末尾所有空格后，i 指向哪个 0 起始索引？' : '先预测，再揭示：最后一个单词有多少个字母？',
    answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation,
  };
}
