import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TreeInputSchema, expectedOutput } from '@jab/contracts';
import { EDGE_COUNT_SOURCE, MIN_DEPTH_SOURCE, demoInputs, lesson104 } from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('104 lesson content', () => {
  it('validates the complete lesson, source hash, cases and three-stage flow', () => {
    expect(LessonSchema.safeParse(lesson104)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson104.reference.sourceHash);
    expect(lesson104.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson104.guided.stages).toHaveLength(3);
    expect(lesson104.guided.finalCheck).toBe('real-java-submit');
    expect(lesson104.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson104.commonErrors.length).toBeGreaterThanOrEqual(3);
    expect(lesson104.independent.initialSource).not.toContain('Math.max');
  });

  it('has eleven judged cases with the required boundaries and coverage', () => {
    expect(lesson104.testSuite.cases).toHaveLength(11);
    for (const testCase of lesson104.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('104', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(5);
    }
    expect(lesson104.testSuite.cases.find(testCase => testCase.id === 'empty-case')?.expected).toEqual({ kind: 'int', value: 0 });
    expect(lesson104.testSuite.cases.find(testCase => testCase.id === 'singleton-case')?.expected).toEqual({ kind: 'int', value: 1 });
    expect(lesson104.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')?.expected).toEqual({ kind: 'int', value: 128 });
    expect(demoInputs.every(demo => expectedOutput('104', demo.input).kind === 'int')).toBe(true);
    expect(demoInputs.map(demo => demo.id)).toEqual(['compact-null', 'balanced-tree', 'repeated-values', 'empty-tree']);
  });

  it('ships two compiling-shape wrong solutions aimed at independent counterexamples', () => {
    expect(lesson104.testSuite.wrongFixtures).toHaveLength(2);
    expect(EDGE_COUNT_SOURCE).toContain('return -1');
    expect(MIN_DEPTH_SOURCE).toContain('Math.min');
    expect(lesson104.testSuite.wrongFixtures[0]!.targetedCaseIds).toEqual(expect.arrayContaining(['empty-case', 'singleton-case']));
    expect(lesson104.testSuite.wrongFixtures[1]!.targetedCaseIds).toEqual(expect.arrayContaining(['compact-null-case', 'asymmetric-case']));
    expect(-1).not.toBe((expectedOutput('104', { root: [] }) as { kind: 'int'; value: number }).value);
    expect(1).not.toBe((expectedOutput('104', { root: [1, null, 2, 3] }) as { kind: 'int'; value: number }).value);
  });

  it('accepts compact queue trees and rejects orphan or over-depth tokens in isolation', () => {
    expect(TreeInputSchema.safeParse({ root: [1, null, 2, 3] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [null] }).success).toBe(false);
    const depth129: (number | null)[] = [1];
    for (let value = 2; value <= 129; value++) depth129.push(null, 1);
    expect(TreeInputSchema.safeParse({ root: depth129 }).success).toBe(false);
  });
});
