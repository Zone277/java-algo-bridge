import {
  HappyNumberInputSchema,
  expectedOutput,
  type HappyNumberInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Only the preset Java reference algorithm is modeled; no student source is interpreted here. */
export async function buildReferenceTrace(raw: HappyNumberInput, inputId: string): Promise<ReferenceTrace> {
  const input = HappyNumberInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');

  const seen = new Set<number>();
  const snapshots: Snapshot[] = [];
  let n = input.n;
  let setInitialized = false;
  let roundStart: number | undefined;
  let sum: number | undefined;
  let digit: number | undefined;
  let outerCondition: boolean | undefined;
  let seenMembership: boolean | undefined;
  let digitLoopCondition: boolean | undefined;
  let result: boolean | undefined = undefined;
  let digitsRead: number[] = [];

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'n', value: { kind: 'int', value: n } }];
    if (setInitialized) variables.push({ name: 'seen', value: { kind: 'reference', objectId: 'seen' } });
    if (roundStart !== undefined) variables.push({ name: '本轮起点（教学辅助）', value: { kind: 'int', value: roundStart } });
    if (sum !== undefined) variables.push({ name: 'sum', value: { kind: 'int', value: sum } });
    if (digit !== undefined) variables.push({ name: 'digit', value: { kind: 'int', value: digit } });
    if (outerCondition !== undefined) variables.push({ name: '外层条件成立（表达式）', value: { kind: 'boolean', value: outerCondition } });
    if (seenMembership !== undefined) variables.push({ name: '当前数字已见（表达式）', value: { kind: 'boolean', value: seenMembership } });
    if (digitLoopCondition !== undefined) variables.push({ name: '内层条件成立（表达式）', value: { kind: 'boolean', value: digitLoopCondition } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'boolean', value: result } });

    const structures: State['structures'][number][] = [];
    if (setInitialized) structures.push({
      kind: 'map', id: 'seen',
      entries: [...seen].map(value => ({ key: { kind: 'int', value }, value: { kind: 'boolean', value: true } })),
    });
    if (sum !== undefined) structures.push({
      kind: 'array', id: 'digits-read', values: [...digitsRead],
      indices: digitsRead.length === 0 ? [] : [{ name: '刚取出的位（教学辅助）', index: digitsRead.length - 1 }],
    });
    return { variables, structures, explanation };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state('参数 n 是 int 基本值，方法收到它的值副本。参考代码还没有创建 seen；digits-read 仅是演示辅助视图，不是 Java 数组。'),
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

  setInitialized = true;
  append('init-set', '创建空 HashSet。seen 用键到 true 的表格展示成员；true 仅为成员标记，不是 Java Map 或对象身份。');

  let firstCondition = true;
  while (true) {
    // Java's && short-circuits: seen.contains(n) is not called for n == 1.
    seenMembership = n === 1 ? undefined : seen.has(n);
    outerCondition = n !== 1 && !seenMembership;
    roundStart = undefined;
    sum = undefined;
    digit = undefined;
    digitLoopCondition = undefined;
    digitsRead = [];
    append(
      'check-outer',
      n === 1
        ? '先判断 n != 1 为 false，&& 短路，不再调用 seen.contains(n)；不会进入循环。'
        : `检查 n=${n}：seen ${seenMembership ? '已有' : '尚无'}该数字，${outerCondition ? '继续计算下一轮' : '检测到非 1 循环并停止'}。`,
      firstCondition ? 'first-loop-decision' : undefined,
    );
    firstCondition = false;
    if (!outerCondition) break;

    if (seen.size >= 30) throw new Error('参考状态演示的已见数字超过 30 项；未生成不完整的轨迹');
    roundStart = n;
    seen.add(n);
    outerCondition = undefined;
    seenMembership = undefined;
    append('record-current', `把本轮起点 ${roundStart} 加入 seen；它只记录已经开始处理的不同数字。`);

    sum = 0;
    append('init-sum', '声明本轮局部变量 sum=0。digits-read 是演示辅助视图，按个位到高位列出已取出的数字。');
    while (true) {
      digit = undefined;
      digitLoopCondition = n > 0;
      append('check-digit-loop', `判断 n>0：当前 n=${n}，${digitLoopCondition ? '仍有十进制位需要处理' : '本轮数字的所有位已处理'}。`);
      if (!digitLoopCondition) break;

      digitLoopCondition = undefined;
      digit = n % 10;
      digitsRead.push(digit);
      append('read-digit', `n % 10 取出个位 ${digit}；这是 int 算术，不创建数字对象。`);

      sum += digit * digit;
      append('add-square', `把 ${digit}²=${digit * digit} 加到 sum；目前的 sum=${sum}。`);

      n = Math.floor(n / 10);
      append('drop-digit', `n /= 10 丢弃刚处理的个位，当前 n=${n}；Java 对非负 int 的除法也舍去小数部分。`);
    }

    digitLoopCondition = undefined;
    n = sum;
    append('set-next', `本轮从 ${roundStart} 算得各位平方和 ${sum}，将 n 赋为它；下次判断是否到 1 或已见过。`);
  }

  outerCondition = undefined;
  seenMembership = undefined;
  result = n === 1;
  append('return-result', result ? 'n 已到 1，返回 true。' : `n=${n} 再次出现而不是 1，返回 false；继续下去只会重复同一循环。`, 'final-result');

  const expected = expectedOutput('202', input);
  if (expected.kind !== 'boolean' || expected.value !== result) throw new Error('202 参考状态模型与独立可信期望不一致');
  return finalizeTrace({
    problemId: '202', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: result },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;

  const isFirst = snapshot.stepId === 'check-outer';
  const variable = snapshot.variables.find(item => item.name === (isFirst ? '外层条件成立（表达式）' : '返回值'))?.value;
  if (variable?.kind !== 'boolean') throw new Error('202 预测检查点缺少布尔状态');
  const number = snapshot.variables.find(item => item.name === 'n')?.value;
  return {
    checkpointId: snapshot.checkpointId,
    prompt: isFirst
      ? `先预测，再揭示：当前 n=${number?.kind === 'int' ? number.value : '?'}，外层 while 会进入本轮计算吗？`
      : '先预测，再揭示：这条数字轨迹最终到 1，还是遇到非 1 的重复状态？',
    answer: { kind: 'choice', optionId: isFirst ? (variable.value ? 'enter' : 'skip') : (variable.value ? 'happy' : 'cycle') },
    options: isFirst
      ? [{ id: 'enter', label: '进入循环' }, { id: 'skip', label: '不进入循环' }]
      : [{ id: 'happy', label: '到 1，返回 true' }, { id: 'cycle', label: '非 1 循环，返回 false' }],
    explanation: snapshot.explanation,
  };
}
