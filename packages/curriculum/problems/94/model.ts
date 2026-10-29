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

interface TreeNodeState {
  id: string;
  value: number;
  leftId: string | null;
  rightId: string | null;
}

interface FrameState {
  frameId: string;
  nodeId: string | null;
  phase: 'enter' | 'await-left' | 'await-right' | 'return';
  leftDepth: null;
  rightDepth: null;
  returnValue: null;
}

interface ParsedTree {
  rootId: string | null;
  nodes: TreeNodeState[];
  depth: number;
}

function parseCompactTree(tokens: readonly (number | null)[]): ParsedTree {
  if (tokens.length === 0) return { rootId: null, nodes: [], depth: 0 };
  const nodes: TreeNodeState[] = [{ id: 't0', value: tokens[0] as number, leftId: null, rightId: null }];
  const queue: { node: TreeNodeState; depth: number }[] = [{ node: nodes[0]!, depth: 1 }];
  let cursor = 1;
  let depth = 1;
  for (let parentIndex = 0; parentIndex < queue.length && cursor < tokens.length; parentIndex++) {
    const parent = queue[parentIndex]!;
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const node: TreeNodeState = { id: `t${nodes.length}`, value, leftId: null, rightId: null };
      parent.node[side] = node.id;
      nodes.push(node);
      queue.push({ node, depth: parent.depth + 1 });
      depth = Math.max(depth, parent.depth + 1);
    }
  }
  return { rootId: 't0', nodes, depth };
}

/** Immutable reference-algorithm states. This does not inspect or execute student Java. */
export async function buildReferenceTrace(raw: TreeInput, inputId: string): Promise<ReferenceTrace> {
  const input = TreeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const parsed = parseCompactTree(input.root);
  if (parsed.nodes.length > 30 || parsed.depth > 8) throw new Error('参考树演示最多 30 个节点、深度最多 8；真实 Java 判题仍支持本站输入上限');
  const byId = new Map(parsed.nodes.map(node => [node.id, node]));
  const frames: FrameState[] = [];
  const values: number[] = [];
  const snapshots: Snapshot[] = [];
  let frameSequence = 0;
  let nullCheck: boolean | undefined;
  let resultInitialized = false;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: 'root', value: { kind: 'reference', objectId: parsed.rootId } },
    ];
    if (resultInitialized) variables.push({ name: '结果长度', value: { kind: 'int', value: values.length } });
    if (active) variables.push(
      { name: 'node', value: { kind: 'reference', objectId: active.nodeId } },
      { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
      { name: '当前阶段', value: { kind: 'string', value: active.phase } },
    );
    if (nullCheck !== undefined) variables.push({ name: 'node == null', value: { kind: 'boolean', value: nullCheck } });
    const structures: State['structures'][number][] = [
      {
        kind: 'tree', id: 'tree', frameSemantics: 'traversal', rootId: parsed.rootId,
        nodes: parsed.nodes.map(node => ({ ...node })),
        frames: frames.map(frame => ({ ...frame })),
      },
    ];
    if (resultInitialized) structures.push({ kind: 'array', id: 'output-prefix', presentation: 'list', values: [...values], indices: [{ name: '最后加入', index: values.length - 1 }] });
    return {
      variables,
      structures,
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state(parsed.rootId === null
      ? '输入为空树，root 为 null。输出 List 还未创建；树对象图为空。'
      : `root 指向 ${parsed.rootId}。t0、t1…是稳定的教学节点身份，与节点值不同。`),
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

  resultInitialized = true;
  append('init-result', '创建空的 ArrayList<Integer>。输出前缀结构只抽象展示它的整数内容，不表示 JVM 对象地址。');
  append('call-root', `把 root 中的引用值复制给辅助方法参数 node；${parsed.rootId ?? 'null'} 是首个实参。`);

  const visit = (nodeId: string | null): void => {
    const frame: FrameState = {
      frameId: `f${frameSequence++}`, nodeId, phase: 'enter',
      leftDepth: null, rightDepth: null, returnValue: null,
    };
    frames.push(frame);
    append('enter-frame', nodeId === null
      ? `${frame.frameId} 收到 null 引用；这次辅助方法调用没有对应的树节点对象。`
      : `${frame.frameId} 收到 ${nodeId} 的引用值；每次递归调用都有独立的参数 node。`);
    nullCheck = nodeId === null;
    append('check-null', `${frame.frameId} 判断 node ${nodeId === null ? '为' : '不为'} null。`,
      frames.length === 1 ? 'root-null-check' : undefined);
    nullCheck = undefined;
    if (nodeId === null) {
      frame.phase = 'return';
      append('return-null', `${frame.frameId} 对空引用直接返回，不追加值；null 不是一个值为 null 的节点，也不表示对象已回收。`);
      frames.pop();
      return;
    }
    const node = byId.get(nodeId);
    if (!node) throw new Error(`参考树包含未知节点：${nodeId}`);
    frame.phase = 'await-left';
    append('call-left', `${frame.frameId} 先访问 ${nodeId}.left → ${node.leftId ?? 'null'}；当前节点尚未加入结果，等待整个左子树完成。`);
    visit(node.leftId);
    frame.phase = 'await-right';
    values.push(node.value);
    append('visit-node', `${frame.frameId} 的左子树已全部完成；现在访问 ${nodeId}（值 ${node.value}），追加其 int 值；右子树随后处理，节点字段不变。`);
    append('call-right', `${frame.frameId} 已追加当前节点，接着访问 ${nodeId}.right → ${node.rightId ?? 'null'}。`);
    visit(node.rightId);
    frame.phase = 'return';
    append('return-visit', `${frame.frameId} 已依次完成左、根、右，辅助方法无返回值；结果保存在共享的 List 对象中。`);
    frames.pop();
  };

  visit(parsed.rootId);
  append('return-result', `辅助方法结束，返回包含 ${values.length} 个整数的 List；结果列表视图只显示参考状态，不是学生程序执行轨迹。`, 'result-return');
  const oracle = expectedOutput('94', input);
  if (oracle.kind !== 'int-array' || JSON.stringify(oracle.values) !== JSON.stringify(values)) {
    throw new Error('中序递归模型与独立迭代栈期望不一致');
  }
  return finalizeTrace({
    problemId: '94', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: oracle,
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-null') {
    const value = snapshot.variables.find(variable => variable.name === 'node == null')?.value;
    if (value?.kind !== 'boolean') throw new Error('空引用预测检查点缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：最外层辅助方法收到的 node 是否为 null？',
      answer: { kind: 'choice', optionId: value.value ? 'is-null' : 'not-null' },
      options: [{ id: 'is-null', label: '是，node 为 null' }, { id: 'not-null', label: '否，node 指向节点' }],
      explanation: snapshot.explanation,
    };
  }
  if (snapshot.stepId === 'return-result') {
    const output = snapshot.structures.find(structure => structure.kind === 'array' && structure.id === 'output-prefix');
    if (output?.kind !== 'array') throw new Error('结果预测检查点缺少输出前缀');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：返回 List 的整数顺序是什么？按 [1,2,3] 格式填写，空树写 []。',
      answer: { kind: 'text', value: JSON.stringify(output.values) },
      explanation: snapshot.explanation,
    };
  }
  throw new Error(`未知的 94 预测步骤：${snapshot.stepId}`);
}
