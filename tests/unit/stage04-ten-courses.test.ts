import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, OutputSchema, PROBLEM_ORDER, judgeProblemOutput, type ProblemId } from '@jab/contracts';
import { lessonRuntimes } from '../../apps/web/src/registry.js';
import { READY_PROBLEM_IDS } from '../../apps/api/src/runner.js';

describe('complete course registry', () => {
  it('registers the same fixed order in the browser and real runner', () => {
    expect(lessonRuntimes.map(runtime => runtime.lesson.id)).toEqual(PROBLEM_ORDER);
    expect(READY_PROBLEM_IDS).toEqual(PROBLEM_ORDER);
  });

  it.each(lessonRuntimes)('$lesson.id is a complete, executable course package', async runtime => {
    const lesson = LessonSchema.parse(runtime.lesson);
    expect(lesson.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson.testSuite.wrongFixtures.length).toBeGreaterThanOrEqual(2);
    expect(lesson.predictionChecks.length).toBeGreaterThanOrEqual(2);
    expect(lesson.guided.stages.length).toBeGreaterThanOrEqual(3);
    expect(lesson.guided.finalCheck).toBe('real-java-submit');
    expect(lesson.independent.initialSource).not.toBe(lesson.reference.source);
    expect(lesson.steps.map(step => step.kind)).toEqual(expect.arrayContaining(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(lesson.reference.sourceHash).toBe(createHash('sha256').update(lesson.reference.source).digest('hex'));
    const trace = await runtime.buildTrace(runtime.demoInputs[0]!.input, `registry-${lesson.id}`);
    const checkpoints = trace.snapshots.flatMap(snapshot => snapshot.checkpointId ?? []);
    expect(checkpoints.length).toBeGreaterThanOrEqual(2);
    expect(new Set(checkpoints).size).toBe(checkpoints.length);
    expect(judgeProblemOutput(lesson.id as ProblemId, runtime.demoInputs[0]!.input as never, OutputSchema.parse(trace.finalOutput)).passed).toBe(true);
    expect(Object.isFrozen(trace)).toBe(true);
  });
});
