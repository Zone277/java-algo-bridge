import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RansomNoteInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson383 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';

describe('383 complete lesson contract', () => {
  it('publishes a schema-valid full lesson, authentic fixtures and input-bound predictions', async () => {
    expect(LessonSchema.parse(lesson383)).toEqual(lesson383);
    expect(lesson383.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(lesson383.testSuite.cases.length).toBeLessThanOrEqual(16);
    expect(lesson383.testSuite.wrongFixtures).toHaveLength(2);
    expect(lesson383.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson383.guided.stages).toHaveLength(3);
    expect(lesson383.guided.finalCheck).toBe('real-java-submit');
    expect(lesson383.independent.initialSource).toBe(lesson383.starter.source);
    expect(lesson383.reference.sourceHash).toBe(createHash('sha256').update(lesson383.reference.source).digest('hex'));
    const caseIds = new Set(lesson383.testSuite.cases.map(item => item.id));
    for (const item of lesson383.testSuite.cases) expect(item.expected).toEqual(expectedOutput('383', item.input));
    for (const fixture of lesson383.testSuite.wrongFixtures) for (const id of fixture.targetedCaseIds) expect(caseIds.has(id)).toBe(true);
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      expect(trace.finalOutput).toEqual(expectedOutput('383', demo.input));
      expect(Object.isFrozen(trace)).toBe(true);
    }
    const defaultTrace = await buildReferenceTrace(demoInputs[0]!.input, demoInputs[0]!.id);
    for (const check of lesson383.predictionChecks) {
      const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(predictionAt(defaultTrace, index)?.answer).toEqual(check.answer);
    }
  });

  it('keeps a 30-character display cap separate from the 10000-character real-runner contract', async () => {
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'a'.repeat(10000), magazine: 'z'.repeat(10000) }).success).toBe(true);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: '', magazine: 'a' }).success).toBe(false);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'A', magazine: 'a' }).success).toBe(false);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'é', magazine: 'a' }).success).toBe(false);
    expect(RansomNoteInputSchema.safeParse({ ransomNote: 'a'.repeat(10001), magazine: 'a' }).success).toBe(false);
    await expect(buildReferenceTrace({ ransomNote: 'a'.repeat(31), magazine: 'a' }, 'over-note')).rejects.toThrow('30');
    await expect(buildReferenceTrace({ ransomNote: 'a', magazine: 'a'.repeat(31) }, 'over-magazine')).rejects.toThrow('30');
    await expect(buildReferenceTrace({ ransomNote: 'a', magazine: 'a' }, '')).rejects.toThrow('标识');
  });
});
