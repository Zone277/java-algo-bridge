import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { IsomorphicStringsInputSchema, LessonSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson205 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';

describe('205 complete lesson contract', () => {
  it('publishes a schema-valid lesson with real-submit guidance and authentic fixtures', async () => {
    expect(LessonSchema.parse(lesson205)).toEqual(lesson205);
    expect(lesson205.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson205.testSuite.cases.length).toBeLessThanOrEqual(16);
    expect(lesson205.testSuite.wrongFixtures.length).toBeGreaterThanOrEqual(2);
    expect(lesson205.hints.map(item => item.level)).toEqual([1, 2, 3]);
    expect(lesson205.guided.stages).toHaveLength(3);
    expect(lesson205.guided.finalCheck).toBe('real-java-submit');
    expect(lesson205.independent.initialSource).toBe(lesson205.starter.source);
    expect(lesson205.reference.sourceHash).toBe(createHash('sha256').update(lesson205.reference.source).digest('hex'));

    const caseIds = new Set(lesson205.testSuite.cases.map(item => item.id));
    for (const item of lesson205.testSuite.cases) expect(item.expected).toEqual(expectedOutput('205', item.input));
    for (const fixture of lesson205.testSuite.wrongFixtures) {
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      expect(trace.finalOutput).toEqual(expectedOutput('205', demo.input));
      expect(Object.isFrozen(trace)).toBe(true);
    }

    const defaultTrace = await buildReferenceTrace(demoInputs[0]!.input, demoInputs[0]!.id);
    for (const check of lesson205.predictionChecks) {
      const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(predictionAt(defaultTrace, index)?.answer).toEqual(check.answer);
    }
  });

  it('keeps the display cap separate from the strict printable-ASCII runner contract', async () => {
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'a'.repeat(10000), t: 'Z'.repeat(10000) }).success).toBe(true);
    expect(IsomorphicStringsInputSchema.safeParse({ s: ' ', t: '!' }).success).toBe(true);
    expect(IsomorphicStringsInputSchema.safeParse({ s: '', t: '' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'a', t: 'aa' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'é', t: 'a' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: '\n', t: 'a' }).success).toBe(false);
    expect(IsomorphicStringsInputSchema.safeParse({ s: 'a'.repeat(10001), t: 'b'.repeat(10001) }).success).toBe(false);
    await expect(buildReferenceTrace({ s: 'a'.repeat(31), t: 'b'.repeat(31) }, 'over-display')).rejects.toThrow('30');
    await expect(buildReferenceTrace({ s: 'a', t: 'b' }, '')).rejects.toThrow('标识');
  });
});
