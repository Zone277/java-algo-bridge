import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LESSON_VERSION, LIMITS, ProgressSchema, RunResultSchema, STARTER_SOURCE, TEST_SUITE_VERSION, type Progress, type RunResult } from '../../packages/contracts/src/index.js';
import { applyPassResult, createProgress, hashSource, markHintUsed, markSolutionViewed, updatePrediction } from '../../apps/web/src/progress.js';

const firstTime = '2026-09-09T12:00:00.000Z';
const nextTime = '2026-09-09T12:01:00.000Z';
const otherHash = 'f'.repeat(64);
type Context = Parameters<typeof applyPassResult>[2];

// These are synthetic reducer inputs, NOT Java execution evidence or API mocks.
function resultFor(progress: Progress, mode: Context['submittedMode'] = 'independent'): RunResult {
  return RunResultSchema.parse({
    schemaVersion: 1, origin: 'student-java', requestId: 'synthetic-reducer-only', problemId: '704', lessonVersion: LESSON_VERSION,
    sourceHash: progress.drafts[mode].sourceHash, mode: 'submit', testSuiteVersion: TEST_SUITE_VERSION,
    phase: 'judge', status: 'PASSED_LOCAL_TESTS', reason: null,
    cases: [{ caseId: 'synthetic-case', inputHash: otherHash, status: 'PASSED', actual: { kind: 'int', value: 0 }, expected: { kind: 'int', value: 0 }, message: 'Synthetic reducer fixture', elapsedMs: 1 }],
    stdout: '', stderr: '', diagnostics: [], timings: { queueMs: 0, compileMs: 1, executeMs: 1, totalMs: 2 },
    output: { stdoutBytes: 0, stderrBytes: 0, truncated: false }, limits: LIMITS, cleanup: { status: 'done', message: null },
  });
}
function contextFor(progress: Progress, mode: Context['submittedMode'] = 'independent'): Context {
  return { submittedMode: mode, currentMode: mode, currentSourceHash: progress.drafts[mode].sourceHash, submittedSourceHash: progress.drafts[mode].sourceHash };
}

describe('704 learning progress reducers (synthetic result fixtures only)', () => {
  it('initializes distinct guided and independent drafts with real UTF-8 SHA-256 and no achievements', async () => {
    const guided = '// 引导支架\n' + STARTER_SOURCE;
    const p = await createProgress(guided, firstTime);
    expect(ProgressSchema.safeParse(p).success).toBe(true);
    expect(p.drafts.guided.source).toBe(guided);
    expect(p.drafts.independent.source).toBe(STARTER_SOURCE);
    expect(p.drafts.guided.sourceHash).toBe(createHash('sha256').update(guided, 'utf8').digest('hex'));
    expect(await hashSource(STARTER_SOURCE)).toBe(p.drafts.independent.sourceHash);
    expect(p.startedAt).toBeNull();
    expect(p.completedStepIds).toEqual([]);
    expect(p.guidedPassed).toBeNull();
    expect(p.independentLocalPassed).toBeNull();
  });

  it('records only the corresponding learning mode and does not mutate the original', async () => {
    const p = await createProgress('// guided\n' + STARTER_SOURCE, firstTime);
    const guided = applyPassResult(p, resultFor(p, 'guided'), contextFor(p, 'guided'), nextTime);
    expect(guided.guidedPassed?.sourceHash).toBe(p.drafts.guided.sourceHash);
    expect(guided.independentLocalPassed).toBeNull();
    const independent = applyPassResult(guided, resultFor(guided), contextFor(guided), nextTime);
    expect(independent.independentLocalPassed?.sourceHash).toBe(p.drafts.independent.sourceHash);
    expect(independent.guidedPassed).toEqual(guided.guidedPassed);
    expect(independent.guidedPassed?.sourceHash).not.toBe(independent.independentLocalPassed?.sourceHash);
    expect(p.guidedPassed).toBeNull();
    expect(p.independentLocalPassed).toBeNull();
  });

  const rejectedResults: { label: string; mutate: (result: RunResult) => void }[] = [
    { label: 'run success is not submit success', mutate: r => { r.mode = 'run'; r.testSuiteVersion = null; } },
    { label: 'wrong answer', mutate: r => { r.status = 'WRONG_ANSWER'; } },
    { label: 'runner unavailable', mutate: r => { r.status = 'RUNNER_UNAVAILABLE'; } },
    { label: 'result source differs', mutate: r => { r.sourceHash = otherHash; } },
    { label: 'different problem', mutate: r => { r.problemId = '206'; } },
    { label: 'old lesson version', mutate: r => { r.lessonVersion = '704-old'; } },
    { label: 'old test suite', mutate: r => { r.testSuiteVersion = '704-tests-v1'; } },
    { label: 'missing test suite', mutate: r => { r.testSuiteVersion = null; } },
    { label: 'cleanup pending', mutate: r => { r.cleanup.status = 'pending'; } },
    { label: 'cleanup failed', mutate: r => { r.cleanup.status = 'failed'; } },
    { label: 'truncated output', mutate: r => { r.output.truncated = true; } },
    { label: 'empty case results', mutate: r => { r.cases = []; } },
    { label: 'case contradicts overall passed status', mutate: r => { r.cases[0]!.status = 'WRONG_ANSWER'; } },
  ];
  it.each(rejectedResults)('rejects $label without changing progress', async ({ mutate }) => {
    const p = await createProgress(STARTER_SOURCE, firstTime);
    const r = resultFor(p);
    mutate(r);
    expect(applyPassResult(p, r, contextFor(p), nextTime)).toBe(p);
    expect(p.independentLocalPassed).toBeNull();
  });

  const rejectedContexts: { label: string; mutate: (context: Context) => void }[] = [
    { label: 'mode changed in flight', mutate: c => { c.currentMode = 'guided'; } },
    { label: 'current source edited in flight', mutate: c => { c.currentSourceHash = otherHash; } },
    { label: 'submitted source differs from result', mutate: c => { c.submittedSourceHash = otherHash; } },
  ];
  it.each(rejectedContexts)('rejects $label', async ({ mutate }) => {
    const p = await createProgress(STARTER_SOURCE, firstTime);
    const context = contextFor(p);
    mutate(context);
    expect(applyPassResult(p, resultFor(p), context, nextTime)).toBe(p);
  });

  it('rejects stale stored draft hash even when the external context claims a match', async () => {
    const original = await createProgress(STARTER_SOURCE, firstTime);
    const p: Progress = { ...original, drafts: { ...original.drafts, independent: { ...original.drafts.independent, source: 'changed source', sourceHash: otherHash } } };
    expect(applyPassResult(p, resultFor(original), contextFor(original), nextTime)).toBe(p);
  });

  it('retains first-use hints and answer facts and snapshots them in each pass record', async () => {
    const initial = await createProgress(STARTER_SOURCE, firstTime);
    const hint = markHintUsed(initial, 'hint-1', firstTime);
    expect(markHintUsed(hint, 'hint-1', nextTime)).toBe(hint);
    const viewed = markSolutionViewed(hint, firstTime);
    expect(markSolutionViewed(viewed, nextTime)).toBe(viewed);
    const passed = applyPassResult(viewed, resultFor(viewed), contextFor(viewed), nextTime);
    expect(passed.independentLocalPassed).toMatchObject({ viewedSolutionBeforePass: true, hintIdsBeforePass: ['hint-1'], passedAt: nextTime });
    expect(passed.viewedSolutionAt).toBe(firstTime);
    expect(passed.hintsUsed).toEqual([{ hintId: 'hint-1', firstUsedAt: firstTime }]);
    const laterHint = markHintUsed(passed, 'hint-2', nextTime);
    expect(laterHint.independentLocalPassed?.hintIdsBeforePass).toEqual(['hint-1']);
    const rejected = resultFor(laterHint);
    rejected.status = 'COMPILE_ERROR';
    expect(applyPassResult(laterHint, rejected, contextFor(laterHint))).toBe(laterHint);
    expect(ProgressSchema.safeParse(laterHint).success).toBe(true);
  });

  it('updates prediction attempts by stable checkpoint and never creates execution passes', async () => {
    const p = await createProgress(STARTER_SOURCE, firstTime);
    const wrong = updatePrediction(p, { checkpointId: 'input-a:first-mid', answer: { kind: 'int', value: 1 }, correct: false }, firstTime);
    const other = updatePrediction(wrong, { checkpointId: 'input-b:first-mid', answer: { kind: 'int', value: 0 }, correct: true }, nextTime);
    const corrected = updatePrediction(other, { checkpointId: 'input-a:first-mid', answer: { kind: 'int', value: 2 }, correct: true }, nextTime);
    expect(corrected.predictionResults).toHaveLength(2);
    expect(corrected.predictionResults.find(r => r.checkpointId === 'input-a:first-mid')).toMatchObject({ attempts: 2, answer: { kind: 'int', value: 2 }, correct: true, lastAttemptAt: nextTime });
    expect(corrected.predictionResults.find(r => r.checkpointId === 'input-b:first-mid')?.attempts).toBe(1);
    expect(wrong.predictionResults[0]?.correct).toBe(false);
    expect(corrected.guidedPassed).toBeNull();
    expect(corrected.independentLocalPassed).toBeNull();
    expect(corrected.completedStepIds).toEqual([]);
    expect(ProgressSchema.safeParse(corrected).success).toBe(true);
  });
});
