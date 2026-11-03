import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, expectedOutput } from '@jab/contracts';
import { MAX_DEPTH_SOURCE, NAIVE_MIN_SOURCE, demoInputs, lesson111 } from './content.js';
import { REFERENCE_SOURCE } from './reference.js';

describe('111 lesson content', () => {
  it('validates the complete lesson, source hash and required learning flow', () => {
    expect(LessonSchema.safeParse(lesson111)).toMatchObject({ success: true });
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson111.reference.sourceHash);
    expect(lesson111.steps.map(step => step.kind)).toEqual(expect.arrayContaining([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson111.guided.stages).toHaveLength(3);
    expect(lesson111.guided.finalCheck).toBe('real-java-submit');
    expect(lesson111.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson111.predictionChecks).toHaveLength(2);
    expect(lesson111.independent.initialSource).not.toContain('Math.min');
    expect(lesson111.source.url).toBe('https://leetcode.com/problems/minimum-depth-of-binary-tree/');
  });

  it('has twelve independently judged cases covering null, leaf and one-child boundaries', () => {
    expect(lesson111.testSuite.cases).toHaveLength(12);
    for (const testCase of lesson111.testSuite.cases) {
      expect(testCase.expected).toEqual(expectedOutput('111', testCase.input));
      expect(testCase.coverage.length).toBeGreaterThan(8);
    }
    expect(lesson111.testSuite.cases.find(testCase => testCase.id === 'empty-case')?.expected).toEqual({ kind: 'int', value: 0 });
    expect(lesson111.testSuite.cases.find(testCase => testCase.id === 'single-case')?.expected).toEqual({ kind: 'int', value: 1 });
    expect(lesson111.testSuite.cases.find(testCase => testCase.id === 'one-child-chain-case')?.expected).toEqual({ kind: 'int', value: 3 });
    expect(lesson111.testSuite.cases.find(testCase => testCase.id === 'depth-limit-case')?.expected).toEqual({ kind: 'int', value: 128 });
    expect(demoInputs.map(item => item.id)).toEqual(['near-leaf', 'one-child-chain', 'repeated-values', 'empty-tree']);
  });

  it('ships two compiling wrong solutions aimed at concrete counterexamples', () => {
    expect(lesson111.testSuite.wrongFixtures).toHaveLength(2);
    expect(NAIVE_MIN_SOURCE).toContain('Math.min');
    expect(MAX_DEPTH_SOURCE).toContain('Math.max');
    expect(lesson111.testSuite.wrongFixtures[0]!.targetedCaseIds).toContain('one-child-chain-case');
    expect(lesson111.testSuite.wrongFixtures[1]!.targetedCaseIds).toContain('balanced-case');
    expect(expectedOutput('111', { root: [1, null, 2, 3] })).toEqual({ kind: 'int', value: 3 });
    expect(expectedOutput('111', { root: [3, 9, 20, null, null, 15, 7] })).toEqual({ kind: 'int', value: 2 });
  });
});
