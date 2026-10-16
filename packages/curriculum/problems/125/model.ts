import {
  ValidPalindromeInputSchema, expectedOutput,
  type ReferencePrediction, type ReferenceTrace, type ValidPalindromeInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type State = Omit<ReferenceTrace['initialState'], 'snapshotId'>;
const isAsciiAlphanumeric = (char: string): boolean => /^[A-Za-z0-9]$/.test(char);
const visible = (char: string): string => char === ' ' ? '空格 ␠' : JSON.stringify(char);

/** Deterministic teaching model of the fixed reference algorithm, never student-Java tracing. */
export async function buildReferenceTrace(rawInput: ValidPalindromeInput, inputId: string): Promise<ReferenceTrace> {
  const input = ValidPalindromeInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30) throw new Error('参考状态演示最多支持 30 个字符；真实判题仍接受本站公布的更长输入');

  let left: number | undefined;
  let right: number | undefined;
  let condition: boolean | undefined;
  let pairEqual: boolean | undefined;
  let result: boolean | undefined;
  let firstPairPending = true;
  const snapshots: Snapshot[] = [];
  const state = (explanation: string): State => {
    const variables: State['variables'][number][] = [
      { name: 's', value: { kind: 'reference', objectId: 'source-string' } },
      { name: '文本内容', value: { kind: 'string', value: input.s } },
    ];
    if (left !== undefined) variables.push({ name: 'left', value: { kind: 'int', value: left } });
    if (right !== undefined) variables.push({ name: 'right', value: { kind: 'int', value: right } });
    if (condition !== undefined) variables.push({ name: '当前条件', value: { kind: 'boolean', value: condition } });
    if (pairEqual !== undefined) variables.push({ name: '有效字符相同', value: { kind: 'boolean', value: pairEqual } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });
    return {
      variables,
      structures: [{ kind: 'window', id: 'source-string', text: input.s, left: left ?? 0, rightExclusive: right === undefined ? input.s.length : right + 1, members: [] }],
      explanation,
    };
  };
  const initialState: ReferenceTrace['initialState'] = {
    snapshotId: 'initial',
    ...state('方法收到 String 引用值的副本；下方是原文本的教学区间，不表示 JVM 字符串对象的内存布局。左右指针尚未初始化。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string): void => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限；未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation), ...(checkpointId ? { checkpointId } : {}),
    });
  };

  left = 0;
  append('init-left', 'left = 0，先指向原字符串的第一个字符。');
  right = input.s.length - 1;
  append('init-right', `right = s.length() - 1 = ${right}，先指向原字符串末尾。`, '125-start-right');
  while (true) {
    condition = left < right;
    pairEqual = undefined;
    append('outer-loop', condition ? `[${left},${right}] 尚有两个可供扫描的端点，继续。` : `left=${left}、right=${right} 已相遇或交错，外层循环结束。`);
    if (!condition) break;

    while (true) {
      condition = left < right && !isAsciiAlphanumeric(input.s.charAt(left));
      append('skip-left-check', condition ? `左侧 ${visible(input.s.charAt(left))} 非字母数字，需要跳过。` : `左侧当前字符无需再跳过，或指针已相遇。`);
      if (!condition) break;
      left++;
      append('skip-left', `left 前进到 ${left}；刚越过的非字母数字不参加回文比较。`);
    }
    while (true) {
      condition = left < right && !isAsciiAlphanumeric(input.s.charAt(right));
      append('skip-right-check', condition ? `右侧 ${visible(input.s.charAt(right))} 非字母数字，需要跳过。` : `右侧当前字符无需再跳过，或指针已相遇。`);
      if (!condition) break;
      right--;
      append('skip-right', `right 后退到 ${right}；刚越过的非字母数字不参加回文比较。`);
    }

    condition = left >= right;
    append('cross-check', condition ? '两指针相遇；没有一对新的有效字符需要比较。' : '两端均仍有可比较的有效字符。');
    if (condition) {
      append('break', '跳出循环；之前的有效字符配对均相同。', firstPairPending ? '125-first-pair' : undefined);
      break;
    }

    pairEqual = input.s.charAt(left).toLowerCase() === input.s.charAt(right).toLowerCase();
    condition = pairEqual;
    append('compare', `将 ${visible(input.s.charAt(left))} 和 ${visible(input.s.charAt(right))} 转小写后比较：${pairEqual ? '相同' : '不同'}。`, firstPairPending ? '125-first-pair' : undefined);
    firstPairPending = false;
    if (!pairEqual) {
      result = false;
      append('return-false', '发现一对有效字符不同，立即返回 false。', '125-result');
      break;
    }
    left++;
    condition = undefined;
    pairEqual = undefined;
    append('advance-left', `左侧有效字符已经匹配，left 前进到 ${left}。`);
    right--;
    append('advance-right', `右侧有效字符已经匹配，right 后退到 ${right}。`);
  }
  if (result === undefined) {
    condition = undefined;
    pairEqual = undefined;
    result = true;
    append('return-true', '所有有效字符的镜像配对都相同，返回 true；若没有有效字符，也成立。', '125-result');
  }
  const finalOutput = expectedOutput('125', input);
  if (finalOutput.kind !== 'boolean' || finalOutput.value !== result) throw new Error('125 状态模型与可信期望不一致');
  return finalizeTrace({ problemId: '125', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'init-right') {
    const right = snapshot.variables.find(variable => variable.name === 'right')?.value;
    if (right?.kind !== 'int') throw new Error('右指针预测缺少状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测：right 初始化后指向哪个下标？', answer: { kind: 'int', value: right.value }, explanation: snapshot.explanation };
  }
  if (snapshot.stepId === 'compare' || snapshot.stepId === 'break') {
    const equal = snapshot.variables.find(variable => variable.name === '有效字符相同')?.value;
    if (snapshot.stepId === 'compare' && equal?.kind !== 'boolean') throw new Error('首对比较预测缺少状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测：跳过两侧标点后，第一次有效字符配对会怎样？',
      answer: { kind: 'choice', optionId: snapshot.stepId === 'break' ? 'none' : equal?.kind === 'boolean' && equal.value ? 'same' : 'different' },
      options: [{ id: 'same', label: '相同' }, { id: 'different', label: '不同' }, { id: 'none', label: '没有可比字符' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '返回值')?.value;
  if (value?.kind !== 'boolean') throw new Error('返回预测缺少状态');
  return {
    checkpointId: snapshot.checkpointId, prompt: '先预测：最终返回 true 还是 false？',
    answer: { kind: 'choice', optionId: value.value ? 'palindrome' : 'different' },
    options: [{ id: 'palindrome', label: 'true' }, { id: 'different', label: 'false' }], explanation: snapshot.explanation,
  };
}
