import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LessonSchema, LongestSubstringInputSchema, expectedOutput } from '@jab/contracts';
import { demoInputs, lesson3 } from './content.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP, STARTER_SOURCE } from './reference.js';

function brute(text: string) {
  let best = 0;
  for (let start = 0; start < text.length; start++) {
    const seen = new Set<string>();
    for (let end = start; end < text.length && !seen.has(text[end]!); end++) { seen.add(text[end]!); best = Math.max(best, end - start + 1); }
  }
  return best;
}

describe('3 complete curriculum content', () => {
  it('validates eleven cases including empty strings and visible spaces', () => {
    expect(LessonSchema.parse(lesson3)).toEqual(lesson3);
    expect(lesson3.testSuite.cases).toHaveLength(11);
    for (const item of lesson3.testSuite.cases) {
      expect(LongestSubstringInputSchema.safeParse(item.input).success).toBe(true);
      expect(item.expected).toEqual({ kind: 'int', value: brute(item.input.s) });
      expect(item.expected).toEqual(expectedOutput('3', item.input));
    }
    expect(lesson3.testSuite.cases.find(item => item.id === 'single-space')?.input.s).toBe(' ');
    expect(lesson3.testSuite.cases.find(item => item.id === 'empty')?.input.s).toBe('');
  });

  it('binds the LF source hash and every stable step to its Java line', () => {
    expect(REFERENCE_SOURCE).not.toContain('\r');
    expect(createHash('sha256').update(REFERENCE_SOURCE).digest('hex')).toBe(lesson3.reference.sourceHash);
    const lines = REFERENCE_SOURCE.split('\n');
    const statements: Record<string, string> = {
      'create-map': 'Map<Character, Integer> lastSeen = new HashMap<>();', 'init-left': 'int left = 0;',
      'init-best': 'int best = 0;', 'check-loop': 'for (int right = 0; right < s.length(); right++) {',
      'read-char': 'char current = s.charAt(right);', 'check-seen': 'if (lastSeen.containsKey(current)) {',
      'move-left': 'left = Math.max(left, lastSeen.get(current) + 1);', 'put-last': 'lastSeen.put(current, right);',
      'update-best': 'best = Math.max(best, right - left + 1);', 'move-right': 'for (int right = 0; right < s.length(); right++) {',
      'return-best': 'return best;',
    };
    expect(new Set(REFERENCE_STEP_MAP.map(step => step.stepId)).size).toBe(Object.keys(statements).length);
    for (const step of REFERENCE_STEP_MAP) expect(lines[step.startLine - 1]!.trim()).toBe(statements[step.stepId]);
  });

  it('keeps the independent source skeletal and requires a real final submit', () => {
    expect(lesson3.independent.initialSource).toBe(STARTER_SOURCE);
    expect(STARTER_SOURCE).not.toContain('HashMap');
    expect(STARTER_SOURCE).not.toContain('for (');
    expect(lesson3.guided.stages).toHaveLength(3);
    expect(lesson3.guided.stages[2]!.scaffoldSource).toBe(STARTER_SOURCE);
    expect(lesson3.guided.finalCheck).toBe('real-java-submit');
  });

  it('connects demos, predictions, counterexamples and three wrong Java fixtures', () => {
    expect(demoInputs.map(demo => demo.id)).toEqual(lesson3.visualization.inputIds);
    expect(lesson3.predictionChecks.map(check => check.checkpointId)).toEqual(['first-best', 'first-duplicate-left']);
    expect(lesson3.testSuite.wrongFixtures).toHaveLength(3);
    const caseIds = new Set(lesson3.testSuite.cases.map(item => item.id));
    for (const fixture of lesson3.testSuite.wrongFixtures) {
      expect(fixture.source).not.toBe(REFERENCE_SOURCE);
      expect(fixture.source).toContain('class Solution');
      for (const caseId of fixture.targetedCaseIds) expect(caseIds.has(caseId)).toBe(true);
    }
    for (const error of lesson3.commonErrors) expect(caseIds.has(error.counterexampleInputId)).toBe(true);
  });
});
