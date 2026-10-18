import { ContainerWaterInputSchema, type ContainerWaterInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Deterministic model of the preset reference, not an interpreter for student Java. */
export async function buildReferenceTrace(raw: ContainerWaterInput, inputId: string): Promise<ReferenceTrace> {
  const input = ContainerWaterInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.height.length > 30) throw new Error('参考演示最多显示 30 个数组项；真实判题仍支持 10000 项');
  const height = [...input.height];
  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let best: number | undefined;
  let width: number | undefined;
  let shorter: number | undefined;
  let area: number | undefined;
  let loopCondition: boolean | undefined;
  let moveLeft: boolean | undefined;
  let hasReturned = false;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [{ name: 'height', value: { kind: 'reference', objectId: 'height' } }];
    const indices: { name: string; index: number }[] = [];
    if (left !== undefined) { variables.push({ name: 'left', value: { kind: 'int', value: left } }); indices.push({ name: 'left', index: left }); }
    if (right !== undefined) { variables.push({ name: 'right', value: { kind: 'int', value: right } }); indices.push({ name: 'right', index: right }); }
    if (best !== undefined) variables.push({ name: 'best', value: { kind: 'int', value: best } });
    if (width !== undefined) variables.push({ name: 'width', value: { kind: 'int', value: width } });
    if (shorter !== undefined) variables.push({ name: 'shorter', value: { kind: 'int', value: shorter } });
    if (area !== undefined) variables.push({ name: 'area', value: { kind: 'int', value: area } });
    if (loopCondition !== undefined) variables.push({ name: 'left < right', value: { kind: 'boolean', value: loopCondition } });
    if (moveLeft !== undefined) variables.push({ name: '本轮 height[left] <= height[right]', value: { kind: 'boolean', value: moveLeft } });
    if (hasReturned && best !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: best } });
    return { variables, structures: [{ kind: 'array', id: 'height', values: [...height], indices }], explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('方法收到 height 的引用值；数组不复制也不修改，局部指针与面积变量尚未声明。数组项表示竖线高度，下标表示横坐标。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  left = 0;
  append('init-left', 'left=0，先选择最左边的竖线。');
  right = height.length - 1;
  append('init-right', `right=${right}，先选择最右边的竖线；两端的横向距离最大。`);
  best = 0;
  append('init-best', 'best=0；它记录已检查过的配对面积的最大值，还没有检查任何配对。');
  let firstArea = true;
  let firstChoice = true;
  while (true) {
    // Java's block-local width/shorter/area cease to be in scope after this loop body.
    width = undefined; shorter = undefined; area = undefined; moveLeft = undefined;
    loopCondition = left < right;
    append('check-loop', loopCondition ? `候选区间 [${left},${right}] 仍有两个不同位置，计算当前两端围出的面积。` : `left=right=${left}，已经没有两个不同位置可配对；所有排除的配对都不可能超过 best=${best}。`);
    if (!loopCondition) break;
    loopCondition = undefined;
    width = right - left;
    append('compute-width', `两条竖线位于下标 ${left} 和 ${right}，宽度 width=${right}-${left}=${width}；距离不包含额外的 +1。`);
    shorter = Math.min(height[left]!, height[right]!);
    append('compute-shorter', `两端高度为 ${height[left]} 和 ${height[right]}，水位受较短一端限制，shorter=${shorter}。`);
    area = width * shorter;
    append('compute-area', `当前配对 (${left},${right}) 的面积 area=${width}×${shorter}=${area}；中间竖线不会缩小这个容器。`, firstArea ? 'first-area' : undefined);
    firstArea = false;
    best = Math.max(best, area);
    append('update-best', `先记录本轮面积，再移动指针。best 更新为 ${best}；best 不会因为后面的面积变小而减小。`);
    moveLeft = height[left]! <= height[right]!;
    append('choose-side', moveLeft ? `左端高度 ${height[left]} 不高于右端 ${height[right]}。固定左端向内配对，宽度更小且短板不会超过 ${height[left]}，面积不可能超过本轮，因此可排除左端。${height[left] === height[right] ? '两端等高时任意一端都可排除；本参考固定移动左端。' : ''}` : `右端高度 ${height[right]} 较短。固定右端向内配对，宽度更小且短板不会超过 ${height[right]}，面积不可能超过本轮，因此可排除右端。`, firstChoice ? 'first-side' : undefined);
    firstChoice = false;
    const oldLeft = left;
    const oldRight = right;
    if (moveLeft) {
      left++;
      append('move-left', `left 从 ${oldLeft} 移到 ${left}，right 保持 ${right}。width、shorter、area 仍保存移动前配对 (${oldLeft},${oldRight}) 的本轮结果；下一轮才重算新配对。`);
    } else {
      right--;
      append('move-right', `right 从 ${oldRight} 移到 ${right}，left 保持 ${left}。width、shorter、area 仍保存移动前配对 (${oldLeft},${oldRight}) 的本轮结果；下一轮才重算新配对。`);
    }
  }
  hasReturned = true;
  append('return-best', `返回最大面积 ${best}。这是参考算法模型的最终值；学生 Java 是否得到相同结果须真实编译和运行判定。`);
  return finalizeTrace({ problemId: '11', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: best } });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  if (snapshot.stepId === 'compute-area') {
    const area = snapshot.variables.find(variable => variable.name === 'area')?.value;
    if (area?.kind !== 'int') throw new Error('11 面积预测缺少 area 状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：按当前两端计算，本轮 area 是多少？', answer: { kind: 'int', value: area.value }, explanation: snapshot.explanation };
  }
  if (snapshot.stepId === 'choose-side') {
    const choice = snapshot.variables.find(variable => variable.name === '本轮 height[left] <= height[right]')?.value;
    if (choice?.kind !== 'boolean') throw new Error('11 移动预测缺少比较状态');
    return { checkpointId: snapshot.checkpointId, prompt: '先预测，再揭示：本参考下一步会移动哪一端？（等高时固定移动 left）', options: [{ id: 'left', label: 'left++，排除左端' }, { id: 'right', label: 'right--，排除右端' }], answer: { kind: 'choice', optionId: choice.value ? 'left' : 'right' }, explanation: snapshot.explanation };
  }
  throw new Error('未知的 11 预测检查点');
}
