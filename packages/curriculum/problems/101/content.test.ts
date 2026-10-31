import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TreeInputSchema, expectedOutput } from '@jab/contracts';
import { SHALLOW_ONLY_SOURCE, SAME_SIDE_SOURCE, demoInputs, lesson101 } from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('101 lesson content', () => {
  it('validates a complete lesson and its Java source hash', () => {
    expect(LessonSchema.safeParse(lesson101)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson101.reference.sourceHash);
    expect(new Set(lesson101.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson101.predictionChecks).toHaveLength(2);
    expect(lesson101.guided.stages).toHaveLength(3);
    expect(lesson101.guided.finalCheck).toBe('real-java-submit');
    expect(lesson101.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson101.independent.initialSource).not.toContain('mirror(');
  });

  it('covers empty, single, mirror, repeated values, compact nulls and deep mismatches', () => {
    expect(lesson101.testSuite.cases).toHaveLength(11);
    for (const testCase of lesson101.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('101', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(8);
    }
    const byId = new Map(lesson101.testSuite.cases.map(item => [item.id, item.expected.value]));
    expect(byId.get('empty-case')).toBe(true);
    expect(byId.get('singleton-case')).toBe(true);
    expect(byId.get('mirror-sparse-case')).toBe(true);
    expect(byId.get('same-values-wrong-shape-case')).toBe(false);
    expect(byId.get('one-child-case')).toBe(false);
    expect(byId.get('deep-value-mismatch-case')).toBe(false);
    expect(demoInputs).toHaveLength(4);
  });

  it('includes two compiling Java wrong fixtures aimed at distinct counterexamples', () => {
    expect(lesson101.testSuite.wrongFixtures).toHaveLength(2);
    expect(SHALLOW_ONLY_SOURCE).toContain('root.left.val == root.right.val');
    expect(SAME_SIDE_SOURCE).toContain('same(a.left, b.left)');
    expect(lesson101.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('deep-value-mismatch-case');
    expect(lesson101.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('mirror-sparse-case');
  });

  it('uses compact queue tree parsing and rejects orphan tokens', () => {
    expect(TreeInputSchema.safeParse({ root: [1, 2, 2, null, 3, 3, null] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [null] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
  });
});
