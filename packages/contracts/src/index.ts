import { z } from 'zod';
import { LinkedListInputSchema, LINKED_LESSON_VERSION, ListGraphSchema } from './linked-list.js';
export * from './linked-list.js';
export * from './learning.js';

export const LESSON_VERSION = '704-v1';
export const TEST_SUITE_VERSION = '704-tests-v2';
export const REFERENCE_LABEL = '参考解法 · 算法状态演示（非 JVM 调试）';
export const STARTER_SOURCE = `class Solution {
    public int search(int[] nums, int target) {
        // 在这里编写你的 Java 代码，返回目标下标或 -1。
        throw new UnsupportedOperationException("请完成 search 方法");
    }
}
`;
export const ProblemIdSchema = z.enum(['704', '283', '977', '1', '20', '206', '21', '104', '70', '3']);
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const BinarySearchInputSchema = z.strictObject({
  nums: z.array(z.number().int().min(-9999).max(9999)).min(1).max(10000),
  target: z.number().int().min(-9999).max(9999),
}).refine(({ nums }) => nums.every((n, i) => i === 0 || n > nums[i - 1]!), { message: 'nums 必须严格升序且不重复' });
const sourceSchema = z.string().min(1).refine(s => new TextEncoder().encode(s).length <= 65536, '源码不得超过 64 KiB');
const requestBase = { problemId: z.literal('704'), lessonVersion: z.literal(LESSON_VERSION), source: sourceSchema };
const run704 = z.discriminatedUnion('mode', [
  z.strictObject({ ...requestBase, mode: z.literal('run'), input: BinarySearchInputSchema }),
  z.strictObject({ ...requestBase, mode: z.literal('submit') }),
]);
export const RunRequestSchema = z.union([run704, z.discriminatedUnion('mode', [
  z.strictObject({ problemId: z.literal('206'), lessonVersion: z.literal(LINKED_LESSON_VERSION), source: sourceSchema, mode: z.literal('run'), input: LinkedListInputSchema }),
  z.strictObject({ problemId: z.literal('206'), lessonVersion: z.literal(LINKED_LESSON_VERSION), source: sourceSchema, mode: z.literal('submit') }),
])]);
export const RunStatusSchema = z.enum(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT', 'RESOURCE_LIMIT', 'OUTPUT_LIMIT', 'RUNNER_UNAVAILABLE', 'INVALID_INPUT', 'SYSTEM_ERROR', 'CANCELLED']);
export const OutputSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('int'), value: z.number().int().min(-2147483648).max(2147483647) }),
  z.strictObject({ kind: z.literal('boolean'), value: z.boolean() }),
  z.strictObject({ kind: z.literal('int-array'), values: z.array(z.number().int()) }),
  ListGraphSchema,
]);
const ms = z.number().nonnegative();
const count = z.number().int().nonnegative();
export const DiagnosticSchema = z.strictObject({ fileName: z.string(), severity: z.enum(['error', 'warning', 'note']), message: z.string(), line: z.number().int().positive().nullable(), column: z.number().int().positive().nullable(), belongsToStudentSource: z.boolean() });
export const CaseResultSchema = z.strictObject({ caseId: z.string(), inputHash: HashSchema, status: z.enum(['PASSED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT', 'RESOURCE_LIMIT', 'OUTPUT_LIMIT']), actual: OutputSchema.nullable(), expected: OutputSchema.nullable(), message: z.string(), elapsedMs: ms });
export const LIMITS = Object.freeze({ cpu: 1, memoryMiB: 512, pids: 128, sourceBytes: 65536, outputBytes: 65536, perCaseProtocolBytes: 1048576, taskProtocolBytes: 16777216, compileMs: 15000, perCaseMs: 3000, totalMs: 30000 });
export const RunResultSchema = z.strictObject({
  schemaVersion: z.literal(1), origin: z.literal('student-java'), requestId: z.string(), problemId: ProblemIdSchema,
  lessonVersion: z.string(), sourceHash: HashSchema, mode: z.enum(['run', 'submit']), testSuiteVersion: z.string().nullable(),
  phase: z.enum(['validation', 'queue', 'compile', 'execute', 'judge', 'infrastructure']), status: RunStatusSchema, reason: z.string().nullable(),
  cases: z.array(CaseResultSchema), stdout: z.string(), stderr: z.string(), diagnostics: z.array(DiagnosticSchema),
  timings: z.strictObject({ queueMs: ms, compileMs: ms, executeMs: ms, totalMs: ms }),
  output: z.strictObject({ stdoutBytes: count, stderrBytes: count, truncated: z.boolean() }),
  limits: z.strictObject({ cpu: ms, memoryMiB: count, pids: count, sourceBytes: count, outputBytes: count, perCaseProtocolBytes: count, taskProtocolBytes: count, compileMs: ms, perCaseMs: ms, totalMs: ms }),
  cleanup: z.strictObject({ status: z.enum(['done', 'pending', 'failed']), message: z.string().nullable() }),
});
export const ApiErrorSchema = z.strictObject({ requestId: z.string(), status: z.enum(['INVALID_INPUT', 'SYSTEM_ERROR']), reason: z.string(), message: z.string() });
export type RunRequest = z.infer<typeof RunRequestSchema>;
export type RunResult = z.infer<typeof RunResultSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type BinarySearchInput = z.infer<typeof BinarySearchInputSchema>;
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type CaseResult = z.infer<typeof CaseResultSchema>;
export type Output = z.infer<typeof OutputSchema>;
export const HealthSchema = z.strictObject({ status: z.literal('ok'), runner: z.strictObject({ available: z.boolean(), reason: z.string().nullable() }) });
export const SessionSchema = z.strictObject({ token: z.string().min(32) });
