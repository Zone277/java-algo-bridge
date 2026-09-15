import { expect, it } from 'vitest';
import { lesson206 } from '@jab/curriculum/206';
import { LINKED_STARTER_SOURCE, LIMITS, type RunResult } from '@jab/contracts';
import { applyPassResult, createProgress, progressKey } from '../../apps/web/src/progress.js';

it('keeps 206 drafts and keys separate from the compatible 704 default', async () => {
  const linked = await createProgress(lesson206.guided.stages[0]!.scaffoldSource, undefined, lesson206);
  const binary = await createProgress();
  expect(linked.problemId).toBe('206'); expect(binary.problemId).toBe('704');
  expect(linked.drafts.independent.source).toBe(LINKED_STARTER_SOURCE);
  expect(linked.drafts.independent.source).not.toBe(binary.drafts.independent.source);
  expect(progressKey(linked.problemId, linked.lessonVersion)).not.toBe(progressKey(binary.problemId, binary.lessonVersion));
});
it('requires the explicit matching 206 test suite and problem before recording a pass', async () => {
  const p = await createProgress(lesson206.guided.stages[0]!.scaffoldSource, undefined, lesson206);
  // Synthetic reducer fixture only: actual Java evidence lives under tests/runner.
  const result: RunResult = { schemaVersion: 1, origin: 'student-java', requestId: 'synthetic-206', problemId: '206', lessonVersion: '206-v1', sourceHash: p.drafts.independent.sourceHash, mode: 'submit', testSuiteVersion: '206-tests-v1', phase: 'judge', status: 'PASSED_LOCAL_TESTS', reason: null, cases: [{ caseId: 'synthetic', inputHash: 'a'.repeat(64), status: 'PASSED', actual: { kind: 'list-graph', headId: null, nodes: [] }, expected: { kind: 'list-graph', headId: null, nodes: [] }, message: 'Reducer only', elapsedMs: 0 }], stdout: '', stderr: '', diagnostics: [], timings: { queueMs: 0, compileMs: 0, executeMs: 0, totalMs: 0 }, output: { stdoutBytes: 0, stderrBytes: 0, truncated: false }, limits: { ...LIMITS }, cleanup: { status: 'done', message: null } };
  const context = { submittedMode: 'independent' as const, currentMode: 'independent' as const, currentSourceHash: result.sourceHash, submittedSourceHash: result.sourceHash };
  expect(applyPassResult(p, result, context)).toBe(p);
  const configured = { ...context, testSuiteVersion: lesson206.testSuite.version };
  expect(applyPassResult(p, result, configured).independentLocalPassed?.requestId).toBe(result.requestId);
  for (const patch of [{ problemId: '704' as const }, { lessonVersion: '206-old' }, { testSuiteVersion: '704-tests-v2' }, { mode: 'run' as const }]) expect(applyPassResult(p, { ...result, ...patch }, configured)).toBe(p);
  expect(applyPassResult(p, result, { ...configured, currentMode: 'guided' })).toBe(p);
});
