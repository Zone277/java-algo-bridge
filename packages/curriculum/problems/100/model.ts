import {
  SameTreeInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type SameTreeInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type Node = { id: string; value: number; leftId: string | null; rightId: string | null; depth: number };
type Frame = {
  frameId: string;
  pId: string | null;
  qId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  leftResult: boolean | null;
  result: boolean | null;
};

function parseCompactTree(tokens: readonly (number | null)[], prefix: 'p' | 'q') {
  if (tokens.length === 0) return { rootId: null, nodes: [] as Node[], depth: 0 };
  const nodes: Node[] = [{ id: `${prefix}0`, value: tokens[0] as number, leftId: null, rightId: null, depth: 1 }];
  const queue = [nodes[0]!];
  let cursor = 1;
  let depth = 1;
  for (let parentIndex = 0; parentIndex < queue.length && cursor < tokens.length; parentIndex++) {
    const parent = queue[parentIndex]!;
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const child: Node = {
        id: `${prefix}${nodes.length}`,
        value,
        leftId: null,
        rightId: null,
        depth: parent.depth + 1,
      };
      parent[side] = child.id;
      nodes.push(child);
      queue.push(child);
      depth = Math.max(depth, child.depth);
    }
  }
  return { rootId: `${prefix}0`, nodes, depth };
}

function relation(pId: string | null, qId: string | null, pById: Map<string, Node>, qById: Map<string, Node>) {
  if (pId === null && qId === null) return 'both-null';
  if (pId === null || qId === null) return 'one-null';
  return pById.get(pId)!.value === qById.get(qId)!.value ? 'values-equal' : 'values-differ';
}

/** 预置参考算法的不可变状态；学生 Java 仍通过独立 Docker runner 执行。 */
export async function buildReferenceTrace(raw: SameTreeInput, inputId: string): Promise<ReferenceTrace> {
  const input = SameTreeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const pTree = parseCompactTree(input.p, 'p');
  const qTree = parseCompactTree(input.q, 'q');
  if (pTree.nodes.length > 30 || qTree.nodes.length > 30 || pTree.depth > 8 || qTree.depth > 8) {
    throw new Error('参考演示每棵树最多 30 个节点、深度最多 8；真实 Java 判题仍支持本站输入上限');
  }
  const pById = new Map(pTree.nodes.map(node => [node.id, node]));
  const qById = new Map(qTree.nodes.map(node => [node.id, node]));
  const frames: Frame[] = [];
  const snapshots: Snapshot[] = [];
  let frameSequence = 0;
  let finalResult: boolean | null = null;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: '输入 p', value: { kind: 'reference', objectId: pTree.rootId } },
      { name: '输入 q', value: { kind: 'reference', objectId: qTree.rootId } },
    ];
    if (active) {
      variables.push(
        { name: '当前 p', value: { kind: 'reference', objectId: active.pId } },
        { name: '当前 q', value: { kind: 'reference', objectId: active.qId } },
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前阶段', value: { kind: 'string', value: active.phase } },
        { name: '当前配对关系', value: { kind: 'string', value: relation(active.pId, active.qId, pById, qById) } },
      );
      if (active.leftResult !== null) variables.push({ name: '左子树相同', value: { kind: 'boolean', value: active.leftResult } });
      if (active.result !== null) variables.push({ name: '本次结果', value: { kind: 'boolean', value: active.result } });
    }
    if (finalResult !== null) variables.push({ name: '最终结果', value: { kind: 'boolean', value: finalResult } });
    const treeFrames = (side: 'p' | 'q') => frames.map(frame => ({
      frameId: frame.frameId,
      nodeId: side === 'p' ? frame.pId : frame.qId,
      phase: frame.phase,
      leftDepth: null,
      rightDepth: null,
      returnValue: null,
    }));
    return {
      variables,
      structures: [
        {
          kind: 'tree', id: 'p-tree', frameSemantics: 'traversal', rootId: pTree.rootId,
          nodes: pTree.nodes.map(({ depth: _depth, ...node }) => ({ ...node })), frames: treeFrames('p'),
        },
        {
          kind: 'tree', id: 'q-tree', frameSemantics: 'traversal', rootId: qTree.rootId,
          nodes: qTree.nodes.map(({ depth: _depth, ...node }) => ({ ...node })), frames: treeFrames('q'),
        },
        {
          kind: 'stack', id: '节点对调用栈',
          items: frames.map(frame => ({ kind: 'string' as const, value: `${frame.frameId}: ${frame.pId ?? 'null'} ↔ ${frame.qId ?? 'null'}` })),
          topIndex: frames.length === 0 ? null : frames.length - 1,
        },
      ],
      explanation,
    };
  };
  const initialState: State = {
    snapshotId: 'initial',
    ...state(`可信输入构造器创建两棵独立对象图；p 根为 ${pTree.rootId ?? 'null'}，q 根为 ${qTree.rootId ?? 'null'}。尚未执行参考方法。`),
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

  const same = (pId: string | null, qId: string | null): boolean => {
    const frame: Frame = {
      frameId: `f${frameSequence++}`,
      pId,
      qId,
      phase: 'enter',
      leftResult: null,
      result: null,
    };
    frames.push(frame);
    append('enter-pair', `${frame.frameId} 收到 p=${pId ?? 'null'}、q=${qId ?? 'null'} 的引用值副本；它们指向哪个对象与对象的 val 是两回事。`, frames.length === 1 ? 'root-pair' : undefined);
    append('check-both-null', `${frame.frameId} 先判断两个引用是否同时为 null。`);
    if (pId === null && qId === null) {
      frame.phase = 'return';
      frame.result = true;
      append('return-both-null', `${frame.frameId} 的两个位置都缺少节点，结构在此处相同，返回 true。`);
      frames.pop();
      return true;
    }
    append('check-one-null', `${frame.frameId} 再判断是否恰有一个引用为 null；此时还没有访问 val。`);
    if (pId === null || qId === null) {
      frame.phase = 'return';
      frame.result = false;
      append('return-one-null', `${frame.frameId} 的一个位置为空、另一个有节点，结构不同，返回 false。`);
      frames.pop();
      return false;
    }
    const pNode = pById.get(pId);
    const qNode = qById.get(qId);
    if (!pNode || !qNode) throw new Error(`参考树包含未知节点对：${pId} / ${qId}`);
    append('compare-values', `${frame.frameId} 比较 ${pId}.val=${pNode.value} 与 ${qId}.val=${qNode.value}。对象 ID 不必相同，但基本值必须相同。`);
    if (pNode.value !== qNode.value) {
      frame.phase = 'return';
      frame.result = false;
      append('return-values-differ', `${frame.frameId} 的两个 int 值不同，返回 false。`);
      frames.pop();
      return false;
    }
    frame.phase = 'await-left';
    append('call-left-pair', `${frame.frameId} 的当前值相同，先比较左孩子 ${pNode.leftId ?? 'null'} 与 ${qNode.leftId ?? 'null'}。`);
    frame.leftResult = same(pNode.leftId, qNode.leftId);
    append('check-left-result', `${frame.frameId} 收到左子树结果 ${frame.leftResult}；Java 的 && 先据此决定是否继续。`);
    if (!frame.leftResult) {
      frame.phase = 'return';
      frame.result = false;
      append('short-circuit-left', `${frame.frameId} 的左子树已经不同，&& 短路，右孩子不会被参考代码访问。`);
      frames.pop();
      return false;
    }
    frame.phase = 'await-right';
    append('call-right-pair', `${frame.frameId} 的左侧相同，再比较右孩子 ${pNode.rightId ?? 'null'} 与 ${qNode.rightId ?? 'null'}。`);
    frame.result = same(pNode.rightId, qNode.rightId);
    frame.phase = 'return';
    append('return-pair', `${frame.frameId} 的当前值和左侧都相同，右子树结果为 ${frame.result}，因此本次返回 ${frame.result}。`);
    frames.pop();
    return frame.result;
  };

  finalResult = same(pTree.rootId, qTree.rootId);
  append('return-result', `最外层 isSameTree 返回 ${finalResult}。此结果来自参考状态模型，不是学生代码的执行轨迹。`, 'final-result');
  const trace = await finalizeTrace({
    problemId: '100', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: finalResult },
  });
  if (JSON.stringify(trace.finalOutput) !== JSON.stringify(expectedOutput('100', input))) {
    throw new Error('参考相同树模型与独立契约期望不一致');
  }
  return trace;
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'enter-pair') {
    const value = snapshot.variables.find(variable => variable.name === '当前配对关系')?.value;
    if (value?.kind !== 'string') throw new Error('根节点对检查点缺少关系状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：最外层 p 与 q 属于哪种情况？',
      answer: { kind: 'choice', optionId: value.value },
      options: [
        { id: 'both-null', label: '两者都是 null' },
        { id: 'one-null', label: '恰好一者为 null' },
        { id: 'values-equal', label: '都有节点且根值相同' },
        { id: 'values-differ', label: '都有节点但根值不同' },
      ],
      explanation: snapshot.explanation,
    };
  }
  const result = snapshot.variables.find(variable => variable.name === '最终结果')?.value;
  if (result?.kind !== 'boolean') throw new Error('最终检查点缺少布尔结果');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：这两棵树最终是否相同？',
    answer: { kind: 'choice', optionId: result.value ? 'same' : 'different' },
    options: [{ id: 'same', label: 'true，相同' }, { id: 'different', label: 'false，不同' }],
    explanation: snapshot.explanation,
  };
}
