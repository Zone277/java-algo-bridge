import { afterAll, describe, expect, it } from 'vitest';
import {
  SearchRangeInputSchema, HappyNumberInputSchema, FirstUniqueCharInputSchema, LessonSchema,
  OutputSchema, RunRequestSchema, judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson34 } from '@jab/curriculum/34';
import { lesson202 } from '@jab/curriculum/202';
import { lesson387 } from '@jab/curriculum/387';
import { buildReferenceTrace as trace34 } from '@jab/curriculum/34/model';
import { buildReferenceTrace as trace202 } from '@jab/curriculum/202/model';
import { buildReferenceTrace as trace387 } from '@jab/curriculum/387/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '34' | '202' | '387';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '34', lesson: LessonSchema.parse(lesson34), trace: (input, id) => trace34(SearchRangeInputSchema.parse(input), id) },
  { id: '202', lesson: LessonSchema.parse(lesson202), trace: (input, id) => trace202(HappyNumberInputSchema.parse(input), id) },
  { id: '387', lesson: LessonSchema.parse(lesson387), trace: (input, id) => trace387(FirstUniqueCharInputSchema.parse(input), id) },
];

function exceedsDemo(id: NewProblemId, input: unknown): boolean {
  return id === '34' ? (input as { nums: number[] }).nums.length > 30
    : id === '387' ? (input as { s: string }).s.length > 30 : false;
}

describe('34/202/387 real Java agrees with reference models and independent judges', () => {
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
    let seed = 20261027;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<NewProblemId, unknown[]> = { '34': [], '202': [], '387': [] };
    for (let sample = 0; sample < 4; sample++) {
      const nums = Array.from({ length: sample * 3 }, () => random() % 7 - 3).sort((a, b) => a - b);
      inputs['34'].push({ nums, target: random() % 7 - 3 });
      inputs['202'].push({ n: 1 + random() % 10000 });
      inputs['387'].push({ s: Array.from({ length: 1 + sample * 3 }, () => 'abcde'[random() % 5]).join('') });
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
        expect(actual.kind).toBe(course.id === '34' ? 'int-array' : course.id === '202' ? 'boolean' : 'int');
        expect(judgeProblemOutput(course.id, target.input as never, actual).passed).toBe(false);
      }
    }, 120_000);
  }
});
