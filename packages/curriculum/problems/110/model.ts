import { TreeInputSchema, expectedOutput, type ReferencePrediction, type ReferenceTrace, type TreeInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
type Node = { id: string; value: number; leftId: string | null; rightId: string | null; depth: number };
type Frame = {
  frameId: string;
  nodeId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  leftHeight: number | null;
  rightHeight: number | null;
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

/** Preset Java algorithm state only; student Java runs through a separate Docker channel. */
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
  let finalResult: boolean | undefined = undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: '输入 root', value: { kind: 'reference', objectId: parsed.rootId } },
    ];
    if (active) {
      variables.push(
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前 node', value: { kind: 'reference', objectId: active.nodeId } },
        { name: '当前阶段', value: { kind: 'string', value: active.phase } },
      );
      if (active.leftHeight !== null) variables.push({ name: 'leftHeight', value: { kind: 'int', value: active.leftHeight } });
      if (active.rightHeight !== null) variables.push({ name: 'rightHeight', value: { kind: 'int', value: active.rightHeight } });
      if (active.returnValue !== null) variables.push({ name: '本次返回高度或 -1', value: { kind: 'int', value: active.returnValue } });
    }
    if (nullCheck !== undefined) variables.push({ name: 'node == null', value: { kind: 'boolean', value: nullCheck } });
    if (finalResult !== undefined) variables.push({ name: '整树平衡', value: { kind: 'boolean', value: finalResult } });
    return {
      variables,
      structures: [{
        kind: 'tree', id: 'tree', frameSemantics: 'depth', rootId: parsed.rootId,
        nodes: parsed.nodes.map(node => ({ id: node.id, value: node.value, leftId: node.leftId, rightId: node.rightId })),
        frames: frames.map(frame => ({ frameId: frame.frameId, nodeId: frame.nodeId, phase: frame.phase,
          leftDepth: frame.leftHeight, rightDepth: frame.rightHeight, returnValue: frame.returnValue })),
      }],
      explanation,
    };
  };
  const initialState: State = { snapshotId: 'initial', ...state(parsed.rootId === null
    ? '输入为空树，root 为 null；还没有进入辅助方法。空树高度为 0。'
    : `输入 root 指向教学节点 ${parsed.rootId}；相同的 val 不会合并不同节点对象。尚未执行参考方法。`) };
  const append = (stepId: string, explanation: string, checkpointId?: string): void => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}) });
  };

  append('start-method', 'isBalanced 把 root 的引用值交给 heightOrFail；它只把最终 int 哨兵转换为 boolean。');
  const heightOrFail = (nodeId: string | null): number => {
    const frame: Frame = { frameId: `f${frameSequence++}`, nodeId, phase: 'enter', leftHeight: null, rightHeight: null, returnValue: null };
    frames.push(frame);
    append('enter-frame', `${frame.frameId} 收到 ${nodeId ?? 'null'} 引用值；每次递归调用有独立参数与局部 int，高度计算不改节点字段。`);
    nullCheck = nodeId === null;
    append('check-null', `${frame.frameId} 判断 node ${nodeId === null ? '为' : '不为'} null。`, frames.length === 1 && nodeId === null ? 'root-null-check' : undefined);
    nullCheck = undefined;
    if (nodeId === null) {
      frame.phase = 'return';
      frame.returnValue = 0;
      append('return-null', `${frame.frameId} 对空子树返回高度 0；null 不是值为 0 的真实节点。`);
      frames.pop();
      return 0;
    }
    const node = byId.get(nodeId);
    if (!node) throw new Error(`参考树包含未知节点：${nodeId}`);
    frame.phase = 'await-left';
    append('call-left', `${frame.frameId} 先调用左孩子 ${node.leftId ?? 'null'} 的 heightOrFail；本帧等待子调用。`);
    frame.leftHeight = heightOrFail(node.leftId);
    append('check-left-failure', `${frame.frameId} 收到左子树结果 ${frame.leftHeight}；-1 表示左侧内部某节点已失衡。`, frames.length === 1 ? 'root-left-height' : undefined);
    if (frame.leftHeight === -1) {
      frame.phase = 'return';
      frame.returnValue = -1;
      append('propagate-left-failure', `${frame.frameId} 原样上传 -1；按参考 Java 提前返回，不再访问右孩子 ${node.rightId ?? 'null'}。`);
      frames.pop();
      return -1;
    }
    frame.phase = 'await-right';
    append('call-right', `${frame.frameId} 左侧有效，再调用右孩子 ${node.rightId ?? 'null'} 的 heightOrFail。`);
    frame.rightHeight = heightOrFail(node.rightId);
    append('check-right-failure', `${frame.frameId} 收到右子树结果 ${frame.rightHeight}；-1 不可参与普通高度比较。`);
    if (frame.rightHeight === -1) {
      frame.phase = 'return';
      frame.returnValue = -1;
      append('propagate-right-failure', `${frame.frameId} 右子树失衡，原样上传 -1。`);
      frames.pop();
      return -1;
    }
    const difference = Math.abs(frame.leftHeight - frame.rightHeight);
    append('compare-heights', `${frame.frameId} 左高度 ${frame.leftHeight}、右高度 ${frame.rightHeight}，差 ${difference}；只有差不超过 1 才平衡。`);
    frame.phase = 'return';
    if (difference > 1) {
      frame.returnValue = -1;
      append('return-unbalanced', `${frame.frameId} 的高度差 ${difference} 大于 1，返回 -1 表示此子树已失衡。`);
    } else {
      frame.returnValue = 1 + Math.max(frame.leftHeight, frame.rightHeight);
      append('return-height', `${frame.frameId} 的子树全部平衡，返回自身一层加较大孩子高度 = ${frame.returnValue}。`);
    }
    frames.pop();
    return frame.returnValue;
  };

  const height = heightOrFail(parsed.rootId);
  finalResult = height !== -1;
  append('finish-method', `heightOrFail(root) 返回 ${height}；isBalanced 最终返回 ${finalResult}。`, 'final-balance');
  const trace = await finalizeTrace({ problemId: '110', algorithmVersion: ALGORITHM_VERSION,
    referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots,
    finalOutput: { kind: 'boolean', value: finalResult } });
  if (JSON.stringify(trace.finalOutput) !== JSON.stringify(expectedOutput('110', input))) throw new Error('参考平衡模型与独立契约期望不一致');
  return trace;
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-null') {
    const value = snapshot.variables.find(variable => variable.name === 'node == null')?.value;
    if (value?.kind !== 'boolean') throw new Error('空树检查点缺少布尔状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：最外层 heightOrFail 的 node 是否为 null？',
      answer: { kind: 'choice', optionId: value.value ? 'is-null' : 'not-null' },
      options: [{ id: 'is-null', label: '是，空树' }, { id: 'not-null', label: '否，有根节点' }], explanation: snapshot.explanation };
  }
  if (snapshot.stepId === 'check-left-failure') {
    const value = snapshot.variables.find(variable => variable.name === 'leftHeight')?.value;
    if (value?.kind !== 'int') throw new Error('左高度检查点缺少整数状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：根节点左子树返回的高度是多少？若内部已失衡，填写 -1。',
      answer: { kind: 'int', value: value.value }, explanation: snapshot.explanation };
  }
  const result = snapshot.variables.find(variable => variable.name === '整树平衡')?.value;
  if (result?.kind !== 'boolean') throw new Error('最终检查点缺少布尔结果');
  return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：整棵树是否平衡？',
    answer: { kind: 'choice', optionId: result.value ? 'balanced' : 'unbalanced' },
    options: [{ id: 'balanced', label: '平衡' }, { id: 'unbalanced', label: '不平衡' }], explanation: snapshot.explanation };
}
