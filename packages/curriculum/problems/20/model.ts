import {
  ValidParenthesesInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type ValidParenthesesInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

const OPENINGS = '([{';
const MATCHING: Readonly<Record<string, string>> = Object.freeze({ ')': '(', ']': '[', '}': '{' });

/** Pure model of the preset reference algorithm. It never reads or interprets student Java. */
export async function buildReferenceTrace(raw: ValidParenthesesInput, inputId: string): Promise<ReferenceTrace> {
  const input = ValidParenthesesInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.s.length > 30) throw new Error('参考演示最多显示 30 个字符；真实判题上限仍为 10000 个字符');

  // The array is always bottom-to-top, so the logical top is the last item.
  const stack: string[] = [];
  const snapshots: Snapshot[] = [];
  let initialized = false;
  let index: number | undefined;
  let current: string | undefined;
  let isOpening: boolean | undefined;
  let isEmpty: boolean | undefined;
  let popped: string | undefined;
  let matches: boolean | undefined;
  let result: boolean | undefined;
  let phase = '尚未开始';
  let firstStackActionPending = true;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 's', value: { kind: 'string', value: input.s } },
      { name: 'length', value: { kind: 'int', value: input.s.length } },
      { name: '阶段', value: { kind: 'string', value: phase } },
    ];
    if (initialized) variables.push({ name: 'stack', value: { kind: 'reference', objectId: 'unmatched-opens' } });
    if (index !== undefined) variables.push({ name: 'i', value: { kind: 'int', value: index } });
    if (current !== undefined) variables.push({ name: 'current', value: { kind: 'char', value: current } });
    if (isOpening !== undefined) variables.push({ name: '是左括号', value: { kind: 'boolean', value: isOpening } });
    if (isEmpty !== undefined) variables.push({ name: '栈为空', value: { kind: 'boolean', value: isEmpty } });
    if (popped !== undefined) variables.push({ name: 'open', value: { kind: 'char', value: popped } });
    if (matches !== undefined) variables.push({ name: '类型匹配', value: { kind: 'boolean', value: matches } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });
    return {
      variables,
      structures: [{
        kind: 'stack',
        id: 'unmatched-opens',
        items: stack.map(value => ({ kind: 'char' as const, value })),
        topIndex: stack.length === 0 ? null : stack.length - 1,
      }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到 String 引用值；栈尚未初始化，字符也尚未扫描。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  initialized = true;
  phase = '维护未匹配左括号栈';
  append('init-stack', '创建空栈：它只保存已读前缀中还没有右括号配对的左括号。');

  for (index = 0; index < input.s.length; index++) {
    current = undefined;
    isOpening = undefined;
    isEmpty = undefined;
    popped = undefined;
    matches = undefined;
    append('check-char', `i=${index} 小于 length，还有一个字符待处理。`);

    current = input.s.charAt(index);
    append('read-char', `charAt(${index}) 取得字符 '${current}'；char 是单个 UTF-16 代码单元的基本类型。`);

    isOpening = OPENINGS.includes(current);
    append('check-opening', `'${current}'${isOpening ? '是左括号，需要等待未来的右括号' : '是右括号，必须和当前栈顶配对'}。`);

    if (isOpening) {
      stack.push(current);
      append(
        'push-open',
        `将 '${current}' 压入栈顶；现在栈从底到顶为 ${stack.join(' ')}。`,
        firstStackActionPending ? 'first-stack-action' : undefined,
      );
      firstStackActionPending = false;
      continue;
    }

    isEmpty = stack.length === 0;
    append(
      'check-empty',
      isEmpty
        ? `遇到 '${current}' 时栈已空，没有左括号可配对；不能调用 pop。`
        : `遇到 '${current}' 时栈非空，可以安全弹出最近的未匹配左括号。`,
      firstStackActionPending ? 'first-stack-action' : undefined,
    );
    firstStackActionPending = false;
    if (isEmpty) {
      result = false;
      phase = '结束：右括号无对应左括号';
      append('return-empty-error', '栈空却遇到右括号，立即返回 false；先判空避免 pop 抛异常。', 'final-result');
      return finish(input, inputId, initialState, snapshots);
    }

    popped = stack.pop();
    append('pop-open', `弹出栈顶 '${popped}'；它是距离当前右括号最近的未匹配左括号。`);

    matches = popped === MATCHING[current];
    append(
      'compare-pair',
      matches
        ? `'${popped}' 与 '${current}' 类型一致，这一对被消解；栈仍是剩余未匹配左括号。`
        : `'${popped}' 与 '${current}' 类型不一致，嵌套顺序已被破坏。`,
    );
    if (!matches) {
      result = false;
      phase = '结束：括号类型不匹配';
      append('return-mismatch', '最近左括号的类型不匹配当前右括号，返回 false。', 'final-result');
      return finish(input, inputId, initialState, snapshots);
    }
  }

  current = undefined;
  isOpening = undefined;
  isEmpty = undefined;
  popped = undefined;
  matches = undefined;
  append('check-char', `i=${index} 等于 length，所有字符已处理。`);
  result = stack.length === 0;
  phase = result ? '结束：全部配对' : '结束：仍有左括号';
  append(
    'return-final',
    result
      ? '扫描结束且栈空，每个左括号都按正确类型与顺序配对，返回 true。'
      : `扫描结束但栈仍有 ${stack.length} 个左括号，返回 false。`,
    'final-result',
  );
  return finish(input, inputId, initialState, snapshots);
}

function finish(
  input: ValidParenthesesInput,
  inputId: string,
  initialState: State,
  snapshots: Snapshot[],
): Promise<ReferenceTrace> {
  return finalizeTrace({
    problemId: '20',
    algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE,
    inputId,
    input,
    initialState,
    snapshots,
    finalOutput: expectedOutput('20', input),
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;

  if (snapshot.stepId === 'push-open') {
    const stack = snapshot.structures.find(structure => structure.kind === 'stack');
    const top = stack?.kind === 'stack' && stack.topIndex !== null ? stack.items[stack.topIndex] : undefined;
    if (top?.kind !== 'char') throw new Error('压栈预测缺少 char 栈顶状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：第一次栈操作后，栈顶字符是什么？',
      answer: { kind: 'text', value: top.value },
      explanation: snapshot.explanation,
    };
  }

  if (snapshot.stepId === 'check-empty') {
    const empty = snapshot.variables.find(variable => variable.name === '栈为空')?.value;
    if (empty?.kind !== 'boolean') throw new Error('空栈预测缺少 boolean 状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：遇到这个右括号时，算法应立即停止，还是安全弹栈？',
      answer: { kind: 'choice', optionId: empty.value ? 'stop' : 'pop' },
      options: [
        { id: 'stop', label: '栈空，立即返回 false' },
        { id: 'pop', label: '栈非空，弹出栈顶并比较类型' },
      ],
      explanation: snapshot.explanation,
    };
  }

  const result = snapshot.variables.find(variable => variable.name === '返回值')?.value;
  if (result?.kind !== 'boolean') throw new Error('终态预测缺少 boolean 返回值');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：完整方法对这个输入返回什么？',
    answer: { kind: 'choice', optionId: result.value ? 'true' : 'false' },
    options: [{ id: 'true', label: 'true：有效' }, { id: 'false', label: 'false：无效' }],
    explanation: snapshot.explanation,
  };
}
