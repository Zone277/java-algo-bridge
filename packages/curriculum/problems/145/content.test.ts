import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, TreeInputSchema, expectedOutput } from '@jab/contracts';
import { PREORDER_SOURCE, RIGHT_FIRST_SOURCE, demoInputs, lesson145 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('145 lesson content', () => {
  it('validates the full original lesson, reference hash, three hints and progressive coding', () => {
    expect(LessonSchema.safeParse(lesson145)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson145.reference.sourceHash);
    expect(lesson145.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson145.prerequisites).toEqual(['J1', 'J2', 'J3', 'J5', 'J7', 'J8']);
    expect(lesson145.predictionChecks).toHaveLength(2);
    expect(lesson145.guided.stages).toHaveLength(3);
    expect(lesson145.guided.finalCheck).toBe('real-java-submit');
    expect(lesson145.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson145.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('result.add(node.val)');
    expect(lesson145.commonErrors).toHaveLength(5);
    expect(REFERENCE_STEP_MAP.map(step => step.stepId)).toContain('visit-node');
    expect(REFERENCE_SOURCE).toContain('visit(node.right, result);\n        result.add(node.val);');
  });

  it('defines eleven valid judged cases with explicit edge and ordering coverage', () => {
    expect(lesson145.testSuite.cases).toHaveLength(11);
    for (const testCase of lesson145.testSuite.cases) {
      expect(TreeInputSchema.safeParse(testCase.input).success).toBe(true);
      expect(testCase.expected).toEqual(expectedOutput('145', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(8);
    }
    expect(lesson145.testSuite.cases.find(testCase => testCase.id === 'empty-case')?.expected).toEqual({ kind: 'int-array', values: [] });
    expect(lesson145.testSuite.cases.find(testCase => testCase.id === 'balanced-case')?.expected).toEqual({ kind: 'int-array', values: [2, 6, 4, 10, 14, 12, 8] });
    expect(lesson145.testSuite.cases.find(testCase => testCase.id === 'compact-null-case')?.expected).toEqual({ kind: 'int-array', values: [3, 2, 1] });
    expect(lesson145.testSuite.cases.find(testCase => testCase.id === 'repeated-values-case')?.expected).toEqual({ kind: 'int-array', values: [5, 5, 5, 5, 5] });
    expect(lesson145.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')?.expected).toEqual({ kind: 'int-array', values: Array(128).fill(1) });
    expect(demoInputs.map(input => input.id)).toEqual(['balanced-tree', 'compact-null', 'repeated-values', 'empty-tree']);
  });

  it('has two compilable wrong algorithms and named counterexamples', () => {
    expect(lesson145.testSuite.wrongFixtures).toHaveLength(2);
    expect(PREORDER_SOURCE).toContain('result.add(node.val);\n        visit(node.left, result);');
    expect(RIGHT_FIRST_SOURCE).toContain('visit(node.right, result);\n        visit(node.left, result);');
    expect(lesson145.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('balanced-case');
    expect(lesson145.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('asymmetric-case');
    const balanced = lesson145.testSuite.cases.find(testCase => testCase.id === 'balanced-case')!;
    expect(balanced.expected).not.toEqual({ kind: 'int-array', values: [8, 4, 2, 6, 12, 10, 14] });
    expect(balanced.expected).not.toEqual({ kind: 'int-array', values: [10, 14, 12, 2, 6, 4, 8] });
  });

  it('parses compact queue tree input and rejects orphans', () => {
    expect(TreeInputSchema.safeParse({ root: [1, null, 2, 3] }).success).toBe(true);
    expect(TreeInputSchema.safeParse({ root: [1, null, null, 2] }).success).toBe(false);
    expect(TreeInputSchema.safeParse({ root: [null] }).success).toBe(false);
  });
});
