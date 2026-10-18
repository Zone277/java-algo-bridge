import { afterAll, describe, expect, it } from 'vitest';
import {
  ContainerWaterInputSchema, HouseRobberInputSchema, LessonSchema, MinimumSubarrayInputSchema,
  OutputSchema, RunRequestSchema, judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson11 } from '@jab/curriculum/11';
import { lesson209 } from '@jab/curriculum/209';
import { lesson198 } from '@jab/curriculum/198';
import { buildReferenceTrace as trace11 } from '@jab/curriculum/11/model';
import { buildReferenceTrace as trace209 } from '@jab/curriculum/209/model';
import { buildReferenceTrace as trace198 } from '@jab/curriculum/198/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '11' | '209' | '198';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '11', lesson: LessonSchema.parse(lesson11), trace: (input, id) => trace11(ContainerWaterInputSchema.parse(input), id) },
  { id: '209', lesson: LessonSchema.parse(lesson209), trace: (input, id) => trace209(MinimumSubarrayInputSchema.parse(input), id) },
  { id: '198', lesson: LessonSchema.parse(lesson198), trace: (input, id) => trace198(HouseRobberInputSchema.parse(input), id) },
];

function exceedsDemo(input: unknown): boolean {
  const value = input as { nums?: number[]; height?: number[] };
  return (value.nums?.length ?? 0) > 30 || (value.height?.length ?? 0) > 30;
}

describe('11/209/198 real Java agrees with reference models and independent judges', () => {
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
      if (exceedsDemo(definition.input)) {
        await expect(course.trace(definition.input, `published-${definition.id}`)).rejects.toThrow(/30/);
      } else {
        const trace = await course.trace(definition.input, `published-${definition.id}`);
        expect(OutputSchema.parse(trace.finalOutput)).toEqual(actual);
      }
    }
  }, 120_000);

  it('compares fixed-seed small valid inputs with actual javac/java', async () => {
    let seed = 20261018;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<NewProblemId, unknown[]> = { '11': [], '209': [], '198': [] };
    for (let sample = 0; sample < 4; sample++) {
      inputs['11'].push({ height: Array.from({ length: 2 + sample * 2 }, () => random() % 13) });
      inputs['209'].push({ target: 5 + random() % 25, nums: Array.from({ length: 3 + sample * 2 }, () => 1 + random() % 8) });
      inputs['198'].push({ nums: Array.from({ length: 1 + sample * 3 }, () => random() % 20) });
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
      expect(['WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT'], JSON.stringify({ phase: submitted.phase, reason: submitted.reason, stderr: submitted.stderr, timings: submitted.timings, cleanup: submitted.cleanup })).toContain(submitted.status);
      expect(submitted.cleanup.status).toBe('done');
      let exposed = false;
      for (const id of fixture.targetedCaseIds) {
        const target = course.lesson.testSuite.cases.find(item => item.id === id)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: target.input });
        const result = await runner.execute(request);
        expect(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT'], JSON.stringify({ phase: result.phase, reason: result.reason, stderr: result.stderr, timings: result.timings, cleanup: result.cleanup })).toContain(result.status);
        expect(result.cleanup.status).toBe('done');
        exposed ||= result.status !== 'PASSED_LOCAL_TESTS';
      }
      expect(exposed, `${course.id}:${fixture.id} targeted cases must expose the bug`).toBe(true);
    }, 120_000);
  }
});
