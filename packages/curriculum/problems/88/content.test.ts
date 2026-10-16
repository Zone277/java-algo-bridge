import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, MergeSortedArrayInputSchema, expectedOutput } from '@jab/contracts';
import { WRONG_FORWARD_SOURCE, WRONG_REBIND_SOURCE, WRONG_STOP_EARLY_SOURCE, demoInputs, lesson88 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('88 complete curriculum contract', () => {
  it('provides 12 valid, explained real-runner cases with independent expected output', () => {
    expect(LessonSchema.parse(lesson88)).toEqual(lesson88);
    expect(lesson88.testSuite.cases).toHaveLength(12);
    for (const item of lesson88.testSuite.cases) {
      expect(MergeSortedArrayInputSchema.parse(item.input)).toEqual(item.input);
      expect(item.expected).toEqual(expectedOutput('88', item.input));
      expect(item.coverage.length).toBeGreaterThan(10);
    }
    for (const demo of demoInputs) expect(MergeSortedArrayInputSchema.parse(demo.input)).toEqual(demo.input);
    expect(MergeSortedArrayInputSchema.safeParse({ nums1: [2, 1, 0], m: 2, nums2: [3], n: 1 }).success).toBe(false);
    expect(MergeSortedArrayInputSchema.safeParse({ nums1: [1, 9], m: 1, nums2: [2], n: 1 }).success).toBe(false);
    expect(MergeSortedArrayInputSchema.safeParse({ nums1: [0], m: 0, nums2: [], n: 0 }).success).toBe(false);
  });

  it('maps every model step to its Java statement and keeps the exact source hash', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(lesson88.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-i': 'int i = m - 1;', 'init-j': 'int j = n - 1;', 'init-write': 'int write = m + n - 1;',
      'check-loop': 'while (j >= 0) {', 'choose-branch': 'if (i >= 0 && nums1[i] > nums2[j]) {',
      'write-first': 'nums1[write] = nums1[i];', 'move-i': 'i--;',
      'write-second': 'nums1[write] = nums2[j];', 'move-j': 'j--;', 'move-write': 'write--;',
    };
    expect(REFERENCE_STEP_MAP).toHaveLength(Object.keys(statements).length);
    const lines = REFERENCE_SOURCE.split('\n');
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim(), step.stepId).toBe(statements[step.stepId]);
    }
  });

  it('contains the whole learning path, separate skeleton, three guides and input-linked predictions', () => {
    expect(new Set(lesson88.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction', 'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson88.prerequisites).toEqual(['J1', 'J2', 'J3', 'J8']);
    expect(lesson88.steps.find(step => step.kind === 'reference-demo')!.body).toContain('参考解法 · 算法状态演示（非 JVM 调试）');
    expect(lesson88.visualization.inputIds).toEqual(demoInputs.map(item => item.id));
    expect(lesson88.predictionChecks.map(item => item.checkpointId)).toEqual(['first-write-index', 'first-choice']);
    expect(lesson88.guided.stages).toHaveLength(3);
    expect(lesson88.guided.finalCheck).toBe('real-java-submit');
    expect(lesson88.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson88.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('while (j >= 0)');
    expect(lesson88.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
  });

  it('ties three compiling wrong fixtures to concrete counterexamples', () => {
    const ids = new Set(lesson88.testSuite.cases.map(item => item.id));
    expect(lesson88.testSuite.wrongFixtures.map(item => item.source)).toEqual([WRONG_REBIND_SOURCE, WRONG_STOP_EARLY_SOURCE, WRONG_FORWARD_SOURCE]);
    for (const fixture of lesson88.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(ids.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson88.commonErrors) expect(ids.has(error.counterexampleInputId), error.id).toBe(true);
  });
});
