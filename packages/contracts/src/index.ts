import { z } from 'zod';
import { PROBLEM_META, PROBLEM_ORDER, ProblemIdSchema, ProblemInputSchemas, OutputSchema } from './problems.js';
export * from './linked-list.js';
export * from './problems.js';
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
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const sourceSchema = z.string().min(1).refine(s => new TextEncoder().encode(s).length <= 65536, '源码不得超过 64 KiB');
const requestFor = <I extends (typeof PROBLEM_ORDER)[number]>(problemId: I) => z.discriminatedUnion('mode', [
  z.strictObject({ problemId: z.literal(problemId), lessonVersion: z.literal(PROBLEM_META[problemId].lessonVersion), source: sourceSchema, mode: z.literal('run'), input: ProblemInputSchemas[problemId] }),
  z.strictObject({ problemId: z.literal(problemId), lessonVersion: z.literal(PROBLEM_META[problemId].lessonVersion), source: sourceSchema, mode: z.literal('submit') }),
]);
export const RunRequestSchema = z.union([
  requestFor('704'), requestFor('283'), requestFor('977'), requestFor('1'), requestFor('20'),
  requestFor('206'), requestFor('21'), requestFor('104'), requestFor('70'), requestFor('3'),
]);
export const RunStatusSchema = z.enum(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT', 'RESOURCE_LIMIT', 'OUTPUT_LIMIT', 'RUNNER_UNAVAILABLE', 'INVALID_INPUT', 'SYSTEM_ERROR', 'CANCELLED']);
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
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type CaseResult = z.infer<typeof CaseResultSchema>;
export const HealthSchema = z.strictObject({ status: z.literal('ok'), runner: z.strictObject({ available: z.boolean(), reason: z.string().nullable() }) });
export const SessionSchema = z.strictObject({ token: z.string().min(32) });
