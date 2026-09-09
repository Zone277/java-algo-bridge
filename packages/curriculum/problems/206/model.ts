import { LinkedListInputSchema, ReferenceTraceSchema, type LinkedListInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

async function hash(text: string) {
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
}
function freeze<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
export async function buildReferenceTrace(raw: LinkedListInput, inputId: string): Promise<ReferenceTrace> {
  const input = LinkedListInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.head.length * 5 + 4 > 2000) throw new Error('参考模型超过 2000 快照上限；未截断生成轨迹。判题上限仍为 5000 节点。');
  const [inputHash, referenceSourceHash] = await Promise.all([hash(JSON.stringify({ head: input.head })), hash(REFERENCE_SOURCE)]);
  const nodes = input.head.map((value, i) => ({ id: `h${i}`, value, nextId: i + 1 < input.head.length ? `h${i + 1}` : null }));
  const bindings: Record<string, string | null> = { head: nodes[0]?.id ?? null };
  let condition: boolean | undefined;
  const state = (explanation: string) => ({
    variables: [...Object.entries(bindings).map(([name, objectId]) => ({ name, value: { kind: 'reference' as const, objectId } })), ...(condition === undefined ? [] : [{ name: '条件结果', value: { kind: 'boolean' as const, value: condition } }])],
    structures: [{ kind: 'list' as const, id: 'input-list', nodes: nodes.map(n => ({ ...n })), bindings: Object.entries(bindings).map(([name, objectId]) => ({ name, objectId })) }], explanation,
  });
  const initialState = { snapshotId: 'initial' as const, ...state('方法收到 head 引用值；节点以 h0、h1…标识。值相同不代表同一对象。尚未初始化 prev/curr。') };
  const snapshots: ReferenceTrace['snapshots'][number][] = [];
  const append = (stepId: string, explanation: string, checkpoint?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    const range = REFERENCE_STEP_MAP.find(s => s.stepId === stepId)!;
    const snapshotId = `${stepId}-${snapshots.length}`;
    snapshots.push({ snapshotId, stepId, codeRange: { startLine: range.startLine, endLine: range.endLine }, ...state(explanation), ...(checkpoint ? { checkpointId: `${ALGORITHM_VERSION}:${inputHash}:${snapshotId}:${checkpoint}` } : {}) });
  };
  bindings.prev = null; append('init-prev', 'prev = null：已反转的部分起初为空。', input.head.length === 0 ? 'first-save' : undefined);
  bindings.curr = bindings.head!; append('init-curr', `curr 复制 head 的引用值 ${bindings.curr ?? 'null'}，没有复制节点。`);
  let iteration = 0;
  while (true) {
    delete bindings.next;
    condition = bindings.curr !== null;
    append('check-loop', condition ? 'curr 非 null，处理当前节点；prev 链是已反转前缀，curr 链是未处理后缀。' : 'curr 为 null，未处理部分为空，退出循环。');
    if (!condition) break;
    condition = undefined;
    const node = nodes.find(n => n.id === bindings.curr)!;
    bindings.next = node.nextId;
    append('save-next', `next 保存 ${node.id}.next 的引用值 ${bindings.next ?? 'null'}。只改变变量绑定，不改变任何 next 字段。`, iteration === 0 ? 'first-save' : undefined);
    node.nextId = bindings.prev!;
    append('reverse-next', `${node.id}.next 改为 ${node.nextId ?? 'null'}。这次修改对象字段；未处理后缀仍由变量 next 保留。`, iteration === 0 ? 'first-reverse' : undefined);
    bindings.prev = bindings.curr!;
    append('move-prev', `prev 改为引用 ${bindings.prev}，不改节点字段。现在 prev 覆盖新增反转节点。`);
    bindings.curr = bindings.next!;
    append('move-curr', `curr 改为保存的 next：${bindings.curr ?? 'null'}。一轮完成，已反转前缀增长一个节点。`);
    iteration++;
  }
  condition = undefined;
  bindings['返回值'] = bindings.prev!;
  append('return-prev', `返回 prev = ${bindings.prev ?? 'null'}；返回的是引用值，不是新建链表。`, input.head.length === 0 ? 'first-reverse' : undefined);
  const trace = { schemaVersion: 1 as const, mode: 'reference-model' as const, problemId: '206' as const, algorithmVersion: ALGORITHM_VERSION, referenceSourceHash, inputId, inputHash, initialState, snapshots,
    finalOutput: { kind: 'list-graph' as const, headId: bindings.prev!, nodes: nodes.map(n => ({ ...n })) } };
  ReferenceTraceSchema.parse(trace);
  return freeze(trace);
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const list = snapshot.structures.find(s => s.kind === 'list');
  if (!list || list.kind !== 'list') throw new Error('缺少链表状态');
  const curr = list.bindings.find(b => b.name === 'curr')?.objectId;
  const answer = snapshot.stepId === 'reverse-next' ? list.nodes.find(n => n.id === curr)!.nextId : list.bindings.find(b => b.name === (snapshot.stepId === 'save-next' ? 'next' : snapshot.stepId === 'init-prev' ? 'prev' : '返回值'))!.objectId;
  return { checkpointId: snapshot.checkpointId, prompt: snapshot.stepId === 'reverse-next' ? `先预测：改链后 ${curr}.next 指向谁？填写节点 ID 或 null。` : `先预测：${snapshot.stepId === 'save-next' ? 'next' : snapshot.stepId === 'init-prev' ? 'prev' : '返回值'} 将引用谁？填写节点 ID 或 null。`, answer: answer ?? 'null', explanation: snapshot.explanation };
}
