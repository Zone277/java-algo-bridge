import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, SameTreeInputSchema, expectedOutput } from '@jab/contracts';
import { NULL_AS_EQUAL_SOURCE, ROOT_ONLY_SOURCE, demoInputs, lesson100 } from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('100 same-tree lesson content', () => {
  it('validates the complete learning flow, source hash, independent skeleton and real-submit boundary', () => {
    expect(LessonSchema.parse(lesson100)).toEqual(lesson100);
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson100.reference.sourceHash);
    expect(lesson100.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson100.guided.stages).toHaveLength(3);
    expect(lesson100.guided.finalCheck).toBe('real-java-submit');
    expect(lesson100.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson100.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson100.independent.initialSource).toBe(lesson100.starter.source);
    expect(lesson100.independent.initialSource).not.toContain('return isSameTree');
  });

  it('covers double-empty, each single-empty direction, structure, values, repeats and limits', () => {
    expect(lesson100.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    expect(new Set(lesson100.testSuite.cases.map(testCase => testCase.id)).size).toBe(lesson100.testSuite.cases.length);
    for (const testCase of lesson100.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('100', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(10);
    }
    const byId = new Map(lesson100.testSuite.cases.map(testCase => [testCase.id, testCase]));
    expect(byId.get('both-empty-case')?.expected).toEqual({ kind: 'boolean', value: true });
    for (const id of ['only-p-empty-case', 'only-q-empty-case', 'left-right-shape-case', 'deep-value-difference-case', 'repeated-shape-difference-case']) {
      expect(byId.get(id)?.expected).toEqual({ kind: 'boolean', value: false });
    }
    const depth = byId.get('depth-limit-case')!.input.p;
    expect(depth.filter(value => value !== null)).toHaveLength(128);
    expect(demoInputs.map(input => input.id)).toEqual(['same-sparse', 'deep-value-difference', 'repeated-shape-difference', 'both-empty']);
  });

  it('ships two compiling-shape wrong fixtures with concrete counterexamples', () => {
    expect(lesson100.testSuite.wrongFixtures).toHaveLength(2);
    expect(ROOT_ONLY_SOURCE).toContain('return p.val == q.val;');
    expect(NULL_AS_EQUAL_SOURCE).toContain('if (p == null || q == null) return true;');
    for (const fixture of lesson100.testSuite.wrongFixtures) {
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const id of fixture.targetedCaseIds) expect(lesson100.testSuite.cases.some(testCase => testCase.id === id)).toBe(true);
    }
    expect(lesson100.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('deep-value-difference-case');
    expect(lesson100.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('only-p-empty-case');
  });

  it('validates two independent compact trees and rejects unreachable or oversized values', () => {
    expect(SameTreeInputSchema.safeParse({ p: [], q: [] }).success).toBe(true);
    expect(SameTreeInputSchema.safeParse({ p: [1, null, 2], q: [1, null, 2] }).success).toBe(true);
    expect(SameTreeInputSchema.safeParse({ p: [-10000], q: [10000] }).success).toBe(true);
    expect(SameTreeInputSchema.safeParse({ p: [1, null, null, 2], q: [] }).success).toBe(false);
    expect(SameTreeInputSchema.safeParse({ p: [10001], q: [] }).success).toBe(false);
    expect(SameTreeInputSchema.safeParse({ p: [], q: [], extra: true }).success).toBe(false);
  });
});
