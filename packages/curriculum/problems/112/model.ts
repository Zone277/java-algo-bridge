import {
  PathSumInputSchema,
  expectedOutput,
  type PathSumInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

interface NodeState {
  id: string;
  value: number;
  leftId: string | null;
  rightId: string | null;
  depth: number;
}

interface FrameState {
  frameId: string;
  nodeId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  target: number;
  remaining: number | null;
  leaf: boolean | null;
  result: boolean | null;
}

function parseCompactTree(tokens: readonly (number | null)[]): { rootId: string | null; nodes: NodeState[]; depth: number } {
  if (tokens.length === 0) return { rootId: null, nodes: [], depth: 0 };
  const nodes: NodeState[] = [{ id: 't0', value: tokens[0] as number, leftId: null, rightId: null, depth: 1 }];
  const queue = [nodes[0]!];
  let cursor = 1;
  let depth = 1;
  for (let parentIndex = 0; parentIndex < queue.length && cursor < tokens.length; parentIndex++) {
    const parent = queue[parentIndex]!;
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const child: NodeState = { id: `t${nodes.length}`, value, leftId: null, rightId: null, depth: parent.depth + 1 };
      parent[side] = child.id;
      nodes.push(child);
      queue.push(child);
      depth = Math.max(depth, child.depth);
    }
  }
  return { rootId: 't0', nodes, depth };
}

/** Models only the fixed reference method; it never executes or infers behavior from student Java. */
export async function buildReferenceTrace(raw: PathSumInput, inputId: string): Promise<ReferenceTrace> {
  const input = PathSumInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const parsed = parseCompactTree(input.root);
  if (parsed.nodes.length > 30 || parsed.depth > 8) throw new Error('参考树演示最多 30 个节点、深度最多 8；真实 Java 判题仍支持本站输入上限');
  const byId = new Map(parsed.nodes.map(node => [node.id, node]));
  const frames: FrameState[] = [];
  const snapshots: Snapshot[] = [];
  let sequence = 0;
  let nullCheck: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const pathValues = frames.flatMap(frame => {
      const node = frame.nodeId === null ? null : byId.get(frame.nodeId);
      return node ? [node.value] : [];
    });
    const variables: State['variables'][number][] = [
      { name: '输入 targetSum', value: { kind: 'int', value: input.targetSum } },
      { name: '输入 root', value: { kind: 'reference', objectId: parsed.rootId } },
    ];
    if (active) {
      variables.push(
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前 root', value: { kind: 'reference', objectId: active.nodeId } },
        { name: '当前 targetSum', value: { kind: 'int', value: active.target } },
      );
      if (active.remaining !== null) variables.push({ name: 'remaining', value: { kind: 'int', value: active.remaining } });
      if (active.leaf !== null) variables.push({ name: '是叶节点', value: { kind: 'boolean', value: active.leaf } });
      if (active.result !== null) variables.push({ name: '本次返回值', value: { kind: 'boolean', value: active.result } });
    }
    if (nullCheck !== undefined) variables.push({ name: 'root == null', value: { kind: 'boolean', value: nullCheck } });
    variables.push({ name: '路径前缀和', value: { kind: 'int', value: pathValues.reduce((sum, value) => sum + value, 0) } });
    return {
      variables,
      structures: [
        {
          kind: 'tree', id: 'tree', frameSemantics: 'traversal', rootId: parsed.rootId,
          nodes: parsed.nodes.map(node => ({ id: node.id, value: node.value, leftId: node.leftId, rightId: node.rightId })),
          frames: frames.map(frame => ({ frameId: frame.frameId, nodeId: frame.nodeId, phase: frame.phase, leftDepth: null, rightDepth: null, returnValue: null })),
        },
        { kind: 'array', id: 'current-path', presentation: 'list', values: pathValues, indices: [] },
      ],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state(parsed.rootId === null
      ? `空数组表示空树，root 为 null；即使目标和是 ${input.targetSum}，也不存在根到叶路径。`
      : `root 指向稳定教学节点 ${parsed.rootId}，目标和为 ${input.targetSum}；尚未进入递归。`),
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

  const visit = (nodeId: string | null, target: number): boolean => {
    const frame: FrameState = {
      frameId: `f${sequence++}`, nodeId, phase: 'enter', target,
      remaining: null, leaf: null, result: null,
    };
    frames.push(frame);
    append('enter-frame', `${frame.frameId} 收到 ${nodeId ?? 'null'} 的引用值与 int 目标值 ${target}；参数均按值传递。`);
    nullCheck = nodeId === null;
    append('check-null', `${frame.frameId} 判断 root ${nodeId === null ? '为' : '不为'} null。`, frames.length === 1 ? 'root-null-check' : undefined);
    nullCheck = undefined;
    if (nodeId === null) {
      frame.phase = 'return';
      frame.result = false;
      append('return-null', `${frame.frameId} 没有节点，返回 false；null 不是值为 0 的叶子。`, frames.length === 1 ? 'root-result' : undefined);
      frames.pop();
      return false;
    }
    const node = byId.get(nodeId);
    if (!node) throw new Error(`参考树包含未知节点：${nodeId}`);
    frame.remaining = target - node.value;
    append('subtract-value', `${frame.frameId} 读取 ${nodeId}.val=${node.value}，新剩余目标 ${target}-${node.value}=${frame.remaining}。`);
    frame.leaf = node.leftId === null && node.rightId === null;
    append('check-leaf', `${nodeId} ${frame.leaf ? '左右孩子均为 null，是叶子' : '仍有孩子，不是叶子'}。只有叶子可以把剩余目标为零判为成功。`);
    if (frame.leaf) {
      frame.phase = 'return';
      frame.result = frame.remaining === 0;
      append('return-leaf', `已到叶子 ${nodeId}，remaining=${frame.remaining}，本次返回 ${frame.result}。`, frames.length === 1 ? 'root-result' : undefined);
      frames.pop();
      return frame.result;
    }
    frame.phase = 'await-left';
    append('call-left', `${frame.frameId} 先检查左孩子 ${node.leftId ?? 'null'}，把剩余目标 ${frame.remaining} 复制给子调用。`);
    const leftFound = visit(node.leftId, frame.remaining);
    let rightFound = false;
    if (!leftFound) {
      frame.phase = 'await-right';
      append('call-right', `左侧返回 false，|| 继续求右侧 ${node.rightId ?? 'null'}；左侧若为 true，Java 会短路而不调用右侧。`);
      rightFound = visit(node.rightId, frame.remaining);
    }
    frame.phase = 'return';
    frame.result = leftFound || rightFound;
    append('return-branches', leftFound
      ? `${frame.frameId} 的左分支已返回 true，|| 短路而没有调用右分支；本次返回 true。`
      : `${frame.frameId} 的左分支为 false、右分支为 ${rightFound}；按 || 返回 ${frame.result}。`, frames.length === 1 ? 'root-result' : undefined);
    frames.pop();
    return frame.result;
  };

  const actual = visit(parsed.rootId, input.targetSum);
  const trace = await finalizeTrace({
    problemId: '112', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'boolean', value: actual },
  });
  if (JSON.stringify(trace.finalOutput) !== JSON.stringify(expectedOutput('112', input))) throw new Error('参考路径模型与独立契约期望不一致');
  return trace;
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-null') {
    const value = snapshot.variables.find(variable => variable.name === 'root == null')?.value;
    if (value?.kind !== 'boolean') throw new Error('空树检查点缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：最外层 root 是否为 null？',
      answer: { kind: 'choice', optionId: value.value ? 'is-null' : 'not-null' },
      options: [{ id: 'is-null', label: '是，空树' }, { id: 'not-null', label: '否，有根节点' }],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '本次返回值')?.value;
  if (value?.kind !== 'boolean') throw new Error('最终结果检查点缺少布尔状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：是否存在和为目标值的完整根到叶路径？',
    answer: { kind: 'choice', optionId: value.value ? 'yes' : 'no' },
    options: [{ id: 'yes', label: '存在' }, { id: 'no', label: '不存在' }],
    explanation: snapshot.explanation,
  };
}
