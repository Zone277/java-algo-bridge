import {
  LinkedListCycleInputSchema,
  expectedOutput,
  type LinkedListCycleInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type NodeState = { id: string; value: number; nextId: string | null };

/** Floyd 参考解法的教学状态。它不会读取或解释学生 Java 源码。 */
export async function buildReferenceTrace(rawInput: LinkedListCycleInput, inputId: string): Promise<ReferenceTrace> {
  const input = LinkedListCycleInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.head.length > 30) throw new Error('环形链表参考演示最多 30 个节点；真实 Java 判题仍支持本站 1000 节点上限');
  const nodes: NodeState[] = input.head.map((value, index) => ({
    id: `h${index}`,
    value,
    nextId: index + 1 < input.head.length ? `h${index + 1}` : input.pos === -1 ? null : `h${input.pos}`,
  }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const bindings: Record<string, string | null> = { head: nodes[0]?.id ?? null };
  const snapshots: Snapshot[] = [];
  let fastNonNull: boolean | undefined;
  let fastNextNonNull: boolean | undefined;
  let sameNode: boolean | undefined;
  let result: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => ({
    variables: [
      ...Object.entries(bindings).map(([name, objectId]) => ({ name, value: { kind: 'reference' as const, objectId } })),
      ...(fastNonNull === undefined ? [] : [{ name: 'fast != null', value: { kind: 'boolean' as const, value: fastNonNull } }]),
      ...(fastNextNonNull === undefined ? [] : [{ name: 'fast.next != null', value: { kind: 'boolean' as const, value: fastNextNonNull } }]),
      ...(sameNode === undefined ? [] : [{ name: 'slow == fast', value: { kind: 'boolean' as const, value: sameNode } }]),
      ...(result === undefined ? [] : [{ name: '返回值', value: { kind: 'boolean' as const, value: result } }]),
    ],
    structures: [{
      kind: 'list', id: 'cycle-graph', nodes: nodes.map(node => ({ ...node })),
      bindings: Object.entries(bindings).map(([name, objectId]) => ({ name, objectId })),
    }],
    explanation,
  });
  const initialState: State = {
    snapshotId: 'initial',
    ...state(nodes.length === 0
      ? '可信平台根据输入建立空链表，head 为 null；pos 不是学生方法参数。'
      : `可信平台已建立 ${nodes.length} 个节点对象；h0、h1…是稳定教学 ID。${input.pos === -1 ? '尾节点 next 为 null。' : `尾节点 next 指向 h${input.pos}，形成环。`}值相同的节点仍是不同对象。`),
  };
  const append = (stepId: string, explanation: string, checkpoint?: string): void => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpoint ? { checkpointId: checkpoint } : {}),
    });
  };
  const nextOf = (id: string): string | null => {
    const node = byId.get(id);
    if (!node) throw new Error(`参考链表包含未知节点：${id}`);
    return node.nextId;
  };

  bindings.slow = bindings.head!;
  append('init-slow', `slow 复制 head 的引用值 ${bindings.slow ?? 'null'}；没有复制节点对象，也没有修改 next。`);
  bindings.fast = bindings.head!;
  append('init-fast', `fast 也复制 head 的引用值 ${bindings.fast ?? 'null'}。slow 与 fast 可以同时引用同一对象。`);

  let iterations = 0;
  while (true) {
    fastNextNonNull = undefined;
    sameNode = undefined;
    fastNonNull = bindings.fast !== null;
    append('check-fast', fastNonNull
      ? `fast 当前引用 ${bindings.fast}，第一个安全条件为 true；Java 才会继续读取 fast.next。`
      : 'fast 为 null，第一个安全条件为 false；&& 短路，不读取 fast.next，循环结束。',
    iterations === 0 ? 'first-fast-safety' : undefined);
    if (!fastNonNull) break;

    fastNextNonNull = nextOf(bindings.fast!) !== null;
    append('check-fast-next', fastNextNonNull
      ? `${bindings.fast}.next 指向 ${nextOf(bindings.fast!)!}，第二个安全条件为 true，可以安全走两步。`
      : `${bindings.fast}.next 为 null，fast.next.next 不可读取；循环结束且不存在环。`);
    if (!fastNextNonNull) break;

    fastNonNull = undefined;
    fastNextNonNull = undefined;
    const oldSlow = bindings.slow;
    if (oldSlow === null) throw new Error('Floyd 模型不应在循环中得到 null slow');
    bindings.slow = nextOf(oldSlow);
    append('move-slow', `slow 从 ${oldSlow} 沿一个 next 移到 ${bindings.slow ?? 'null'}。这里只改变变量绑定，所有对象与 next 字段保持不变。`);

    const oldFast = bindings.fast!;
    const firstHop = nextOf(oldFast);
    if (firstHop === null) throw new Error('已通过 fast.next 安全检查却得到 null');
    bindings.fast = nextOf(firstHop);
    append('move-fast', `fast 从 ${oldFast} 先到 ${firstHop}，再到 ${bindings.fast ?? 'null'}；表达式 fast.next.next 一次完成两跳。`);

    sameNode = bindings.slow === bindings.fast;
    append('compare-runners', sameNode
      ? `slow 与 fast 都引用 ${bindings.slow ?? 'null'}，比较的是对象身份而不是 val；两者在环内相遇。`
      : `slow 引用 ${bindings.slow ?? 'null'}，fast 引用 ${bindings.fast ?? 'null'}，对象身份不同，继续下一轮。`);
    if (sameNode) {
      result = true;
      append('return-true', '两个变量引用同一个节点对象，参考方法返回 true。变量离开方法不表示链表对象立即被回收。', 'final-result');
      break;
    }
    iterations++;
    if (iterations > nodes.length * 2 + 1) throw new Error('Floyd 参考模型未按预期终止');
  }

  if (result === undefined) {
    sameNode = undefined;
    result = false;
    append('return-false', 'fast 已到 null 或 fast.next 为 null，快指针沿 next 走出了链尾，因此链中不存在环，返回 false。', 'final-result');
  }
  const oracle = expectedOutput('141', input);
  if (oracle.kind !== 'boolean' || oracle.value !== result) throw new Error('Floyd 参考模型与独立可信 next 图遍历结果不一致');
  return finalizeTrace({
    problemId: '141', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: oracle,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-fast') {
    const value = snapshot.variables.find(variable => variable.name === 'fast != null')?.value;
    if (value?.kind !== 'boolean') throw new Error('快指针安全检查点缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：第一次计算 while 条件时，fast != null 是否成立？',
      answer: { kind: 'choice', optionId: value.value ? 'non-null' : 'is-null' },
      options: [{ id: 'non-null', label: '成立，继续检查 fast.next' }, { id: 'is-null', label: '不成立，&& 短路' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'return-true' || snapshot.stepId === 'return-false') {
    const value = snapshot.variables.find(variable => variable.name === '返回值')?.value;
    if (value?.kind !== 'boolean') throw new Error('最终预测检查点缺少布尔结果');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：参考方法最终会判定存在环吗？',
      answer: { kind: 'choice', optionId: value.value ? 'cycle' : 'no-cycle' },
      options: [{ id: 'cycle', label: '有环，返回 true' }, { id: 'no-cycle', label: '无环，返回 false' }],
      explanation: snapshot.explanation,
    };
  }
  throw new Error(`未知的 141 预测步骤：${snapshot.stepId}`);
}
