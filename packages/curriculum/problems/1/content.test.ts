import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, judgeProblemOutput } from '@jab/contracts';
import { PUT_BEFORE_LOOKUP_SOURCE, RETURN_VALUES_SOURCE, lesson1 } from './content.js';
import { REFERENCE_SOURCE, STARTER_SOURCE } from './reference.js';

describe('problem 1 complete lesson package', () => {
  it('passes the strict lesson contract with full learning stages and coverage notes', () => {
    const parsed = LessonSchema.parse(lesson1);
    expect(parsed.id).toBe('1');
    expect(parsed.steps.map(step => step.kind)).toEqual(expect.arrayContaining(['syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary']));
    expect(parsed.testSuite.cases).toHaveLength(10);
    expect(parsed.testSuite.cases.every(item => item.coverage.trim().length > 0)).toBe(true);
    expect(parsed.predictionChecks).toHaveLength(2);
    expect(parsed.guided.stages).toHaveLength(3);
    expect(parsed.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(parsed.commonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('publishes valid unique-pair cases and allows the opposite legal index order', () => {
    for (const item of lesson1.testSuite.cases) {
      expect(judgeProblemOutput('1', item.input, item.expected).passed, item.id).toBe(true);
      expect(judgeProblemOutput('1', item.input, { kind: 'int-array', values: [...item.expected.values].reverse() }).passed, `${item.id} reversed`).toBe(true);
    }
    expect(judgeProblemOutput('1', { nums: [3, 3], target: 6 }, { kind: 'int-array', values: [0, 0] }).passed).toBe(false);
    expect(judgeProblemOutput('1', { nums: [2, 7, 11, 15], target: 9 }, { kind: 'int-array', values: [2, 7] }).passed).toBe(false);
  });

  it('keeps source assets, mappings and deliberate fixtures internally consistent', () => {
    expect(lesson1.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const lines = REFERENCE_SOURCE.split('\n');
    for (const mapping of lesson1.reference.stepMap) {
      expect(mapping.startLine).toBeGreaterThan(0);
      expect(mapping.endLine).toBeLessThanOrEqual(lines.length);
    }
    expect(lesson1.starter.source).toBe(STARTER_SOURCE);
    expect(lesson1.independent.initialSource).toBe(STARTER_SOURCE);
    expect(lesson1.testSuite.wrongFixtures.map(fixture => fixture.source)).toEqual([PUT_BEFORE_LOOKUP_SOURCE, RETURN_VALUES_SOURCE]);
    expect(new Set(lesson1.testSuite.wrongFixtures.flatMap(fixture => fixture.targetedCaseIds)).has('duplicate-pair')).toBe(true);
    expect(new Set(lesson1.testSuite.wrongFixtures.flatMap(fixture => fixture.targetedCaseIds)).has('basic-pair')).toBe(true);
  });
});
