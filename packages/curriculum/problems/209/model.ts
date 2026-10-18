import {
  MinimumSubarrayInputSchema,
  type MinimumSubarrayInput,
  type ReferencePrediction,
  type ReferenceTrace,
} from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];

/** Deterministic preset algorithm model; student Java is executed through the separate runner. */
export async function buildReferenceTrace(raw: MinimumSubarrayInput, inputId: string): Promise<ReferenceTrace> {
  const input = MinimumSubarrayInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.nums.length > 30) throw new Error('参考演示最多显示 30 项；真实判题仍支持 10000 项');

  const nums = [...input.nums];
  const snapshots: Snapshot[] = [];
  let left: number | undefined;
  let right: number | undefined;
  let sum: number | undefined;
  let best: number | undefined;
  let rightCondition: boolean | undefined;
  let targetCondition: boolean | undefined;
  let result: number | undefined = undefined;
  // These markers describe the elements currently represented by sum, not extra Java locals.
  let sumStart = 0;
  let sumEndExclusive = 0;
  let firstRemoval = true;

  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'nums', value: { kind: 'reference', objectId: 'nums' } },
      { name: 'target', value: { kind: 'int', value: input.target } },
      { name: 'length', value: { kind: 'int', value: nums.length } },
    ];
    const indices: { name: string; index: number }[] = [];
    if (left !== undefined) {
      variables.push({ name: 'left', value: { kind: 'int', value: left } });
      indices.push({ name: 'left', index: left });
    }
    if (right !== undefined) {
      variables.push({ name: 'right', value: { kind: 'int', value: right } });
      indices.push({ name: 'right', index: right });
    }
    if (sum !== undefined) {
      variables.push({ name: 'sum', value: { kind: 'int', value: sum } });
      variables.push({ name: 'sumStart（演示标记）', value: { kind: 'int', value: sumStart } });
      variables.push({ name: 'sumEndExclusive（演示标记）', value: { kind: 'int', value: sumEndExclusive } });
      variables.push({ name: 'sum 区间（演示标记）', value: { kind: 'string', value: `[${sumStart}, ${sumEndExclusive})${sumStart === sumEndExclusive ? ' 空区间' : ''}` } });
    }
    if (best !== undefined) {
      variables.push({ name: 'best', value: { kind: 'int', value: best } });
      variables.push({ name: 'best 含义', value: { kind: 'string', value: best === nums.length + 1 ? 'length + 1 哨兵：尚未找到达标区间' : '已经检查过的达标区间中的最短长度' } });
    }
    if (rightCondition !== undefined) variables.push({ name: 'right < length', value: { kind: 'boolean', value: rightCondition } });
    if (targetCondition !== undefined) variables.push({ name: 'sum >= target', value: { kind: 'boolean', value: targetCondition } });
    if (result !== undefined) variables.push({ name: '返回值', value: { kind: 'int', value: result } });
    return {
      variables,
      structures: [{ kind: 'array', id: 'nums', values: [...nums], indices }],
      explanation,
    };
  };
  const initialState: State = {
    snapshotId: 'initial',
    ...state('方法收到正整数 target 与 nums 数组对象的引用值；尚未定义局部变量。只能选择连续且非空的区间。'),
  };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考模型超过 2000 快照上限，未生成不完整轨迹');
    snapshots.push({
      snapshotId: `${stepId}-${snapshots.length}`,
      stepId,
      codeRange: codeRange(REFERENCE_STEP_MAP, stepId),
      ...state(explanation),
      ...(checkpointId ? { checkpointId } : {}),
    });
  };

  left = 0;
  append('init-left', 'left=0，从首项开始准备窗口；此时 sum 和 best 尚未初始化。');
  sum = 0;
  append('init-sum', 'sum=0，对应空区间 [0,0)。右端元素尚未加入。');
  best = nums.length + 1;
  append('init-best', `best=${best}=length+1，作为“不存在已找到的答案”哨兵。任何合法非空区间长度都不超过 ${nums.length}。`);
  right = 0;

  while (true) {
    rightCondition = right < nums.length;
    append('check-right', rightCondition
      ? `right=${right} 仍在数组内。加入之前，sum=${sum} 对应 [${left},${right})，不包含 nums[right]。`
      : `right=${right} 已到 length。所有右端位置均已处理，best 保留此前最短达标长度。`);
    rightCondition = undefined;
    if (right >= nums.length) break;

    sum += nums[right]!;
    sumEndExclusive = right + 1;
    append('include-right', `加入 nums[${right}]=${nums[right]} 后，sum=${sum} 对应闭区间 [${left},${right}]，也就是半开区间 [${left},${right + 1})。`, right === 0 ? 'first-expansion' : undefined);

    while (true) {
      targetCondition = sum >= input.target;
      append('check-target', targetCondition
        ? `sum=${sum} >= target=${input.target}，当前窗口达标。先记录长度，再尝试去掉左端以找更短答案。`
        : `sum=${sum} < target=${input.target}，停止收缩。因为元素严格为正，再去掉左端只会更小；需要扩展右端。`);
      targetCondition = undefined;
      if (sum < input.target) break;

      best = Math.min(best, right - left + 1);
      append('update-best', `当前连续区间 [${left},${right}] 长度为 ${right - left + 1}，更新 best=${best}。best 只保存已经检查的达标区间长度。`);

      const removed = nums[left]!;
      sum -= removed;
      sumStart = left + 1;
      append('remove-left', `先减去 nums[${left}]=${removed}，sum=${sum} 已对应 [${sumStart},${right + 1})；但 left 变量仍为 ${left}，下一条 left++ 才会同步左边界。`, firstRemoval ? 'first-contraction' : undefined);
      firstRemoval = false;

      left++;
      append('move-left', `left 移到 ${left}，与 sum 的左界重新一致。${left > right ? '现在窗口为空，sum=0；正数 target 保证下一次条件为假。' : '继续检查 sum >= target，达标就还要收缩，而非只执行一次。'}`);
    }

    right++;
    append('move-right', `for 更新把 right 移到 ${right}，sum 仍对应 [${left},${right})；新的 nums[right] 尚未加入。`);
  }

  right = undefined;
  result = best === nums.length + 1 ? 0 : best;
  append('return-result', result === 0
    ? `best 仍为 length+1=${best}，没有非空连续区间达标，返回 0。`
    : `返回最短长度 ${result}。该值来自已检查过的连续达标区间；不是其和，也不是所选元素的下标。`, firstRemoval ? 'first-contraction' : undefined);

  return finalizeTrace({
    problemId: '209', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE,
    inputId, input, initialState, snapshots, finalOutput: { kind: 'int', value: result },
  });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const name = snapshot.stepId === 'return-result' ? '返回值' : 'sum';
  const answer = snapshot.variables.find(variable => variable.name === name)?.value;
  if (answer?.kind !== 'int') throw new Error(`预测检查点缺少 ${name} 的 int 状态`);
  const prompt = snapshot.stepId === 'include-right'
    ? '先预测，再揭示：第一次把 nums[right] 加入窗口后，sum 是多少？'
    : snapshot.stepId === 'remove-left'
      ? '先预测，再揭示：第一次达标后，执行 sum -= nums[left]，新的 sum 是多少？（left++ 尚未执行）'
      : '先预测，再揭示：整段扫描都没有一次达标时，方法应该返回多少？';
  return { checkpointId: snapshot.checkpointId, prompt, answer: { kind: 'int', value: answer.value }, explanation: snapshot.explanation };
}
