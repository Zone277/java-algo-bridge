import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, MaximumSubarrayInputSchema, OutputSchema, RunRequestSchema, TwoSumSortedInputSchema,
  ValidAnagramInputSchema, judgeProblemOutput, type Lesson, type ProblemId, type ReferenceTrace, type RunRequest,
} from '@jab/contracts';
import { lesson53 } from '@jab/curriculum/53';
import { lesson167 } from '@jab/curriculum/167';
import { lesson242 } from '@jab/curriculum/242';
import { buildReferenceTrace as trace53 } from '@jab/curriculum/53/model';
import { buildReferenceTrace as trace167 } from '@jab/curriculum/167/model';
import { buildReferenceTrace as trace242 } from '@jab/curriculum/242/model';
import { JavaRunner } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type Course = { id: ProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '53', lesson: LessonSchema.parse(lesson53), trace: (input, id) => trace53(MaximumSubarrayInputSchema.parse(input), id) },
  { id: '167', lesson: LessonSchema.parse(lesson167), trace: (input, id) => trace167(TwoSumSortedInputSchema.parse(input), id) },
  { id: '242', lesson: LessonSchema.parse(lesson242), trace: (input, id) => trace242(ValidAnagramInputSchema.parse(input), id) },
];

function exceedsDemo(input: unknown): boolean {
  const value = input as { nums?: number[]; numbers?: number[]; s?: string; t?: string };
  return (value.nums?.length ?? 0) > 30 || (value.numbers?.length ?? 0) > 30 ||
    (value.s?.length ?? 0) > 30 || (value.t?.length ?? 0) > 30;
}

describe('three new courses execute Java in Docker and agree with immutable reference models', () => {
  it.each(courses)('$id reference Java passes every published case', async course => {
    const result = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'submit' });
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

  it('compares fixed-seed small inputs with actual javac/java, including valid unique sorted pairs', async () => {
    let seed = 20261015;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<'53' | '167' | '242', unknown[]> = { '53': [], '167': [], '242': [] };
    for (let sample = 0; sample < 4; sample++) {
      inputs['53'].push({ nums: Array.from({ length: 3 + random() % 8 }, () => (random() % 21) - 10) });
      const s = Array.from({ length: 2 + random() % 7 }, () => 'abcd'[random() % 4]).join('');
      const t = sample % 2 === 0 ? [...s].reverse().join('') : Array.from({ length: s.length }, () => 'abcd'[random() % 4]).join('');
      inputs['242'].push({ s, t });
    }
    for (let attempt = 0; inputs['167'].length < 4 && attempt < 200; attempt++) {
      const numbers = Array.from({ length: 7 }, () => (random() % 41) - 20).sort((a, b) => a - b);
      const left = random() % 6;
      const right = left + 1 + random() % (6 - left);
      const candidate = { numbers, target: numbers[left]! + numbers[right]! };
      if (TwoSumSortedInputSchema.safeParse(candidate).success) inputs['167'].push(candidate);
    }
    expect(inputs['167']).toHaveLength(4);
    for (const course of courses) for (const [index, input] of inputs[course.id as '53' | '167' | '242'].entries()) {
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
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(['WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT']).toContain(submitted.status);
      let exposed = false;
      for (const id of fixture.targetedCaseIds) {
        const target = course.lesson.testSuite.cases.find(item => item.id === id)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: target.input }) as RunRequest;
        const result = await runner.execute(request);
        expect(['PASSED_LOCAL_TESTS', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT']).toContain(result.status);
        exposed ||= result.status !== 'PASSED_LOCAL_TESTS';
      }
      expect(exposed, `${course.id}:${fixture.id} targeted cases must expose the bug`).toBe(true);
    }, 120_000);
  }
});
