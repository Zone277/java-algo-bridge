import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, ValidParenthesesInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson20 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

describe('20 complete curriculum contract (static content checks, not Java execution)', () => {
  it('validates the full lesson and independently derives all expected booleans', () => {
    expect(LessonSchema.parse(lesson20)).toEqual(lesson20);
    expect(lesson20.testSuite.cases.length).toBeGreaterThanOrEqual(8);
    for (const item of lesson20.testSuite.cases) {
      expect(ValidParenthesesInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual(expectedOutput('20', item.input));
      expect(item.coverage.trim()).not.toBe('');
    }
    for (const demo of demoInputs) expect(ValidParenthesesInputSchema.safeParse(demo.input).success).toBe(true);
  });

  it('binds the exact LF reference source hash and every highlighted step to executable Java', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson20.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'init-stack': 'ArrayDeque<Character> stack = new ArrayDeque<>();',
      'check-char': 'for (int i = 0; i < s.length(); i++) {',
      'read-char': 'char current = s.charAt(i);',
      'check-opening': "if (current == '(' || current == '[' || current == '{') {",
      'push-open': 'stack.push(current);',
      'check-empty': 'if (stack.isEmpty()) {',
      'return-empty-error': 'return false;',
      'pop-open': 'char open = stack.pop();',
      'compare-pair': "boolean matches = (current == ')' && open == '(')",
      'return-mismatch': 'if (!matches) return false;',
      'return-final': 'return stack.isEmpty();',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) {
      expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
      expect(step.endLine).toBeGreaterThanOrEqual(step.startLine);
      expect(step.endLine).toBeLessThan(lines.length);
    }
  });

  it('keeps three guided stages and independent work on a method skeleton with real final submission', () => {
    expect(lesson20.guided.stages).toHaveLength(3);
    expect(lesson20.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson20.guided.stages.every(stage => stage.checkKind === 'static-practice')).toBe(true);
    expect(lesson20.guided.finalCheck).toBe('real-java-submit');
    expect(lesson20.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('stack.push(current);');
  });

  it('contains dynamic prediction anchors and counterexamples for all required wrong solutions', () => {
    const caseIds = new Set<string>(lesson20.testSuite.cases.map(item => item.id));
    expect(demoInputs.map(item => item.id)).toEqual(lesson20.visualization.inputIds);
    expect(lesson20.predictionChecks.map(check => check.checkpointId)).toEqual(['first-stack-action', 'final-result']);
    expect(lesson20.predictionChecks[1]!.options).toEqual([
      { id: 'true', label: 'true：有效' },
      { id: 'false', label: 'false：无效' },
    ]);
    expect(lesson20.testSuite.wrongFixtures.map(fixture => fixture.id)).toEqual([
      'wrong-count-only',
      'wrong-missing-final-empty',
      'wrong-pop-without-empty',
    ]);
    for (const fixture of lesson20.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.targetedCaseIds.length).toBeGreaterThan(0);
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson20.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
