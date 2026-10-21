import { afterAll, describe, expect, it } from 'vitest';
import {
  RotatedSearchInputSchema, CoinChangeInputSchema, LessonSchema, IsSubsequenceInputSchema,
  OutputSchema, RunRequestSchema, judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson33 } from '@jab/curriculum/33';
import { lesson392 } from '@jab/curriculum/392';
import { lesson322 } from '@jab/curriculum/322';
import { buildReferenceTrace as trace33 } from '@jab/curriculum/33/model';
import { buildReferenceTrace as trace392 } from '@jab/curriculum/392/model';
import { buildReferenceTrace as trace322 } from '@jab/curriculum/322/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '33' | '392' | '322';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '33', lesson: LessonSchema.parse(lesson33), trace: (input, id) => trace33(RotatedSearchInputSchema.parse(input), id) },
  { id: '392', lesson: LessonSchema.parse(lesson392), trace: (input, id) => trace392(IsSubsequenceInputSchema.parse(input), id) },
  { id: '322', lesson: LessonSchema.parse(lesson322), trace: (input, id) => trace322(CoinChangeInputSchema.parse(input), id) },
];

function exceedsDemo(input: unknown): boolean {
  const value = input as { nums?: number[]; s?: string; t?: string; amount?: number };
  return (value.nums?.length ?? 0) > 30 || (value.s?.length ?? 0) > 30 || (value.t?.length ?? 0) > 30 || (value.amount ?? 0) > 30;
}

describe('33/392/322 real Java agrees with reference models and independent judges', () => {
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
    let seed = 20261021;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const inputs: Record<NewProblemId, unknown[]> = { '33': [], '392': [], '322': [] };
    for (let sample = 0; sample < 4; sample++) {
      const sorted = Array.from({ length: 2 + sample * 2 }, (_, i) => i * 3 - 12);
      const pivot = random() % sorted.length;
      inputs['33'].push({ nums: [...sorted.slice(pivot), ...sorted.slice(0, pivot)], target: sample % 2 ? 99 : sorted[pivot] });
      const t = Array.from({ length: 4 + sample * 3 }, () => 'abc'[random() % 3]).join('');
      inputs['392'].push({ s: sample % 2 ? t.slice(0, 2) + 'z' : [...t].filter((_, i) => i % 2 === 0).join(''), t });
      inputs['322'].push({ coins: [2, 3 + sample, 2147483647], amount: random() % 25 });
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
        expect(actual.kind).toBe(course.id === '392' ? 'boolean' : 'int');
        expect(judgeProblemOutput(course.id, target.input as never, actual).passed).toBe(false);
      }
    }, 120_000);
  }
});
