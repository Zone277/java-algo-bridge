import { MergeListsInputSchema, judgeProblemOutput, type MergeListsInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type State = Omit<ReferenceTrace['initialState'], 'snapshotId'>;
type NodeState = { id: string; value: number; nextId: string | null };

/** Preset reference algorithm only. Stable IDs describe teaching objects, not JVM addresses. */
export async function buildReferenceTrace(rawInput: MergeListsInput, inputId: string): Promise<ReferenceTrace & { readonly finalOutput: { readonly kind: 'list-graph' } }> {
  const input = MergeListsInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const originalNodes: NodeState[] = [
    ...input.list1.map((value, index) => ({ id: `a${index}`, value, nextId: index + 1 < input.list1.length ? `a${index + 1}` : null })),
    ...input.list2.map((value, index) => ({ id: `b${index}`, value, nextId: index + 1 < input.list2.length ? `b${index + 1}` : null })),
  ];
  const dummy: NodeState = { id: 'd0', value: 0, nextId: null };
  let dummyCreated = false;
  let condition: boolean | undefined;
  let chooseList1: boolean | undefined;
  const bindings: Record<string, string | null> = {
    list1: input.list1.length ? 'a0' : null,
    list2: input.list2.length ? 'b0' : null,
  };
  const snapshots: Snapshot[] = [];
  const allNodes = () => dummyCreated ? [dummy, ...originalNodes] : [...originalNodes];
  const node = (id: string) => allNodes().find(item => item.id === id) ?? (() => { throw new Error(`Unknown model node ${id}`); })();
  const state = (explanation: string): State => ({
    variables: [
      ...Object.entries(bindings).map(([name, objectId]) => ({ name, value: { kind: 'reference' as const, objectId } })),
      ...(condition === undefined ? [] : [{ name: '循环条件', value: { kind: 'boolean' as const, value: condition } }]),
      ...(chooseList1 === undefined ? [] : [{ name: '选择 list1', value: { kind: 'boolean' as const, value: chooseList1 } }]),
    ],
    structures: [{ kind: 'list', id: 'merge-graph', nodes: allNodes().map(item => ({ ...item })), bindings: Object.entries(bindings).map(([name, objectId]) => ({ name, objectId })) }],
    explanation,
  });
  const initialState: ReferenceTrace['initialState'] = { snapshotId: 'initial', ...state('方法收到 list1 与 list2 的引用值。a0…和 b0…是两条输入链的稳定对象 ID；值相同仍是不同节点。尚未创建辅助节点。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  dummyCreated = true; bindings.dummy = 'd0';
  append('create-dummy', '创建辅助对象 d0。它只提供稳定起点，不属于输入节点，也不会出现在最终判定输出中；d0 的值 0 不参与排序。');
  bindings.tail = bindings.dummy!;
  append('init-tail', 'tail 复制 dummy 的引用值 d0。改变 tail 的绑定不会复制或删除对象。');
  let firstLink = true;
  let firstTail = true;
  while (true) {
    chooseList1 = undefined;
    condition = bindings.list1 !== null && bindings.list2 !== null;
    append('check-loop', condition ? '两条剩余链都非空，比较它们当前头节点。循环边界处：tail 之前是已合并前缀，list1/list2 分别是未消费后缀。' : '至少一条剩余链为空，退出逐个比较循环。');
    if (!condition) break;
    condition = undefined;
    const list1Node = node(bindings.list1!);
    const list2Node = node(bindings.list2!);
    chooseList1 = list1Node.value <= list2Node.value;
    append('choose-source', `${list1Node.id}.val=${list1Node.value} 与 ${list2Node.id}.val=${list2Node.value} 比较；${chooseList1 ? '选择 list1，相等时模型固定 a 链优先' : '选择 list2'}。判题允许相等值采用另一合法跨链顺序。`);
    const oldTail = node(bindings.tail!);
    if (chooseList1) {
      oldTail.nextId = bindings.list1!;
      append('attach-list1', `${oldTail.id}.next 改为 ${oldTail.nextId}。这是对象字段修改；此刻 list1 变量尚未移动。`, firstLink ? 'first-link' : undefined);
      firstLink = false;
      bindings.list1 = list1Node.nextId;
      append('move-list1', `list1 改绑为所选节点原来的 next：${bindings.list1 ?? 'null'}。这里只改变变量绑定。`);
    } else {
      oldTail.nextId = bindings.list2!;
      append('attach-list2', `${oldTail.id}.next 改为 ${oldTail.nextId}。这是对象字段修改；此刻 list2 变量尚未移动。`, firstLink ? 'first-link' : undefined);
      firstLink = false;
      bindings.list2 = list2Node.nextId;
      append('move-list2', `list2 改绑为所选节点原来的 next：${bindings.list2 ?? 'null'}。这里只改变变量绑定。`);
    }
    bindings.tail = oldTail.nextId;
    append('move-tail', `tail 沿刚写好的 next 改绑为 ${bindings.tail}。一轮完成；稳定已合并前缀增长一个原节点。`, firstTail ? 'first-tail' : undefined);
    firstTail = false;
  }
  condition = undefined; chooseList1 = undefined;
  const remainder = bindings.list1 ?? bindings.list2 ?? null;
  node(bindings.tail!).nextId = remainder;
  append('attach-remainder', `只剩至多一条有序后缀，把 ${bindings.tail}.next 一次接到 ${remainder ?? 'null'}；无需复制其节点。`, firstLink ? 'first-link' : undefined);
  const headId = dummy.nextId;
  bindings['返回值'] = headId;
  append('return-head', `返回 dummy.next = ${headId ?? 'null'}。d0 仍在教学快照中显示，但返回链只包含 a*/b* 原节点；不推断垃圾回收。`, firstTail ? 'first-tail' : undefined);

  const finalOutput = { kind: 'list-graph' as const, headId, nodes: originalNodes.map(item => ({ ...item })) };
  const judged = judgeProblemOutput('21', input, finalOutput);
  if (!judged.passed) throw new Error(`参考模型生成了非法合并链：${judged.message}`);
  const trace = await finalizeTrace({ problemId: '21', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
  return trace as ReferenceTrace & { readonly finalOutput: { readonly kind: 'list-graph' } };
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const list = snapshot.structures.find(structure => structure.kind === 'list');
  if (!list || list.kind !== 'list') throw new Error('预测检查点缺少链表对象图');
  let answer: string | null | undefined;
  let prompt: string;
  if (snapshot.stepId.startsWith('attach-')) {
    const tail = list.bindings.find(binding => binding.name === 'tail')?.objectId;
    answer = tail === null || tail === undefined ? null : list.nodes.find(item => item.id === tail)?.nextId;
    prompt = `先预测：执行这次接入后，${tail}.next 指向哪个稳定节点 ID？`;
  } else if (snapshot.stepId === 'move-tail') {
    answer = list.bindings.find(binding => binding.name === 'tail')?.objectId;
    prompt = '先预测：完成第一次接入后，tail 变量将引用哪个节点？';
  } else {
    answer = list.bindings.find(binding => binding.name === '返回值')?.objectId;
    prompt = '先预测：没有逐项比较可做时，最终返回引用指向哪个节点？';
  }
  return { checkpointId: snapshot.checkpointId, prompt, answer: { kind: 'text', value: answer ?? 'null' }, explanation: snapshot.explanation };
}
