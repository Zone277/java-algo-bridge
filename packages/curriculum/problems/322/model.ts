import { CoinChangeInputSchema, expectedOutput, type CoinChangeInput, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { codeRange, finalizeTrace } from '../../model-utils.js';
import { ALGORITHM_VERSION, REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'];
type Snapshot = ReferenceTrace['snapshots'][number];
const DP_ID = 'dp：状态 k 对应 dp[k+1]（dp[0] 单列）';

export async function buildReferenceTrace(raw: CoinChangeInput, inputId: string): Promise<ReferenceTrace> {
  const input = CoinChangeInputSchema.parse(raw);
  if (!inputId.trim()) throw new Error('演示输入标识不能为空');
  if (input.amount > 30) throw new Error('参考状态演示金额最多 30；真实判题金额支持 10000');
  const coins = [...input.coins];
  const amount = input.amount;
  const snapshots: Snapshot[] = [];
  const unreachable = amount + 1;
  const dp = Array.from({ length: amount + 1 }, () => 0);
  let sentinelDeclared = false;
  let dpAllocated = false;
  let value: number | undefined;
  let j: number | undefined;
  let coin: number | undefined;
  let fit: boolean | undefined;
  let known = 0;
  let processed = 0;
  let baseReady = false;
  const state = (explanation: string): Omit<State, 'snapshotId'> => {
    const variables: State['variables'][number][] = [
      { name: 'coins', value: { kind: 'reference', objectId: 'coins' } },
      { name: 'amount', value: { kind: 'int', value: amount } },
    ];
    for (const [name, number] of [['unreachable', sentinelDeclared ? unreachable : undefined], ['value', value], ['j', j], ['coin', coin]] as const) {
      if (number !== undefined) variables.push({ name, value: { kind: 'int', value: number } });
    }
    if (fit !== undefined) variables.push({ name: 'coin <= value', value: { kind: 'boolean', value: fit } });
    const structures: State['structures'][number][] = [{ kind: 'array', id: 'coins', values: [...coins], indices: j === undefined ? [] : [{ name: 'j', index: j }] }];
    if (dpAllocated) {
      variables.push({ name: 'dp', value: { kind: 'reference', objectId: DP_ID } }, { name: 'dp[0]', value: { kind: 'int', value: dp[0]! } });
      structures.push({ kind: 'dp', id: DP_ID, values: dp.slice(1), activeIndex: value !== undefined && value <= amount ? value - 1 : null });
    }
    if (baseReady) variables.push(
      { name: '已完成金额（教学标记）', value: { kind: 'int', value: known } },
      { name: '已检查面值数量（教学标记）', value: { kind: 'int', value: processed } },
    );
    return { variables, structures, explanation };
  };
  const initialState: State = { snapshotId: 'initial', ...state('coins 是数组引用，amount 是整数值。dp 尚未分配；演示跟踪预置参考解法，不是学生 Java 的执行轨迹。') };
  const append = (stepId: string, explanation: string, checkpointId?: string) => {
    if (snapshots.length >= 2000) throw new Error('参考快照超限，拒绝不完整演示');
    snapshots.push({ snapshotId: `${stepId}-${snapshots.length}`, stepId, codeRange: codeRange(REFERENCE_STEP_MAP, stepId), ...state(explanation), ...(checkpointId ? { checkpointId } : {}) });
  };
  sentinelDeclared = true;
  append('init-sentinel', `所有面值至少为 1，凑出金额 ${amount} 最多使用 ${amount} 枚；用 ${unreachable} 表示不可达，不用 Integer.MAX_VALUE。`, 'sentinel');
  dpAllocated = true;
  append('allocate-dp', 'new int[] 创建的元素初值确实为 0；这些默认零尚不表示正金额免费可达。dp[0] 单列，表格状态 k 对应真实数组 dp[k+1]。');
  dp.fill(unreachable);
  append('fill-dp', `Arrays.fill 修改数组对象，把包括 dp[0] 在内的所有元素填为哨兵 ${unreachable}；不是 null，也不是尚未分配。`);
  dp[0] = 0; baseReady = true;
  append('set-zero', '凑出金额 0 需要 0 枚硬币；恢复基例 dp[0]=0，正金额仍为不可达哨兵。');
  for (let current = 1; current <= amount + 1; current++) {
    value = current; j = undefined; coin = undefined; fit = undefined; processed = 0;
    append('check-value', value <= amount ? `开始金额 ${value}。所有更小金额已得到最优值；本金额先保持哨兵，逐一尝试最后一枚硬币。` : `value=${value} 超过 amount=${amount}，循环结束。`);
    if (value > amount) break;
    for (let index = 0; index <= coins.length; index++) {
      j = index; coin = undefined; fit = undefined; processed = j;
      if (j === coins.length) known = value;
      append('check-coin', j < coins.length ? `准备尝试 coins[${j}]，此前已检查 ${j} 个面值。` : `本金额全部面值均已尝试，dp[${value}]=${dp[value]} 已是最优值或哨兵。j 等于数组长度，不读取 coins[j]。`);
      if (j === coins.length) break;
      coin = coins[j]!;
      append('read-coin', `coin 复制 coins[${j}]=${coin} 的整数值。相同面值可重复出现，但不影响最小值；每种面值都可无限次使用。`);
      fit = coin <= value;
      if (!fit) processed = j + 1;
      append('check-fit', fit ? `${coin} <= ${value}，余款 ${value - coin} 非负且小于当前金额，可以读取其已完成状态。` : `${coin} > ${value}，跳过该面值，不访问负下标，也不进行 coin 加法。`);
      if (fit) {
        const before = dp[value]!;
        const candidate = dp[value - coin]! + 1;
        dp[value] = Math.min(before, candidate); processed = j + 1;
        append('update-dp', `把 ${coin} 当作最后一枚：余款最优值 ${dp[value - coin]} 加 1 得到 ${candidate}；与旧值 ${before} 取 min，dp[${value}]=${dp[value]}。若余款是哨兵，哨兵+1 更大，不能伪造可达解。`);
      }
    }
  }
  value = undefined; j = undefined; coin = undefined; fit = undefined;
  const result = dp[amount] === unreachable ? -1 : dp[amount]!;
  append('return-count', `dp[${amount}]=${dp[amount]}，${result === -1 ? '等于哨兵，所以返回 -1：没有硬币组合能凑出金额。' : `返回最少硬币数 ${result}。`}循环局部变量已离开作用域。`, 'final-count');
  const finalOutput = { kind: 'int' as const, value: result };
  if (JSON.stringify(finalOutput) !== JSON.stringify(expectedOutput('322', input))) throw new Error('322 模型与独立可信期望不一致');
  return finalizeTrace({ problemId: '322', algorithmVersion: ALGORITHM_VERSION, referenceSource: REFERENCE_SOURCE, inputId, input, initialState, snapshots, finalOutput });
}

export function predictionAt(trace: ReferenceTrace, index: number): ReferencePrediction | null {
  const snapshot = trace.snapshots[index];
  if (!snapshot?.checkpointId) return null;
  const first = snapshot.stepId === 'init-sentinel';
  const answer = first ? snapshot.variables.find(variable => variable.name === 'unreachable')?.value : trace.finalOutput;
  if (answer?.kind !== 'int') throw new Error('硬币数预测缺少整数状态');
  return {
    checkpointId: snapshot.checkpointId,
    prompt: first ? '先预测，再揭示：本次 amount 对应的不可达哨兵 unreachable 是多少？' : '先预测，再揭示：这组硬币与金额，最后应该返回最少枚数多少（无解填 -1）？',
    answer: { kind: 'int', value: answer.value }, explanation: snapshot.explanation,
  };
}
