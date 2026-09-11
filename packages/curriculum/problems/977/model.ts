import { SortedSquaresInputSchema, type ReferencePrediction, type ReferenceTrace, type SortedSquaresInput } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type Snapshot = ReferenceTrace['snapshots'][number];
type State = Omit<ReferenceTrace['initialState'], 'snapshotId'>;

/** Preset reference algorithm only. It never reads or interprets student Java. */
export async function buildReferenceTrace(rawInput: SortedSquaresInput, inputId: string): Promise<ReferenceTrace & { readonly finalOutput: { readonly kind: 'int-array'; readonly values: readonly number[] } }> {
  const input = SortedSquaresInputSchema.parse(rawInput);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length * 7 + 6 > 2000) throw new Error('参考模型超过 2000 快照上限；未截断生成轨迹。真实判题仍支持本站公布的数组上限。');
  const nums = [...input.nums];
  const result = Array(nums.length).fill(0) as number[];
  let resultCreated = false;
  let left: number | undefined;
  let right: number | undefined;
  let write: number | undefined;
  let leftSquare: number | undefined;
  let rightSquare: number | undefined;
  let condition: boolean | undefined;
  let chooseLeft: boolean | undefined;
  let returned = false;
  const snapshots: Snapshot[] = [];

  const state = (explanation: string): State => {
    const variables: State['variables'][number][] = [{ name: 'nums', value: { kind: 'reference', objectId: 'nums' } }];
    const numsIndices: { name: string; index: number }[] = [];
    const resultIndices: { name: string; index: number }[] = [];
    for (const [name, value] of [['left', left], ['right', right]] as const) {
      if (value !== undefined) { variables.push({ name, value: { kind: 'int', value } }); numsIndices.push({ name, index: value }); }
    }
    if (resultCreated) variables.push({ name: 'result', value: { kind: 'reference', objectId: 'result' } });
    if (write !== undefined) { variables.push({ name: 'write', value: { kind: 'int', value: write } }); resultIndices.push({ name: 'write', index: write }); }
    if (leftSquare !== undefined) variables.push({ name: 'leftSquare', value: { kind: 'int', value: leftSquare } });
    if (rightSquare !== undefined) variables.push({ name: 'rightSquare', value: { kind: 'int', value: rightSquare } });
    if (condition !== undefined) variables.push({ name: '循环条件', value: { kind: 'boolean', value: condition } });
    if (chooseLeft !== undefined) variables.push({ name: '左侧平方更大', value: { kind: 'boolean', value: chooseLeft } });
    if (returned) variables.push({ name: '返回值', value: { kind: 'reference', objectId: 'result' } });
    return {
      variables,
      structures: [
        { kind: 'array', id: 'nums', values: [...nums], indices: numsIndices },
        ...(resultCreated ? [{ kind: 'array' as const, id: 'result', values: [...result], indices: resultIndices }] : []),
      ],
      explanation,
    };
  };
  const initialState: ReferenceTrace['initialState'] = { snapshotId: 'initial', ...state('方法收到 nums 引用值；尚未创建结果数组。输入数组不会被这份参考解法修改。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成完整轨迹');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };

  resultCreated = true;
  append('create-result', `new int[nums.length] 创建长度 ${nums.length} 的新数组；Java 会把尚未写入的 int 单元初始化为 0。哪些位置已确定由 write 边界说明。`);
  left = 0; append('init-left', 'left = 0，先观察原数组最左端。');
  right = nums.length - 1; append('init-right', `right = length - 1 = ${right}，先观察原数组最右端。`);
  write = nums.length - 1; append('init-write', `write = ${write}，结果从末尾向前填写；write 右侧才是已经确定的后缀。`);
  let firstWrite = true;
  let firstMoveWrite = true;
  while (true) {
    leftSquare = undefined; rightSquare = undefined; chooseLeft = undefined;
    condition = left <= right;
    append('check-loop', condition ? `[${left}, ${right}] 仍有未处理元素。` : `left=${left} > right=${right}，所有元素都已处理。`);
    if (!condition) break;
    condition = undefined;
    const leftValue = nums[left]!;
    leftSquare = leftValue * leftValue;
    append('square-left', `nums[${left}] = ${leftValue}，左端平方为 ${leftSquare}。`);
    const rightValue = nums[right]!;
    rightSquare = rightValue * rightValue;
    append('square-right', `nums[${right}] = ${rightValue}，右端平方为 ${rightSquare}。`);
    chooseLeft = leftSquare > rightSquare;
    append('choose-side', `${leftSquare} > ${rightSquare} 为 ${chooseLeft}；较大平方应放到当前结果末端。`);
    if (chooseLeft) {
      result[write] = leftSquare;
      append('write-left', `result[${write}] = ${leftSquare}。此时下标 ${write} 到末尾是已经确定的有序后缀。`, firstWrite ? 'first-write-value' : undefined);
      firstWrite = false;
      left++;
      append('move-left', `左端元素已使用，left 移到 ${left}；这一步不再改 result。`);
    } else {
      result[write] = rightSquare;
      append('write-right', `result[${write}] = ${rightSquare}。相等时取右端也正确；下标 ${write} 到末尾已经确定。`, firstWrite ? 'first-write-value' : undefined);
      firstWrite = false;
      right--;
      append('move-right', `右端元素已使用，right 移到 ${right}；这一步不再改 result。`);
    }
    write--;
    append('move-write', `write 移到 ${write}；下一轮在更靠前的位置写入不大于已确定后缀的平方。`, firstMoveWrite ? 'first-write-index' : undefined);
    firstMoveWrite = false;
  }
  condition = undefined; returned = true;
  append('return-result', '返回 result 数组引用。nums 与 result 是不同数组对象；输出按非降序排列。');
  const trace = await finalizeTrace({ problemId: '977', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input: { nums }, initialState, snapshots, finalOutput: { kind: 'int-array', values: [...result] } });
  return trace as ReferenceTrace & { readonly finalOutput: { readonly kind: 'int-array'; readonly values: readonly number[] } };
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const writeValue = snapshot.variables.find(variable => variable.name === 'write')?.value;
  if (writeValue?.kind !== 'int') throw new Error('预测检查点缺少 write');
  if (snapshot.stepId === 'move-write') return { checkpointId: snapshot.checkpointId, prompt: '先预测：第一次写入完成后，write 会移动到哪个下标？', answer: { kind: 'int', value: writeValue.value }, explanation: snapshot.explanation };
  const result = snapshot.structures.find(structure => structure.kind === 'array' && structure.id === 'result');
  if (!result || result.kind !== 'array') throw new Error('预测检查点缺少 result 数组');
  return { checkpointId: snapshot.checkpointId, prompt: `先预测：当前 result[${writeValue.value}] 将写入多少？`, answer: { kind: 'int', value: result.values[writeValue.value]! }, explanation: snapshot.explanation };
}
