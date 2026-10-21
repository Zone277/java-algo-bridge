export const ALGORITHM_VERSION = '322-ascending-amount-dp-v1';

export const STARTER_SOURCE = `class Solution {
    public int coinChange(int[] coins, int amount) {
        // 返回最少硬币数；无法凑出时返回 -1。
        throw new UnsupportedOperationException("请完成 coinChange 方法");
    }
}
`;

export const REFERENCE_SOURCE = `import java.util.Arrays;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int unreachable = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, unreachable);
        dp[0] = 0;
        for (int value = 1; value <= amount; value++) {
            for (int j = 0; j < coins.length; j++) {
                int coin = coins[j];
                if (coin <= value) {
                    dp[value] = Math.min(dp[value], dp[value - coin] + 1);
                }
            }
        }
        return dp[amount] == unreachable ? -1 : dp[amount];
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'init-sentinel', startLine: 5, endLine: 5 },
  { stepId: 'allocate-dp', startLine: 6, endLine: 6 },
  { stepId: 'fill-dp', startLine: 7, endLine: 7 },
  { stepId: 'set-zero', startLine: 8, endLine: 8 },
  { stepId: 'check-value', startLine: 9, endLine: 9 },
  { stepId: 'check-coin', startLine: 10, endLine: 10 },
  { stepId: 'read-coin', startLine: 11, endLine: 11 },
  { stepId: 'check-fit', startLine: 12, endLine: 12 },
  { stepId: 'update-dp', startLine: 13, endLine: 13 },
  { stepId: 'return-count', startLine: 17, endLine: 17 },
] as const;
