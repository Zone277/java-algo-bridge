import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, RomanToIntegerInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson13 } from './content.js';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

describe('13 complete lesson contract', () => {
  it('publishes a schema-valid complete lesson with real-submit guidance', async () => {
    expect(LessonSchema.parse(lesson13)).toEqual(lesson13);
    expect(lesson13.testSuite.cases).toHaveLength(14);
    expect(lesson13.testSuite.wrongFixtures).toHaveLength(2);
    expect(lesson13.hints.map(item => item.level)).toEqual([1, 2, 3]);
    expect(lesson13.guided.stages).toHaveLength(3);
    expect(lesson13.guided.finalCheck).toBe('real-java-submit');
    expect(lesson13.independent.initialSource).toBe(lesson13.starter.source);
    expect(lesson13.reference.sourceHash).toBe(createHash('sha256').update(lesson13.reference.source).digest('hex'));

    const caseIds = new Set(lesson13.testSuite.cases.map(item => item.id));
    for (const item of lesson13.testSuite.cases) expect(item.expected).toEqual(expectedOutput('13', item.input));
    for (const fixture of lesson13.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const demo of demoInputs) {
      const trace = await buildReferenceTrace(demo.input, demo.id);
      const predictions = trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
      expect(predictions).toHaveLength(2);
      expect(new Set(predictions.map(item => item.checkpointId)).size).toBe(2);
      expect(trace.finalOutput).toEqual(expectedOutput('13', demo.input));
      expect(Object.isFrozen(trace)).toBe(true);
    }

    const defaultTrace = await buildReferenceTrace(demoInputs[0]!.input, demoInputs[0]!.id);
    for (const check of lesson13.predictionChecks) {
      const index = defaultTrace.snapshots.findIndex(snapshot => snapshot.checkpointId?.endsWith(`:${check.checkpointId}`));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(predictionAt(defaultTrace, index)?.answer).toEqual(check.answer);
    }
  });

  it('keeps the published contract restricted to canonical 1—3999 numerals', async () => {
    for (const s of ['I', 'IV', 'MCMXCIV', 'MMMCMXCIX']) {
      expect(RomanToIntegerInputSchema.safeParse({ s }).success, s).toBe(true);
    }
    for (const s of ['', 'IIII', 'IIV', 'VX', 'MMMM', 'iv', 'ABC', 'MCMXCIV ']) {
      expect(RomanToIntegerInputSchema.safeParse({ s }).success, s).toBe(false);
    }
    await expect(buildReferenceTrace({ s: 'I' }, '')).rejects.toThrow('标识');
  });

  it('maps every reference step to the Java statement it describes', () => {
    const lines = REFERENCE_SOURCE.split('\n');
    const expectedStatement = {
      'init-total': 'int total = 0;',
      'check-loop': 'for (int i = 0; i < s.length(); i++) {',
      'read-current': 'int current = valueOf(s.charAt(i));',
      'check-subtract': 'if (i + 1 < s.length() && current < valueOf(s.charAt(i + 1))) {',
      'subtract-current': 'total -= current;',
      'add-current': 'total += current;',
      'return-total': 'return total;',
    } as const;
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(lines[mapping.startLine - 1]?.trim(), mapping.stepId).toBe(expectedStatement[mapping.stepId]);
      expect(mapping.endLine).toBe(mapping.startLine);
    }
  });
});
