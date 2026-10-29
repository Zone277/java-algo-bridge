export const ALGORITHM_VERSION = '338-low-bit-dp-v1';

export const STARTER_SOURCE = `class Solution {
    public int[] countBits(int n) {
        // 返回下标 0 到 n 每个整数的二进制 1 的个数。
        throw new UnsupportedOperationException("请完成 countBits 方法");
    }
}
`;

export const REFERENCE_SOURCE = `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            bits[i] = bits[i >> 1] + (i & 1);
        }
        return bits;
    }
}
`;

export const REFERENCE_STEP_MAP = [
  { stepId: 'allocate-bits', startLine: 3, endLine: 3 },
  { stepId: 'check-index', startLine: 4, endLine: 4 },
  { stepId: 'assign-count', startLine: 5, endLine: 5 },
  { stepId: 'return-bits', startLine: 7, endLine: 7 },
] as const;

// A parity bit is only the low bit; it omits the ones in the higher bits.
export const WRONG_PARITY_ONLY_SOURCE = `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            bits[i] = i & 1;
        }
        return bits;
    }
}
`;

// Summing the low bits of all preceding integers is not the popcount of i.
export const WRONG_PREVIOUS_PLUS_PARITY_SOURCE = `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            bits[i] = bits[i - 1] + (i & 1);
        }
        return bits;
    }
}
`;
