import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ArrayIntersectionInputSchema, LessonSchema, expectedOutput, judgeProblemOutput } from '@jab/contracts';
import { demoInputs, lesson349 } from './content.js';
import {
  REFERENCE_SOURCE,
  REFERENCE_STEP_MAP,
  STARTER_SOURCE,
  WRONG_KEEP_DUPLICATES_SOURCE,
  WRONG_SAME_INDEX_SOURCE,
} from './reference.js';

describe('349 complete curriculum contract', () => {
  it('validates the eight-stage lesson and all 14 published trusted cases', () => {
    expect(LessonSchema.parse(lesson349)).toEqual(lesson349);
    expect(new Set(lesson349.steps.map(step => step.kind))).toEqual(new Set([
      'syntax', 'understanding', 'derivation', 'prediction',
      'reference-demo', 'guided-code', 'independent-code', 'summary',
    ]));
    expect(lesson349.testSuite.cases).toHaveLength(14);
    for (const item of lesson349.testSuite.cases) {
      expect(ArrayIntersectionInputSchema.parse(item.input), item.id).toEqual(item.input);
      expect(item.expected, item.id).toEqual(expectedOutput('349', item.input));
      expect(item.coverage.trim(), item.id).not.toBe('');
    }
    for (const demo of demoInputs) expect(ArrayIntersectionInputSchema.parse(demo.input), demo.id).toEqual(demo.input);
  });

  it('maps every reference step to the exact Java statement and binds its source hash', () => {
    expect(lesson349.reference.sourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    const statements: Record<string, string> = {
      'init-members': 'Set<Integer> members = new HashSet<>();',
      'scan-second': 'for (int value : nums2) {',
      'add-second': 'members.add(value);',
      'init-common': 'Set<Integer> common = new HashSet<>();',
      'scan-first': 'for (int value : nums1) {',
      'check-member': 'if (members.contains(value)) {',
      'add-common': 'common.add(value);',
      'allocate-result': 'int[] result = new int[common.size()];',
      'init-index': 'int index = 0;',
      'write-result': 'result[index] = value;',
      'advance-index': 'index++;',
      'return-result': 'return result;',
    };
    const lines = REFERENCE_SOURCE.split('\n');
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const mapping of REFERENCE_STEP_MAP) {
      expect(mapping.startLine, mapping.stepId).toBe(mapping.endLine);
      expect(lines[mapping.startLine - 1]!.trim(), mapping.stepId).toBe(statements[mapping.stepId]);
    }
  });

  it('contains the required Java bridge, predictions, guidance, hints and independent skeleton', () => {
    expect(lesson349.prerequisites).toEqual(['J1', 'J2', 'J3', 'J5', 'J8']);
    expect(lesson349.predictionChecks.map(check => check.checkpointId)).toEqual(['first-membership', 'result-length']);
    expect(lesson349.guided.stages).toHaveLength(3);
    expect(lesson349.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson349.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson349.guided.finalCheck).toBe('real-java-submit');
    expect(lesson349.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('Set<Integer> members = new HashSet<>();');
    expect(lesson349.hints.map(hint => hint.level)).toEqual([1, 2, 3]);
    expect(lesson349.commonErrors.length).toBeGreaterThanOrEqual(3);
    const teaching = lesson349.steps.map(step => step.body).join('\n');
    for (const phrase of ['int[]', 'HashSet<Integer>', '增强 for', '装箱', 'contains', 'add', '返回顺序不限']) {
      expect(teaching, phrase).toContain(phrase);
    }
  });

  it('ships two compiling-shaped wrong solutions tied to named counterexamples', () => {
    const caseIds = new Set(lesson349.testSuite.cases.map(item => item.id));
    expect(lesson349.testSuite.wrongFixtures.map(item => item.source)).toEqual([
      WRONG_KEEP_DUPLICATES_SOURCE,
      WRONG_SAME_INDEX_SOURCE,
    ]);
    expect(lesson349.testSuite.wrongFixtures).toHaveLength(2);
    for (const fixture of lesson349.testSuite.wrongFixtures) {
      expect(fixture.source).toContain('class Solution');
      expect(fixture.source).toContain('return');
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const id of fixture.targetedCaseIds) expect(caseIds.has(id), `${fixture.id}:${id}`).toBe(true);
    }
    for (const error of lesson349.commonErrors) expect(caseIds.has(error.counterexampleInputId), error.id).toBe(true);
  });

  it('keeps runner bounds explicit and the judge order-insensitive but duplicate-sensitive', () => {
    expect(ArrayIntersectionInputSchema.safeParse({ nums1: [], nums2: [1] }).success).toBe(false);
    expect(ArrayIntersectionInputSchema.safeParse({ nums1: [1], nums2: Array(1001).fill(1) }).success).toBe(false);
    expect(ArrayIntersectionInputSchema.safeParse({ nums1: [-1], nums2: [1] }).success).toBe(false);
    expect(ArrayIntersectionInputSchema.safeParse({ nums1: [1001], nums2: [1001] }).success).toBe(false);
    const input = { nums1: [4, 9, 5, 4], nums2: [9, 4, 9, 8, 4] };
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [9, 4] }).passed).toBe(true);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4, 9, 4] }).passed).toBe(false);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4] }).passed).toBe(false);
    expect(judgeProblemOutput('349', input, { kind: 'int-array', values: [4, 8, 9] }).passed).toBe(false);
  });
});
