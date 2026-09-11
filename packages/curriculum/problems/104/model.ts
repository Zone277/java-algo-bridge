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
  leftDepth: number | null;
  rightDepth: number | null;
  returnValue: number | null;
}

interface ParsedTree {
  rootId: string | null;
  nodes: TreeNodeState[];
}

function parseCompactTree(tokens: readonly (number | null)[]): ParsedTree {
  if (tokens.length === 0) return { rootId: null, nodes: [] };
  const nodes: TreeNodeState[] = [{ id: 't0', value: tokens[0] as number, leftId: null, rightId: null }];
  const queue: TreeNodeState[] = [nodes[0]!];
  let cursor = 1;
  let nextId = 1;
  for (let parentIndex = 0; parentIndex < queue.length && cursor < tokens.length; parentIndex++) {
    const parent = queue[parentIndex]!;
    for (const side of ['leftId', 'rightId'] as const) {
      if (cursor >= tokens.length) break;
      const value = tokens[cursor++]!;
      if (value === null) continue;
      const child: TreeNodeState = { id: `t${nextId++}`, value, leftId: null, rightId: null };
      parent[side] = child.id;
      nodes.push(child);
      queue.push(child);
    }
  }
  return { rootId: 't0', nodes };
}

/** Pure recursion model for the preset solution. It never evaluates student Java. */
export async function buildReferenceTrace(raw: TreeInput, inputId: string): Promise<ReferenceTrace> {
  const input = TreeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  const parsed = parseCompactTree(input.root);
  const byId = new Map(parsed.nodes.map(node => [node.id, node]));
  const frames: FrameState[] = [];
  const snapshots: Snapshot[] = [];
  let frameSequence = 0;
  let nullCheck: boolean | undefined;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const active = frames.at(-1);
    const variables: State['variables'][number][] = [
      { name: 'root', value: { kind: 'reference', objectId: parsed.rootId } },
    ];
    if (active) {
      variables.push(
        { name: '当前栈帧', value: { kind: 'string', value: active.frameId } },
        { name: '当前节点', value: { kind: 'reference', objectId: active.nodeId } },
        { name: '当前阶段', value: { kind: 'string', value: active.phase } },
      );
      if (active.leftDepth !== null) variables.push({ name: 'leftDepth', value: { kind: 'int', value: active.leftDepth } });
      if (active.rightDepth !== null) variables.push({ name: 'rightDepth', value: { kind: 'int', value: active.rightDepth } });
      if (active.returnValue !== null) variables.push({ name: '本次返回值', value: { kind: 'int', value: active.returnValue } });
    }
    if (nullCheck !== undefined) variables.push({ name: 'root == null', value: { kind: 'boolean', value: nullCheck } });
    return {
      variables,
      structures: [{
        kind: 'tree', id: 'tree', rootId: parsed.rootId,
        nodes: parsed.nodes.map(node => ({ ...node })),
        frames: frames.map(frame => ({ ...frame })),
      }],
      explanation,
    };
  };

  const initialState: State = {
    snapshotId: 'initial',
    ...state(parsed.rootId === null
      ? '输入为空树，root 保存 null。此时还没有递归调用栈帧。'
      : `输入树的根引用指向 ${parsed.rootId}。节点对象和 left/right 字段已经由可信适配器构造完成。`),
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

  const visit = (nodeId: string | null): number => {
    const frame: FrameState = {
      frameId: `f${frameSequence++}`,
      nodeId,
      phase: 'enter',
      leftDepth: null,
      rightDepth: null,
      returnValue: null,
    };
    frames.push(frame);
    append('enter-frame', nodeId === null
      ? `${frame.frameId} 收到 null 引用。它是一次真实的方法调用，但没有对应的树节点对象。`
      : `${frame.frameId} 收到节点 ${nodeId} 的引用值；每次递归调用都有独立的参数和局部变量。`);

    nullCheck = nodeId === null;
    append('check-null', nodeId === null
      ? `${frame.frameId} 判断参数为 null，应直接返回深度 0。`
      : `${frame.frameId} 判断参数不是 null，需要分别求左右子树深度。`,
    frames.length === 1 ? 'root-null-check' : undefined);
    nullCheck = undefined;

    if (nodeId === null) {
      frame.phase = 'return';
      frame.returnValue = 0;
      append('return-null', `${frame.frameId} 对空树返回 0；null 只表示没有节点引用，不表示某个对象刚被垃圾回收。`, frames.length === 1 ? 'root-return-depth' : undefined);
      frames.pop();
      return 0;
    }

    const node = byId.get(nodeId);
    if (!node) throw new Error(`参考树包含未知节点：${nodeId}`);
    frame.phase = 'await-left';
    append('await-left', `${frame.frameId} 暂停在节点 ${nodeId}，调用左子树 ${node.leftId ?? 'null'}；当前栈帧会保留在栈底一侧等待结果。`);
    frame.leftDepth = visit(node.leftId);

    frame.phase = 'await-right';
    append('await-right', `左子调用已弹栈，${frame.frameId} 恢复并得到 leftDepth=${frame.leftDepth}；现在调用右子树 ${node.rightId ?? 'null'}。`);
    frame.rightDepth = visit(node.rightId);

    frame.phase = 'return';
    frame.returnValue = 1 + Math.max(frame.leftDepth, frame.rightDepth);
    append('return-depth', `${frame.frameId} 得到左右深度 ${frame.leftDepth} 与 ${frame.rightDepth}，把当前节点这一层加 1，返回 ${frame.returnValue}。`, frames.length === 1 ? 'root-return-depth' : undefined);
    frames.pop();
    return frame.returnValue;
  };

  const result = visit(parsed.rootId);
  return finalizeTrace({
    problemId: '104', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: expectedOutput('104', input),
  }).then(trace => {
    if (trace.finalOutput.kind !== 'int' || trace.finalOutput.value !== result) throw new Error('参考递归模型与契约期望深度不一致');
    return trace;
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'check-null') {
    const value = snapshot.variables.find(variable => variable.name === 'root == null')?.value;
    if (value?.kind !== 'boolean') throw new Error('空引用预测检查点缺少布尔状态');
    return {
      checkpointId: snapshot.checkpointId,
      prompt: '先预测，再揭示：当前最外层参数 root 是否为 null？',
      answer: { kind: 'choice', optionId: value.value ? 'is-null' : 'not-null' },
      options: [
        { id: 'is-null', label: '是，root 为 null' },
        { id: 'not-null', label: '否，root 指向节点' },
      ],
      explanation: snapshot.explanation,
    };
  }
  const value = snapshot.variables.find(variable => variable.name === '本次返回值')?.value;
  if (value?.kind !== 'int') throw new Error('深度预测检查点缺少整数返回值');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: '先预测，再揭示：最外层 maxDepth 调用最终返回多少？',
    answer: { kind: 'int', value: value.value },
    explanation: snapshot.explanation,
  };
}
