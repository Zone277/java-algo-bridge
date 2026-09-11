import { LongestSubstringInputSchema, type LongestSubstringInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type State = Omit<ReferenceTrace['initialState'], 'snapshotId'>;

const visible = (char: string) => char === ' ' ? '空格 ␠' : `'${char}'`;

/** Preset reference model only. The window is always the processed, duplicate-free half-open interval. */
export async function buildReferenceTrace(rawInput: LongestSubstringInput, inputId: string): Promise<ReferenceTrace & { readonly finalOutput: { readonly kind: 'int'; readonly value: number } }> {
  const input = LongestSubstringInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length * 7 + 5 > 2000) throw new Error('参考模型超过 2000 快照上限；未截断生成轨迹。真实判题仍支持本站公布的字符串上限。');
  const lastSeen = new Map<string, number>();
  let mapCreated = false;
  let left: number | undefined;
  let right: number | undefined;
  let rightExclusive = 0;
  let best: number | undefined;
  let current: string | undefined;
  let condition: boolean | undefined;
  let seenBefore: boolean | undefined;
  let didReturn = false;
  const snapshots: Snapshot[] = [];

  const state = (explanation: string): State => {
    const windowLeft = left ?? 0;
    const variables: State['variables'][number][] = [{ name: 's', value: { kind: 'reference', objectId: 'source-string' } }];
    if (mapCreated) variables.push({ name: 'lastSeen', value: { kind: 'reference', objectId: 'last-seen' } });
    if (left !== undefined) variables.push({ name: 'left', value: { kind: 'int', value: left } });
    if (right !== undefined) variables.push({ name: 'right', value: { kind: 'int', value: right } });
    if (best !== undefined) variables.push({ name: 'best', value: { kind: 'int', value: best } });
    if (current !== undefined) variables.push({ name: 'current', value: { kind: 'char', value: current } });
    if (condition !== undefined) variables.push({ name: '循环条件', value: { kind: 'boolean', value: condition } });
    if (seenBefore !== undefined) variables.push({ name: '曾经出现', value: { kind: 'boolean', value: seenBefore } });
    if (didReturn && best !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: best } });
    const windowText = input.s.slice(windowLeft, rightExclusive);
    return {
      variables,
      structures: [
        { kind: 'window', id: 'source-string', text: input.s, left: windowLeft, rightExclusive, members: [...windowText].map(char => ({ kind: 'char' as const, value: char })) },
        ...(mapCreated ? [{ kind: 'map' as const, id: 'last-seen', entries: [...lastSeen.entries()].map(([char, index]) => ({ key: { kind: 'char' as const, value: char }, value: { kind: 'int' as const, value: index } })) }] : []),
      ],
      explanation,
    };
  };
  const initialState: ReferenceTrace['initialState'] = { snapshotId: 'initial', ...state(`方法收到字符串对象；当前连续窗口是空的 [0,0)。本站字符范围是可打印 ASCII，${input.s.includes(' ') ? '输入中的空格会显示为 ␠，它也是普通字符。' : '空格若出现也会作为普通字符参与窗口。'}`) };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  mapCreated = true;
  append('create-map', '创建 lastSeen 映射：键是 Character，值是 Integer。展示顺序由教学模型固定，不代表依赖 HashMap 的迭代顺序。');
  left = 0; append('init-left', 'left = 0，窗口左端从字符串首个下标开始。');
  best = 0; append('init-best', 'best = 0；尚未处理字符，空串答案也是 0。', input.s.length === 0 ? 'first-best' : undefined);
  right = 0;
  let firstBest = input.s.length === 0 ? false : true;
  let firstDuplicate = true;
  while (true) {
    current = undefined; seenBefore = undefined;
    condition = right < input.s.length;
    append('check-loop', condition ? `right=${right} 仍小于 s.length()=${input.s.length}，继续处理。` : `right=${right} 已到字符串末尾，循环结束。`);
    if (!condition) break;
    condition = undefined;
    current = input.s.charAt(right);
    append('read-char', `s.charAt(${right}) 得到 ${visible(current)}。char 是一个 UTF-16 代码单元；本站输入限定为可打印 ASCII。`);
    seenBefore = lastSeen.has(current);
    append('check-seen', `${visible(current)} ${seenBefore ? `曾在下标 ${lastSeen.get(current)} 出现` : '此前未出现'}。当前字符尚未纳入窗口。`);
    if (seenBefore) {
      const oldLeft = left;
      left = Math.max(left, lastSeen.get(current)! + 1);
      append('move-left', `left = max(${oldLeft}, ${lastSeen.get(current)} + 1) = ${left}。即使旧出现位置已在窗口左侧，也绝不让 left 回退。`, firstDuplicate ? 'first-duplicate-left' : undefined);
      firstDuplicate = false;
    }
    lastSeen.set(current, right);
    rightExclusive = right + 1;
    append('put-last', `记录 ${visible(current)} 最近出现于下标 ${right}；处理后窗口扩为 [${left},${rightExclusive})，内容为 ${JSON.stringify(input.s.slice(left, rightExclusive))}。`);
    best = Math.max(best, rightExclusive - left);
    append('update-best', `best = max(旧 best, 窗口长度 ${rightExclusive - left}) = ${best}。`, firstBest ? 'first-best' : undefined);
    firstBest = false;
    right++;
    current = undefined; seenBefore = undefined;
    append('move-right', `for 更新使 right 移到 ${right}；窗口仍表示刚处理完的连续区间。`);
  }
  condition = undefined;
  didReturn = true;
  append('return-best', `返回 best = ${best}。这是最长连续无重复子串的长度，不是全串不同字符种数。`, firstDuplicate ? 'first-duplicate-left' : undefined);
  const trace = await finalizeTrace({ problemId: '3', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: best! } });
  return trace as ReferenceTrace & { readonly finalOutput: { readonly kind: 'int'; readonly value: number } };
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'move-left') {
    const left = snapshot.variables.find(variable => variable.name === 'left')?.value;
    if (left?.kind !== 'int') throw new Error('预测检查点缺少 left');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测：遇到第一个重复字符后，left 应移动到哪个下标？', answer: { kind: 'int', value: left.value }, explanation: snapshot.explanation };
  }
  const name = snapshot.stepId === 'return-best' ? '返回值' : 'best';
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  if (value?.kind !== 'int') throw new Error(`预测检查点缺少 ${name}`);
  return { checkpointId: snapshot.checkpointId, prompt: snapshot.stepId === 'return-best' ? '先预测：没有重复移动可展示时，最终最长长度是多少？' : '先预测：处理第一个字符后，best 更新为多少？', answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
}
