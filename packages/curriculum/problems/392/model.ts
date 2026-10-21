import { IsSubsequenceInputSchema, expectedOutput, type IsSubsequenceInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
const S_ID = 's 已匹配前缀（教学标记）';
const T_ID = 't 已比较前缀（不代表全部选中）';

/** A preset greedy model, never an interpreter for student Java. */
export async function buildReferenceTrace(raw: IsSubsequenceInput, inputId: string): Promise<ReferenceTrace> {
  const input = IsSubsequenceInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30 || input.t.length > 30) throw new Error('参考状态演示的 s 和 t 各最多支持 30 字符；真实判题仍支持 s 100、t 10000 字符');
  let i: number | undefined;
  let j: number | undefined;
  let condition: boolean | undefined;
  let equal: boolean | undefined;
  let result: boolean | undefined = undefined;
  let scanned = 0;
  const positions: number[] = [];
  const snapshots: Snapshot[] = [];
  const window = (id: string, text: string, end: number) => ({
    kind: 'window' as const, id, text, left: 0, rightExclusive: end,
    members: [...new Set(text.slice(0, end))].map(value => ({ kind: 'char' as const, value })),
  });
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's', value: { kind: 'reference', objectId: S_ID } },
      { name: 't', value: { kind: 'reference', objectId: T_ID } },
      { name: '已比较 t 字符数（教学）', value: { kind: 'int', value: scanned } },
    ];
    if (i !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: i } });
    if (j !== undefined) variables.push({ name: 'j', value: { kind: 'int', value: j } });
    if (condition !== undefined) variables.push({ name: '循环条件（表达式）', value: { kind: 'boolean', value: condition } });
    if (equal !== undefined) variables.push({ name: '本次比较是否相等（教学记录）', value: { kind: 'boolean', value: equal } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });
    return {
      variables,
      structures: [
        window(S_ID, input.s, i ?? 0), window(T_ID, input.t, scanned),
        { kind: 'map', id: '实际匹配位置：s 下标 → t 下标（教学记录，非 Java Map）', entries: positions.map((position, index) => ({ key: { kind: 'int', value: index }, value: { kind: 'int', value: position } })) },
      ], explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state('参数按值传递 String 引用值；字符串不被修改。两条高亮只是已匹配/已比较前缀，t 高亮中的字符不一定都被选中。下方位置表才记录实际选择，字符集合只显示前缀出现过的字符。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  i = 0; append('init-i', 'i=0：还没有匹配任何 s 字符。');
  j = 0; append('init-j', 'j=0：准备扫描 t 的首个位置；空串不会访问 charAt(0)。');
  let firstCheck = true;
  while (true) {
    condition = i < input.s.length && j < input.t.length;
    equal = undefined;
    append('check-loop', condition ? `i=${i} 与 j=${j} 均未到末尾，可以读取两个 char。` : i === input.s.length ? `i=${i} 已等于 s.length()；&& 左侧为 false，右侧无需求值，直接结束。` : `t 已扫描完，仍有 s 字符没匹配，结束循环。`, firstCheck ? 'first-condition' : undefined);
    firstCheck = false;
    if (!condition) break;
    condition = undefined;
    equal = input.s.charAt(i) === input.t.charAt(j);
    scanned = j + 1;
    append('compare', `比较 s[${i}]='${input.s[i]}' 与 t[${j}]='${input.t[j]}'：${equal ? '相等，接下来接受此位置' : '不同，只跳过当前 t 字符'}。t 高亮到 ${scanned} 只表示已经比较。`);
    if (equal) {
      positions.push(j);
      i++;
      append('match', `选中 t[${j}]，i 增加到 ${i}；它是上一个匹配位置之后最早可用的字符。j 尚未前进，位置表已记录本次选择。`);
    }
    j++;
    equal = undefined;
    append('advance-j', `j 增加到 ${j}，无论是否匹配都不再复用旧位置。循环边界上，s[0..${i}) 是 t[0..${j}) 能匹配的最长 s 前缀。`);
  }
  result = i === input.s.length;
  condition = undefined;
  append('return-result', `i=${i}，s.length()=${input.s.length}，返回 ${result}。${result ? '所有 s 字符都按相对顺序选出；不要求连续。' : 't 已耗尽，但 s 尚未全部匹配。'}`, 'final-result');
  const finalOutput = { kind: 'boolean' as const, value: result };
  const expected = expectedOutput('392', input);
  if (expected.kind !== 'boolean' || expected.value !== result) throw new Error('参考模型与独立字符位置判定不一致');
  return finalizeTrace({ problemId: '392', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const first = snapshot.stepId === 'check-loop';
  const value = snapshot.variables.find(variable => variable.name === (first ? '循环条件（表达式）' : '返回值'))?.value;
  if (value?.kind !== 'boolean') throw new Error('子序列预测缺少布尔值');
  return { checkpointId: snapshot.checkpointId, prompt: first ? '先预测，再揭示：第一次 while 条件为 true 还是 false？' : '先预测，再揭示：能按顺序选出整个 s 吗？返回 true 还是 false？', answer: { kind: 'text', value: String(value.value) }, explanation: snapshot.explanation };
}
