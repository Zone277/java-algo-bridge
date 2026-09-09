import { LESSON_VERSION, ProgressSchema, STARTER_SOURCE, TEST_SUITE_VERSION, type Answer, type Lesson, type Progress, type RunResult } from '@jab/contracts';

export type LearningMode = 'guided' | 'independent';
export const PROGRESS_KEY = `java-algo-bridge:v1:progress:704:${LESSON_VERSION}`;
export const LEGACY_DRAFT_KEY = `java-algo-bridge:v1:draft:704:${LESSON_VERSION}:independent`;
export const progressKey = (problemId: string, lessonVersion: string) => `java-algo-bridge:v1:progress:${problemId}:${lessonVersion}`;
export async function hashSource(source: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
export async function createProgress(guidedSource = STARTER_SOURCE, now = new Date().toISOString(), lesson?: Lesson): Promise<Progress> {
  const independentSource = lesson?.independent.initialSource ?? STARTER_SOURCE;
  const [guidedHash, independentHash] = await Promise.all([hashSource(guidedSource), hashSource(independentSource)]);
  return ProgressSchema.parse({ schemaVersion: 1, problemId: lesson?.id ?? '704', lessonVersion: lesson?.lessonVersion ?? LESSON_VERSION, startedAt: null, completedStepIds: [], predictionResults: [], drafts: { guided: { source: guidedSource, sourceHash: guidedHash, updatedAt: now }, independent: { source: independentSource, sourceHash: independentHash, updatedAt: now } }, hintsUsed: [], viewedSolution: false, viewedSolutionAt: null, guidedPassed: null, independentLocalPassed: null, updatedAt: now });
}
export function applyPassResult(progress: Progress, result: RunResult, context: { submittedMode: LearningMode; currentMode: LearningMode; currentSourceHash: string; submittedSourceHash: string; testSuiteVersion?: string }, now = new Date().toISOString()): Progress {
  const suite = context.testSuiteVersion ?? (progress.problemId === '704' ? TEST_SUITE_VERSION : null);
  if (!suite || context.submittedMode !== context.currentMode || result.mode !== 'submit' || result.status !== 'PASSED_LOCAL_TESTS' || result.cleanup.status !== 'done' || result.origin !== 'student-java' || result.problemId !== progress.problemId || result.lessonVersion !== progress.lessonVersion || result.testSuiteVersion !== suite || result.sourceHash !== context.currentSourceHash || result.sourceHash !== context.submittedSourceHash || result.sourceHash !== progress.drafts[context.submittedMode].sourceHash || result.output.truncated || result.cases.length === 0 || result.cases.some(c => c.status !== 'PASSED')) return progress;
  return { ...progress, [context.submittedMode === 'guided' ? 'guidedPassed' : 'independentLocalPassed']: { requestId: result.requestId, sourceHash: result.sourceHash, lessonVersion: result.lessonVersion, testSuiteVersion: result.testSuiteVersion, passedAt: now, viewedSolutionBeforePass: progress.viewedSolution, hintIdsBeforePass: progress.hintsUsed.map(h => h.hintId) }, updatedAt: now };
}
export function updatePrediction(progress: Progress, record: { checkpointId: string; answer: Answer; correct: boolean }, now = new Date().toISOString()): Progress {
  const previous = progress.predictionResults.find(p => p.checkpointId === record.checkpointId);
  return { ...progress, predictionResults: [...progress.predictionResults.filter(p => p.checkpointId !== record.checkpointId), { ...record, attempts: (previous?.attempts ?? 0) + 1, lastAttemptAt: now }], updatedAt: now };
}
export function markSolutionViewed(progress: Progress, now = new Date().toISOString()): Progress {
  return progress.viewedSolution ? progress : { ...progress, viewedSolution: true, viewedSolutionAt: now, updatedAt: now };
}
export function markHintUsed(progress: Progress, hintId: string, now = new Date().toISOString()): Progress {
  return progress.hintsUsed.some(h => h.hintId === hintId) ? progress : { ...progress, hintsUsed: [...progress.hintsUsed, { hintId, firstUsedAt: now }], updatedAt: now };
}
