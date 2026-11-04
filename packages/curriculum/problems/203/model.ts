import {
  RemoveLinkedListElementsInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type RemoveLinkedListElementsInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type State = Omit<ReferenceTrace['initialState'], 'snapshotId'>;
type NodeState = { id: string; value: number; nextId: string | null };

/** 预置参考解法的教学模型；不读取或解释学生 Java。 */
export async function buildReferenceTrace(
  rawInput: RemoveLinkedListElementsInput,
  inputId: string,
): Promise<ReferenceTrace> {
  const input = RemoveLinkedListElementsInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.head.length > 30) throw new Error('移除链表元素参考演示最多 30 个节点；真实 Java 判题仍支持本站 10000 节点上限');

  const originalNodes: NodeState[] = input.head.map((value, index) => ({
    id: `h${index}`,
    value,
    nextId: index + 1 < input.head.length ? `h${index + 1}` : null,
  }));
  const dummy: NodeState = { id: 'd0', value: 0, nextId: null };
  let dummyCreated = false;
  const bindings: Record<string, string | null> = { head: originalNodes[0]?.id ?? null };
  const snapshots: Snapshot[] = [];
  let hasCandidate: boolean | undefined;
  let shouldRemove: boolean | undefined;

  const allNodes = () => dummyCreated ? [dummy, ...originalNodes] : [...originalNodes];
  const node = (id: string): NodeState => {
    const found = allNodes().find(item => item.id === id);
    if (!found) throw new Error(`参考模型遇到未知节点：${id}`);
    return found;
  };
  const state = (explanation: string): State => ({
    variables: [
      { name: 'val', value: { kind: 'int', value: input.val } },
      ...Object.entries(bindings).map(([name, objectId]) => ({ name, value: { kind: 'reference' as const, objectId } })),
      ...(hasCandidate === undefined ? [] : [{ name: 'curr.next != null', value: { kind: 'boolean' as const, value: hasCandidate } }]),
      ...(shouldRemove === undefined ? [] : [{ name: 'curr.next.val == val', value: { kind: 'boolean' as const, value: shouldRemove } }]),
    ],
    structures: [{
      kind: 'list', id: 'filter-graph', nodes: allNodes().map(item => ({ ...item })),
      bindings: Object.entries(bindings).map(([name, objectId]) => ({ name, objectId })),
    }],
    explanation,
  });
  const initialState: ReferenceTrace['initialState'] = {
    snapshotId: 'initial',
    ...state(originalNodes.length === 0
      ? `输入链为空，head 为 null；val=${input.val} 是 int 基本值。尚未创建辅助节点。`
      : `可信平台建立 h0…h${originalNodes.length - 1}。h* 是稳定教学 ID，不是内存地址；值相同仍是不同对象。head 收到 h0 的引用值副本，val=${input.val}。`),
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

  dummyCreated = true;
  bindings.dummy = 'd0';
  append('create-dummy', '创建辅助节点对象 d0。它让头节点删除和中间节点删除使用同一种写法；d0 不属于输入链的结果值序列。');
  dummy.nextId = bindings.head!;
  append('link-head', `修改 d0.next，使它引用 ${dummy.nextId ?? 'null'}。这是对象字段修改；head 变量绑定没有改变。`);
  bindings.curr = bindings.dummy!;
  append('init-curr', 'curr 复制 dummy 的引用值 d0，没有复制节点对象。curr 始终引用已处理保留前缀的最后一个节点。');

  let firstDecision = true;
  let firstAction = true;
  while (true) {
    shouldRemove = undefined;
    const curr = node(bindings.curr!);
    hasCandidate = curr.nextId !== null;
    append('check-loop', hasCandidate
      ? `curr 引用 ${curr.id}，其 next 指向待检查节点 ${curr.nextId}；处理过的保留节点在 curr 之前，待处理后缀从 curr.next 开始。`
      : `curr 引用 ${curr.id}，其 next 为 null；没有待处理节点，退出循环。`,
    firstDecision && !hasCandidate ? 'first-decision' : undefined);
    if (!hasCandidate) break;

    hasCandidate = undefined;
    const candidate = node(curr.nextId!);
    shouldRemove = candidate.value === input.val;
    append('check-value', `${candidate.id}.val=${candidate.value}，与基本值 val=${input.val} 比较：${shouldRemove ? '相等，本轮跳过该节点' : '不相等，本轮保留该节点'}。`, firstDecision ? 'first-decision' : undefined);
    firstDecision = false;

    shouldRemove = undefined;
    if (candidate.value === input.val) {
      curr.nextId = candidate.nextId;
      append('skip-node', `${curr.id}.next 从 ${candidate.id} 改为 ${candidate.nextId ?? 'null'}，因此结果链跳过 ${candidate.id}。${candidate.id} 对象仍显示在教学图中；不可据此推断垃圾回收。curr 保持引用 ${curr.id}，下一轮继续检查新的 curr.next。`, firstAction ? 'first-action' : undefined);
    } else {
      bindings.curr = candidate.id;
      append('move-curr', `curr 从 ${curr.id} 改绑到保留节点 ${candidate.id}。这里只改变变量绑定，没有修改任何 next 字段，也没有复制对象。`, firstAction ? 'first-action' : undefined);
    }
    firstAction = false;
  }

  hasCandidate = undefined;
  bindings['返回值'] = dummy.nextId;
  append('return-head', `返回 d0.next 的引用值 ${dummy.nextId ?? 'null'}。参考解法重连并复用原节点；本站判定按无环返回链的值序列检查，不要求学生必须采用相同对象复用策略。`, firstAction ? 'first-action' : undefined);

  const finalOutput = expectedOutput('203', input);
  const reachableValues: number[] = [];
  const seen = new Set<string>();
  let cursor: string | null = dummy.nextId;
  while (cursor !== null) {
    if (seen.has(cursor)) throw new Error('参考模型错误地产生了环');
    seen.add(cursor);
    const current = node(cursor);
    reachableValues.push(current.value);
    cursor = current.nextId;
  }
  if (finalOutput.kind !== 'int-array' || JSON.stringify(reachableValues) !== JSON.stringify(finalOutput.values)) {
    throw new Error('参考链表值序列与独立可信过滤结果不一致');
  }
  return finalizeTrace({
    problemId: '203', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const list = snapshot.structures.find(structure => structure.kind === 'list');
  if (!list || list.kind !== 'list') throw new Error('203 预测检查点缺少链表对象图');

  if (snapshot.stepId === 'check-value') {
    const value = snapshot.variables.find(variable => variable.name === 'curr.next.val == val')?.value;
    if (value?.kind !== 'boolean') throw new Error('203 首次判断缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：第一个待检查节点会被跳过还是保留？',
      answer: { kind: 'choice', optionId: value.value ? 'remove' : 'keep' },
      options: [{ id: 'remove', label: '值等于 val，跳过' }, { id: 'keep', label: '值不等于 val，保留' }, { id: 'done', label: '没有待检查节点' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'check-loop') {
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：空输入的第一轮有待检查节点吗？',
      answer: { kind: 'choice', optionId: 'done' },
      options: [{ id: 'remove', label: '值等于 val，跳过' }, { id: 'keep', label: '值不等于 val，保留' }, { id: 'done', label: '没有待检查节点' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'skip-node' || snapshot.stepId === 'move-curr' || snapshot.stepId === 'return-head') {
    const dummy = list.nodes.find(node => node.id === 'd0');
    if (!dummy) throw new Error('203 首次动作检查点缺少 d0');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: snapshot.stepId === 'return-head'
        ? '先预测，再揭示：空链直接退出循环并返回前，d0.next 指向什么？'
        : '先预测，再揭示：第一次处理动作后，d0.next 指向哪个稳定节点 ID？',
      answer: { kind: 'text', value: dummy.nextId ?? 'null' },
      explanation: snapshot.explanation,
    };
  }
  throw new Error(`未知的 203 预测步骤：${snapshot.stepId}`);
}
