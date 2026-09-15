import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BinarySearchInputSchema, LessonSchema, STARTER_SOURCE } from '@jab/contracts';
import { demoInputs, lesson704 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

describe('704 original curriculum contract (static content checks, not Java execution)', () => {
  it('validates the complete lesson and legal test inputs with independently derived expectations', () => {
    expect(LessonSchema.parse(lesson704)).toEqual(lesson704);
    for (const test of lesson704.testSuite.cases) {
      expect(BinarySearchInputSchema.safeParse(test.input).success).toBe(true);
      expect(test.expected.value).toBe(test.input.nums.indexOf(test.input.target));
    }
    for (const demo of demoInputs) expect(BinarySearchInputSchema.safeParse(demo.input).success).toBe(true);
  });
  it('binds source hash and step ranges to the actual LF reference source', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson704.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const mappedStatements: Record<string, string> = {
      'init-left': 'int left = 0;', 'init-right': 'int right = nums.length - 1;',
      'check-loop': 'while (left <= right) {', 'compute-mid': 'int mid = left + (right - left) / 2;',
      'check-equal': 'if (nums[mid] == target) return mid;', 'check-less': 'if (nums[mid] < target) {',
      'move-left': 'left = mid + 1;', 'move-right': 'right = mid - 1;',
      found: 'if (nums[mid] == target) return mid;', 'not-found': 'return -1;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(s => s.stepId)).size).toBe(Object.keys(mappedStatements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(step.startLine).toBe(step.endLine);
      expect(lines[step.startLine - 1]!.trim()).toBe(mappedStatements[step.stepId]);
    }
  });
  it('keeps independent work as a method skeleton and ends guided work with real submission', () => {
    expect(lesson704.independent.initialSource).toBe(STARTER_SOURCE);
    expect(lesson704.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson704.guided.finalCheck).toBe('real-java-submit');
    expect(lesson704.guided.stages.every(s => s.checkKind === 'static-practice')).toBe(true);
  });
  it('resolves demonstration, prediction, error and fixture references without empty-array cases', () => {
    const caseIds = new Set(lesson704.testSuite.cases.map(c => c.id));
    for (const error of lesson704.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
    for (const fixture of lesson704.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    expect(demoInputs.map(d => d.id)).toEqual(lesson704.visualization.inputIds);
    expect(lesson704.predictionChecks.map(p => p.checkpointId)).toEqual(['first-mid', 'first-boundary']);
  });
});
