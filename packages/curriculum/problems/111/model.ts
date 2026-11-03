import {
  TreeInputSchema,
  expectedOutput,
  type ReferencePrediction,
  type ReferenceTrace,
  type TreeInput,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type Node = { id: string; value: number; leftId: string | null; rightId: string | null; depth: number };
type Frame = {
  frameId: string;
  nodeId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  leftDepth: number | null;
  rightDepth: number | null;
  returnValue: number | null;
};

function parseCompactTree(tokens: readonly (number | null)[]): { rootId: string | null; nodes: Node[]; depth: number } {
  if (tokens.length === 0) return { rootId: null, nodes: [], depth: 0 };
  const nodes: Node[] = [{ id: 't0', value: tokens[0] as number, leftId: null, rightId: null, depth: 1 }];
  const queue = [nodes[0]!];
  let cursor = 1;
  let depth = 1;
  for (let parentIndex = 0; parentIndex < queue.length && cursor < tokens.length; parentIndex++) {
    const parent = queue[parentIndex]!;
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const child: Node = { id: `t${nodes.length}`, value, leftId: null, rightId: null, depth: parent.depth + 1 };
      parent[side] = child.id;
      nodes.push(child);
      queue.push(child);
      depth = Math.max(depth, child.depth);
    }
  }
  return { rootId: 't0', nodes, depth };
}

/** Preset reference state only. Student Java runs in the separate Docker runner channel. */
export async function buildReferenceTrace(raw: TreeInput, inputId: string): Promise<ReferenceTrace> {
  const input = TreeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const parsed = parseCompactTree(input.root);
  if (parsed.nodes.length > 30 || parsed.depth > 8) throw new Error('参考树演示最多 30 个节点、深度最多 8；真实 Java 判题仍支持本站输入上限');
  const byId = new Map(parsed.nodes.map(node => [node.id, node]));
  const frames: Frame[] = [];
  const snapshots: Snapshot[] = [];
  let frameSequence = 0;
  let nullCheck: boolean | undefined;
  let missingChild: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: '输入 root', value: { kind: 'reference', objectId: parsed.rootId } },
    ];
    if (active) {
      variables.push(
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前 root', value: { kind: 'reference', objectId: active.nodeId } },
        { name: '当前阶段', value: { kind: 'string', value: active.phase } },
      );
      if (active.leftDepth !== null) variables.push({ name: 'leftDepth', value: { kind: 'int', value: active.leftDepth } });
      if (active.rightDepth !== null) variables.push({ name: 'rightDepth', value: { kind: 'int', value: active.rightDepth } });
      if (active.returnValue !== null) variables.push({ name: '本次返回值', value: { kind: 'int', value: active.returnValue } });
    }
    if (nullCheck !== undefined) variables.push({ name: 'root == null', value: { kind: 'boolean', value: nullCheck } });
    if (missingChild !== undefined) variables.push({ name: '至少一侧深度为 0', value: { kind: 'boolean', value: missingChild } });
    return {
      variables,
      structures: [{
        kind: 'tree', id: 'tree', frameSemantics: 'depth', rootId: parsed.rootId,
        nodes: parsed.nodes.map(node => ({ id: node.id, value: node.value, leftId: node.leftId, rightId: node.rightId })),
        frames: frames.map(frame => ({ ...frame })),
      }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state(parsed.rootId === null
      ? '输入是空树，root 保存 null；尚未进入参考方法。'
      : `输入 root 指向稳定教学节点 ${parsed.rootId}；相同 val 的节点仍保持不同对象身份。`),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string): void => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  const visit = (nodeId: string | null): number => {
    const frame: Frame = {
      frameId: `f${frameSequence++}`, nodeId, phase: 'enter', leftDepth: null, rightDepth: null, returnValue: null,
    };
    frames.push(frame);
    append('enter-frame', nodeId === null
      ? `${frame.frameId} 收到 null 引用；这次调用没有对应的节点对象。`
      : `${frame.frameId} 收到节点 ${nodeId} 的引用值；参数复制引用值，并未复制树对象。`);

    nullCheck = nodeId === null;
    append('check-null', nodeId === null
      ? `${frame.frameId} 判断 root 为 null，最小深度直接是 0。`
      : `${frame.frameId} 判断 root 非 null，需要取得左右子树最小深度。`,
    frames.length === 1 ? 'root-null-check' : undefined);
    nullCheck = undefined;

    if (nodeId === null) {
      frame.phase = 'return';
      frame.returnValue = 0;
      append('return-null', `${frame.frameId} 返回 0；null 表示没有节点，不是一个深度为零的叶节点。`, frames.length === 1 ? 'root-return-depth' : undefined);
      frames.pop();
      return 0;
    }

    const node = byId.get(nodeId);
    if (!node) throw new Error(`参考树包含未知节点：${nodeId}`);
    frame.phase = 'await-left';
    append('await-left', `${frame.frameId} 暂停，调用左子树 ${node.leftId ?? 'null'}。`);
    frame.leftDepth = visit(node.leftId);

    frame.phase = 'await-right';
    append('await-right', `${frame.frameId} 恢复并得到 leftDepth=${frame.leftDepth}，再调用右子树 ${node.rightId ?? 'null'}。`);
    frame.rightDepth = visit(node.rightId);

    frame.phase = 'return';
    missingChild = frame.leftDepth === 0 || frame.rightDepth === 0;
    const leaf = frame.leftDepth === 0 && frame.rightDepth === 0;
    append('check-missing-child', leaf
      ? `${frame.frameId} 的左右孩子都为 null，当前节点本身是叶节点。`
      : missingChild
      ? `${frame.frameId} 发现恰好一侧没有节点。空引用不能结束根到叶路径，必须沿存在的孩子继续。`
      : `${frame.frameId} 的两个孩子都存在，最近叶位于深度较小的一侧。`);
    if (missingChild) {
      frame.returnValue = 1 + Math.max(frame.leftDepth, frame.rightDepth);
      append('return-only-child', leaf
        ? `${frame.frameId} 是叶节点，两侧子树深度都是 0；只计算当前节点这一层，返回 ${frame.returnValue}。`
        : `${frame.frameId} 取存在孩子的深度 ${Math.max(frame.leftDepth, frame.rightDepth)}，加当前节点一层后返回 ${frame.returnValue}。`, frames.length === 1 ? 'root-return-depth' : undefined);
    } else {
      frame.returnValue = 1 + Math.min(frame.leftDepth, frame.rightDepth);
      append('return-nearer-child', `${frame.frameId} 取左右较小深度 ${Math.min(frame.leftDepth, frame.rightDepth)}，加当前节点一层后返回 ${frame.returnValue}。`, frames.length === 1 ? 'root-return-depth' : undefined);
    }
    missingChild = undefined;
    frames.pop();
    return frame.returnValue;
  };

  const result = visit(parsed.rootId);
  const expected = expectedOutput('111', input);
  if (expected.kind !== 'int' || expected.value !== result) throw new Error('参考最小深度模型与独立契约期望不一致');
  return finalizeTrace({
    problemId: '111', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: expected,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-null') {
    const value = snapshot.variables.find(variable => variable.name === 'root == null')?.value;
    if (value?.kind !== 'boolean') throw new Error('根引用预测检查点缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：最外层参数 root 是否为 null？',
      answer: { kind: 'choice', optionId: value.value ? 'is-null' : 'not-null' },
      options: [{ id: 'is-null', label: '是，root 为 null' }, { id: 'not-null', label: '否，root 指向节点' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '本次返回值')?.value;
  if (value?.kind !== 'int') throw new Error('最小深度预测检查点缺少整数返回值');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最外层 minDepth 调用最终返回多少？',
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
