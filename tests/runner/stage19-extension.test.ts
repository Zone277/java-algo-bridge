import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, OutputSchema, RunRequestSchema, LastWordInputSchema, PlusOneInputSchema, TreeInputSchema,
  expectedOutput, judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson58 } from '@jab/curriculum/58';
import { lesson66 } from '@jab/curriculum/66';
import { lesson110 } from '@jab/curriculum/110';
import { buildReferenceTrace as trace58 } from '@jab/curriculum/58/model';
import { buildReferenceTrace as trace66 } from '@jab/curriculum/66/model';
import { buildReferenceTrace as trace110 } from '@jab/curriculum/110/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '58' | '66' | '110';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '58', lesson: LessonSchema.parse(lesson58), trace: (input, id) => trace58(LastWordInputSchema.parse(input), id) },
  { id: '66', lesson: LessonSchema.parse(lesson66), trace: (input, id) => trace66(PlusOneInputSchema.parse(input), id) },
  { id: '110', lesson: LessonSchema.parse(lesson110), trace: (input, id) => trace110(TreeInputSchema.parse(input), id) },
];

describe('58/66/110 real Java runner, oracle and reference trace', () => {
  it('110 guided null-height scaffold is a real failing Java counterexample', async () => {
    const lesson = LessonSchema.parse(lesson110);
    const source = lesson.guided.stages[0]!.scaffoldSource;
    for (const input of [{ root: [] }, { root: [8] }]) {
      const request = RunRequestSchema.parse({ problemId: '110', lessonVersion: lesson.lessonVersion, source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, result.reason ?? result.stderr).toBe('WRONG_ANSWER');
      expect(result.origin).toBe('student-java');
      expect(result.sourceHash).toBe(hash(source));
      expect(result.cleanup.status).toBe('done');
    }
  }, 120_000);

  it.each(courses)('$id reference Java passes every published case', async course => {
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
    }
  }, 120_000);

  it('compares actual javac/java output with models on extra inputs', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '58': [{ s: 'a' }, { s: 'Hi World  ' }, { s: '   ONE  two' }, { s: 'A'.repeat(10000) }],
      '66': [{ digits: [0] }, { digits: [1, 9] }, { digits: [9, 9, 9] }, { digits: [1, ...Array(99).fill(9)] }],
      '110': [{ root: [] }, { root: [1] }, { root: [1, 2, 3, 4, 5, 6, 7] }, { root: [1, 2, 3, 4, null, null, 5, 6] }],
    };
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.origin).toBe('student-java');
      expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
      expect(result.cleanup.status).toBe('done');
      expect(result.cases).toHaveLength(1);
      const actual = OutputSchema.parse(result.cases[0]!.actual);
      expect(actual).toEqual(expectedOutput(course.id, input as never));
      const isLargeDemo = (course.id === '58' && (input as { s: string }).s.length > 30)
        || (course.id === '66' && (input as { digits: number[] }).digits.length > 30);
      if (!isLargeDemo) {
        const trace = await course.trace(input, `sample-${course.id}-${index}`);
        expect(trace.finalOutput).toEqual(actual);
      }
    }
  }, 180_000);

  for (const course of courses) for (const fixture of course.lesson.testSuite.wrongFixtures) {
    it(`${course.id} rejects ${fixture.id} on all named counterexamples`, async () => {
      const submitted = await runner.execute({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'submit' });
      expect(submitted.status, submitted.reason ?? submitted.stderr).toBe('WRONG_ANSWER');
      expect(submitted.cleanup.status).toBe('done');
      for (const caseId of fixture.targetedCaseIds) {
        const definition = course.lesson.testSuite.cases.find(item => item.id === caseId)!;
        const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: fixture.source, mode: 'run', input: definition.input });
        const result = await runner.execute(request);
        expect(result.status, `${course.id}:${fixture.id}:${caseId}: ${result.reason ?? result.stderr}`).toBe('WRONG_ANSWER');
        expect(result.origin).toBe('student-java');
        expect(result.sourceHash).toBe(hash(fixture.source));
        expect(result.cleanup.status).toBe('done');
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0]!.status).toBe('WRONG_ANSWER');
        if (result.cases[0]!.actual !== null) {
          const actual = OutputSchema.parse(result.cases[0]!.actual);
          expect(judgeProblemOutput(course.id, definition.input as never, actual).passed).toBe(false);
        }
      }
    }, 180_000);
  }
});
