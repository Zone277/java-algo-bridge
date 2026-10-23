import { afterAll, describe, expect, it } from 'vitest';
import {
  PivotIndexInputSchema, SubarraySumInputSchema, LessonSchema, NearbyDuplicateInputSchema,
  OutputSchema, RunRequestSchema, judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson724 } from '@jab/curriculum/724';
import { lesson219 } from '@jab/curriculum/219';
import { lesson560 } from '@jab/curriculum/560';
import { buildReferenceTrace as trace724 } from '@jab/curriculum/724/model';
import { buildReferenceTrace as trace219 } from '@jab/curriculum/219/model';
import { buildReferenceTrace as trace560 } from '@jab/curriculum/560/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '724' | '219' | '560';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '724', lesson: LessonSchema.parse(lesson724), trace: (input, id) => trace724(PivotIndexInputSchema.parse(input), id) },
  { id: '219', lesson: LessonSchema.parse(lesson219), trace: (input, id) => trace219(NearbyDuplicateInputSchema.parse(input), id) },
  { id: '560', lesson: LessonSchema.parse(lesson560), trace: (input, id) => trace560(SubarraySumInputSchema.parse(input), id) },
];

function exceedsDemo(id: NewProblemId, input: unknown): boolean {
  const value = input as { nums: number[] };
  return value.nums.length > (id === '560' ? 29 : 30);
}

describe('724/219/560 real Java agrees with reference models and independent judges', () => {
  it.each(courses)('$id reference Java passes all published cases', async course => {
    const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' });
    expect(result.status, result.reason ?? result.stderr).toBe('PASSED_LOCAL_TESTS');
    expect(result.origin).toBe('student-java');
    expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
    expect(result.cleanup.status).toBe('done');
    expect(result.cases).toHaveLength(course.lesson.testSuite.cases.length);
    for (const definition of course.lesson.testSuite.cases) {
      const actualCase = result.cases.find(item => item.caseId === definition.id);
      expect(actualCase, `missing real case ${definition.id}`).toBeDefined();
      expect(actualCase!.status, actualCase!.message).toBe('PASSED');
      const actual = OutputSchema.parse(actualCase!.actual);
      expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(true);
      if (exceedsDemo(course.id, definition.input)) {
        await expect(course.trace(definition.input, `published-${definition.id}`)).rejects.toThrow(/29|30/);
      } else {
        const trace = await course.trace(definition.input, `published-${definition.id}`);
        expect(OutputSchema.parse(trace.finalOutput)).toEqual(actual);
      }
    }
  }, 120_000);

  it('compares fixed-seed small valid inputs with actual javac/java', async () => {
    let seed = 20261023;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<NewProblemId, unknown[]> = { '724': [], '219': [], '560': [] };
    for (let sample = 0; sample < 4; sample++) {
      const nums = Array.from({ length: 1 + sample * 3 }, () => random() % 9 - 4);
      inputs['724'].push({ nums });
      inputs['219'].push({ nums, k: sample });
      inputs['560'].push({ nums, k: random() % 7 - 3 });
    }
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.origin).toBe('student-java');
      expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
      expect(result.cleanup.status).toBe('done');
      expect(result.cases).toHaveLength(1);
      const trace = await course.trace(input, `seed-${course.id}-${index}`);
      expect(trace.finalOutput).toEqual(OutputSchema.parse(result.cases[0]!.actual));
    }
  }, 120_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} using its named counterexamples`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(submitted.status, JSON.stringify({ phase: submitted.phase, reason: submitted.reason, stderr: submitted.stderr, timings: submitted.timings, cleanup: submitted.cleanup })).toBe('WRONG_ANSWER');
      expect(submitted.cases.some(item => item.status === 'WRONG_ANSWER')).toBe(true);
      for (const item of submitted.cases) expect(['PASSED', 'WRONG_ANSWER']).toContain(item.status);
      expect(submitted.cleanup.status).toBe('done');
      for (const id of fixture.targetedCaseIds) {
        const target = course.lesson.testSuite.cases.find(item => item.id === id)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: target.input });
        const result = await runner.execute(request);
        expect(result.status, JSON.stringify({ caseId: id, phase: result.phase, reason: result.reason, stderr: result.stderr, timings: result.timings, cleanup: result.cleanup })).toBe('WRONG_ANSWER');
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0]!.status).toBe('WRONG_ANSWER');
        const actual = OutputSchema.parse(result.cases[0]!.actual);
        expect(actual.kind).toBe(course.id === '219' ? 'boolean' : 'int');
        expect(judgeProblemOutput(course.id, target.input as never, actual).passed).toBe(false);
      }
    }, 120_000);
  }
});
