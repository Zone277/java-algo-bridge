import { TreeInputSchema, expectedOutput, type ReferencePrediction, type ReferenceTrace, type TreeInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type Node = { id: string; value: number; leftId: string | null; rightId: string | null };
type Frame = {
  frameId: string; aId: string | null; bId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  result: boolean | null;
};

function parseCompactTree(tokens: readonly (number | null)[]): { rootId: string | null; nodes: Node[]; depth: number } {
  if (tokens.length === 0) return { rootId: null, nodes: [], depth: 0 };
  const nodes: Node[] = [{ id: 't0', value: tokens[0] as number, leftId: null, rightId: null }];
  const queue: { node: Node; depth: number }[] = [{ node: nodes[0]!, depth: 1 }];
  let cursor = 1;
  let depth = 1;
  for (let parent = 0; parent < queue.length && cursor < tokens.length; parent++) {
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const node: Node = { id: `t${nodes.length}`, value, leftId: null, rightId: null };
      queue[parent]!.node[side] = node.id;
      nodes.push(node);
      queue.push({ node, depth: queue[parent]!.depth + 1 });
      depth = Math.max(depth, queue[parent]!.depth + 1);
    }
  }
  return { rootId: 't0', nodes, depth };
}

/** Preset Java reference algorithm as immutable teaching states; student source is never inspected. */
export async function buildReferenceTrace(raw: TreeInput, inputId: string): Promise<ReferenceTrace> {
  const input = TreeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const tree = parseCompactTree(input.root);
  if (tree.nodes.length > 30 || tree.depth > 8) throw new Error('参考树演示最多 30 个节点、深度最多 8；真实 Java 判题仍支持本站输入上限');
  const byId = new Map(tree.nodes.map(node => [node.id, node]));
  const root = tree.rootId === null ? null : byId.get(tree.rootId)!;
  const firstA = root?.leftId ?? null;
  const firstB = root?.rightId ?? null;
  const frames: Frame[] = [];
  const snapshots: Snapshot[] = [];
  let sequence = 0;
  let firstPairRevealed = false;
  let finalResult: boolean | null = null;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: 'root', value: { kind: 'reference', objectId: tree.rootId } },
    ];
    if (firstPairRevealed) variables.push(
      { name: '首对左引用', value: { kind: 'reference', objectId: firstA } },
      { name: '首对右引用', value: { kind: 'reference', objectId: firstB } },
    );
    if (active) {
      variables.push(
        { name: 'a', value: { kind: 'reference', objectId: active.aId } },
        { name: 'b', value: { kind: 'reference', objectId: active.bId } },
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前阶段', value: { kind: 'string', value: active.phase } },
      );
      if (active.result !== null) variables.push({ name: '本次结果', value: { kind: 'boolean', value: active.result } });
    }
    if (finalResult !== null) variables.push({ name: '最终结果', value: { kind: 'boolean', value: finalResult } });
    return {
      variables,
      structures: [
        { kind: 'tree', id: 'tree', frameSemantics: 'traversal', rootId: tree.rootId,
          nodes: tree.nodes.map(node => ({ ...node })),
          frames: frames.map(frame => ({ frameId: frame.frameId, nodeId: frame.aId, phase: frame.phase,
            leftDepth: null, rightDepth: null, returnValue: null })) },
        { kind: 'stack', id: '镜像配对调用栈',
          items: frames.map(frame => ({ kind: 'string' as const, value: `${frame.frameId}: ${frame.aId ?? 'null'} ↔ ${frame.bId ?? 'null'}` })),
          topIndex: frames.length === 0 ? null : frames.length - 1 },
      ],
      explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state(tree.rootId === null
    ? 'root 为 null；本站约定空树对称。还没有镜像配对调用。'
    : `根引用指向 ${tree.rootId}。每个 t 编号是稳定的教学节点身份；值相同也不合并对象。`) };
  const append = (stepId: string, explanation: string, checkpointId?: string): void => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}) });
  };

  append('check-root', tree.rootId === null
    ? 'root 为 null，无左右孩子；根据空树基例直接返回 true。'
    : 'root 非 null；先预测其左右孩子是否都是实节点，随后才会读取左右引用。', 'first-pair-check');

  const mirror = (aId: string | null, bId: string | null): boolean => {
    const frame: Frame = { frameId: `f${sequence++}`, aId, bId, phase: 'enter', result: null };
    frames.push(frame);
    append('enter-pair', `${frame.frameId} 收到一对引用 a=${aId ?? 'null'}、b=${bId ?? 'null'}；它们是两个不同参数，不是两个新复制的树对象。`);
    append('check-both-null', `${frame.frameId} 先检查 a 与 b 是否都为空；空位必须两侧配对。`);
    if (aId === null && bId === null) {
      frame.phase = 'return'; frame.result = true;
      append('return-both-null', `${frame.frameId} 两侧均无节点，镜像位置匹配，返回 true。`);
      frames.pop(); return true;
    }
    append('check-one-null', `${frame.frameId} 还要检查是否仅一侧为空，不能在此之前访问 val。`);
    if (aId === null || bId === null) {
      frame.phase = 'return'; frame.result = false;
      append('return-one-null', `${frame.frameId} 一边为空、一边有节点，结构不镜像，返回 false。`);
      frames.pop(); return false;
    }
    const a = byId.get(aId); const b = byId.get(bId);
    if (!a || !b) throw new Error('参考模型内部出现未知节点引用');
    append('compare-values', `${frame.frameId} 比较 ${aId}.val=${a.value} 与 ${bId}.val=${b.value}；对象身份不同不妨碍数值相等。`);
    if (a.value !== b.value) {
      frame.phase = 'return'; frame.result = false;
      append('return-values-differ', `${frame.frameId} 当前镜像节点值不同，返回 false。`);
      frames.pop(); return false;
    }
    frame.phase = 'await-left';
    append('call-outer-pair', `${frame.frameId} 先比较外侧：${aId}.left → ${a.leftId ?? 'null'}，${bId}.right → ${b.rightId ?? 'null'}。`);
    const outer = mirror(a.leftId, b.rightId);
    if (!outer) {
      frame.phase = 'return'; frame.result = false;
      append('return-pair', `${frame.frameId} 外侧已不匹配；&& 短路，内侧不再调用，返回 false。`);
      frames.pop(); return false;
    }
    frame.phase = 'await-right';
    append('call-inner-pair', `${frame.frameId} 外侧匹配，接着比较内侧：${aId}.right → ${a.rightId ?? 'null'}，${bId}.left → ${b.leftId ?? 'null'}。`);
    const inner = mirror(a.rightId, b.leftId);
    frame.phase = 'return'; frame.result = inner;
    append('return-pair', `${frame.frameId} 外侧为 true，内侧为 ${inner}；两对经 && 合并后返回 ${inner}。`);
    frames.pop(); return inner;
  };

  if (root === null) {
    finalResult = true;
    append('return-empty-root', '空树没有需要比较的节点对，返回 true；这是参考算法状态，不是学生 Java 的执行记录。', 'result-check');
  } else {
    firstPairRevealed = true;
    append('call-root-pair', `从根的两侧开始，调用 mirror(${firstA ?? 'null'}, ${firstB ?? 'null'})。`);
    finalResult = mirror(firstA, firstB);
    append('return-result', `参考解法最终返回 ${finalResult}；这是预置算法的演示结果，不是学生 Java 的执行记录。`, 'result-check');
  }
  const oracle = expectedOutput('101', input);
  if (oracle.kind !== 'boolean' || oracle.value !== finalResult) throw new Error('镜像递归模型与独立队列配对期望不一致');
  return finalizeTrace({ problemId: '101', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: oracle });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-root') {
    const tree = snapshot.structures.find(item => item.kind === 'tree' && item.id === 'tree');
    if (!tree || tree.kind !== 'tree') throw new Error('镜像预测缺少输入树');
    const root = tree.nodes.find(node => node.id === tree.rootId);
    return { checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：根的左右孩子是否都是实节点？空树视作两侧都没有节点。',
      answer: { kind: 'choice', optionId: root?.leftId !== null && root?.leftId !== undefined && root?.rightId !== null && root?.rightId !== undefined ? 'both-nodes' : 'has-null' },
      options: [{ id: 'both-nodes', label: '是，左右各有一个节点' }, { id: 'has-null', label: '否，至少一侧为 null' }], explanation: snapshot.explanation };
  }
  if (snapshot.stepId === 'return-result' || snapshot.stepId === 'return-empty-root') {
    const result = snapshot.variables.find(item => item.name === '最终结果')?.value;
    if (result?.kind !== 'boolean') throw new Error('结果预测缺少布尔值');
    return { checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前输入的整棵树最终是否对称？',
      answer: { kind: 'choice', optionId: String(result.value) },
      options: [{ id: 'true', label: 'true，对称' }, { id: 'false', label: 'false，不对称' }], explanation: snapshot.explanation };
  }
  throw new Error(`未知的 101 预测步骤：${snapshot.stepId}`);
}
