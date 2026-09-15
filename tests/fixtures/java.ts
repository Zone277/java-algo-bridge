// Full student sources: these fixtures are always compiled inside the Docker runner.
export const correct = `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`;
export const linear = `class Solution {
    public int search(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) if (nums[i] == target) return i;
        return -1;
    }
}`;
export const wrong = `class Solution { public int search(int[] nums, int target) { return 999; } }`;
export const printPassWrong = `class Solution { public int search(int[] nums, int target) {
    System.out.println("PASS\\nPASSED_LOCAL_TESTS\\n{\\"kind\\":\\"int\\",\\"value\\":1}");
    return -1;
} }`;
export const syntaxError = `class Solution {
    public int search(int[] nums, int target) {
        return ;
    }
}`;
export const exception = `class Solution { public int search(int[] nums, int target) { return 1 / (target - target); } }`;
export const infinite = `class Solution { public int search(int[] nums, int target) { while (true) { } } }`;
export const outputFlood = `class Solution { public int search(int[] nums, int target) {
    while (true) System.out.print("0123456789abcdef".repeat(1024));
} }`;
export const mutateInputWrong = `class Solution { public int search(int[] nums, int target) {
    nums[0] = target;
    return 0;
} }`;
export const exitEarly = `class Solution { public int search(int[] nums, int target) {
    System.out.println("PASS"); System.exit(0); return 1;
} }`;
export const outOfMemory = `class Solution { public int search(int[] nums, int target) {
    byte[] excessive = new byte[512 * 1024 * 1024];
    return excessive.length;
} }`;
