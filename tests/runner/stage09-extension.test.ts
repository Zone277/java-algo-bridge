import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, MergeSortedArrayInputSchema, OutputSchema, RunRequestSchema, ValidPalindromeInputSchema,
  MajorityElementInputSchema, judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace, type RunRequest,
} from '@jab/contracts';
import { lesson88 } from '@jab/curriculum/88';
import { lesson125 } from '@jab/curriculum/125';
import { lesson169 } from '@jab/curriculum/169';
import { buildReferenceTrace as trace88 } from '@jab/curriculum/88/model';
import { buildReferenceTrace as trace125 } from '@jab/curriculum/125/model';
import { buildReferenceTrace as trace169 } from '@jab/curriculum/169/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type Course = { id: ProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '88', lesson: LessonSchema.parse(lesson88), trace: (input, id) => trace88(MergeSortedArrayInputSchema.parse(input), id) },
  { id: '125', lesson: LessonSchema.parse(lesson125), trace: (input, id) => trace125(ValidPalindromeInputSchema.parse(input), id) },
  { id: '169', lesson: LessonSchema.parse(lesson169), trace: (input, id) => trace169(MajorityElementInputSchema.parse(input), id) },
];

function exceedsDemo(input: unknown): boolean {
  const value = input as { nums?: number[]; nums1?: number[]; s?: string };
  return (value.nums?.length ?? 0) > 30 || (value.nums1?.length ?? 0) > 30 || (value.s?.length ?? 0) > 30;
}

describe('three new courses execute Java in Docker and agree with immutable reference models', () => {
  it.each(courses)('$id reference Java passes every published case', async course => {
    const result = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' }));
    expect(result.status, result.reason ?? '').toBe('PASSED_LOCAL_TESTS');
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      const actual = OutputSchema.parse(actualCase!.actual);
      expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(true);
      if (exceedsDemo(definition.input)) {
        await expect(course.trace(definition.input, `published-${definition.id}`)).rejects.toThrow(/30/);
        continue;
      }
      const trace = await course.trace(definition.input, `published-${definition.id}`);
      expect(OutputSchema.parse(trace.finalOutput)).toEqual(actual);
    }
  }, 120_000);

  it('compares fixed-seed valid small inputs with actual javac/java', async () => {
    let seed = 20261016;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<'88' | '125' | '169', unknown[]> = { '88': [], '125': [], '169': [] };
    for (let sample = 0; sample < 4; sample++) {
      const first = Array.from({ length: sample }, () => (random() % 13) - 6).sort((a, b) => a - b);
      const second = Array.from({ length: 4 - sample }, () => (random() % 13) - 6).sort((a, b) => a - b);
      inputs['88'].push({ nums1: [...first, ...Array(second.length).fill(0)], m: first.length, nums2: second, n: second.length });
      const chars = 'abAB12, .';
      inputs['125'].push({ s: Array.from({ length: 3 + sample }, () => chars[random() % chars.length]).join('') });
      const majority = (random() % 11) - 5;
      const other = majority === 7 ? 8 : 7;
      const nums = Array.from({ length: 3 + sample }, (_, index) => index < 2 + sample ? majority : other);
      inputs['169'].push({ nums });
    }
    for (const id of ['88', '125', '169'] as const) expect(inputs[id]).toHaveLength(4);
    for (const course of courses) for (const [index, input] of inputs[course.id as '88' | '125' | '169'].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input }) as RunRequest;
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.cases).toHaveLength(1);
      const trace = await course.trace(input, `seed-${course.id}-${index}`);
      expect(trace.finalOutput).toEqual(OutputSchema.parse(result.cases[0]!.actual));
    }
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects wrong fixture ${fixture.id} on a named counterexample`, async () => {
      const submitted = await runner.execute(RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' }));
      expect(['WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT'], JSON.stringify({ phase: submitted.phase, reason: submitted.reason, stderr: submitted.stderr, timings: submitted.timings, cleanup: submitted.cleanup })).toContain(submitted.status);
      let exposed = false;
      for (const id of fixture.targetedCaseIds) {
        const target = course.lesson.testSuite.cases.find(item => item.id === id)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: target.input }) as RunRequest;
        const result = await runner.execute(request);
        expect(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT'], JSON.stringify({ phase: result.phase, reason: result.reason, stderr: result.stderr, timings: result.timings, cleanup: result.cleanup })).toContain(result.status);
        exposed ||= result.status !== 'PASSED_LOCAL_TESTS';
      }
      expect(exposed, `${course.id}:${fixture.id} targeted cases must expose the bug`).toBe(true);
    }, 120_000);
  }
});
