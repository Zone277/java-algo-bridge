import { afterAll, describe, expect, it } from 'vitest';
import {
  LessonSchema, OutputSchema, RunRequestSchema, TreeInputSchema, PowerOfTwoInputSchema, RansomNoteInputSchema,
  judgeProblemOutput, type Lesson, type ReferenceTrace,
} from '@jab/contracts';
import { lesson145 } from '@jab/curriculum/145';
import { lesson231 } from '@jab/curriculum/231';
import { lesson383 } from '@jab/curriculum/383';
import { buildReferenceTrace as trace145 } from '@jab/curriculum/145/model';
import { buildReferenceTrace as trace231 } from '@jab/curriculum/231/model';
import { buildReferenceTrace as trace383 } from '@jab/curriculum/383/model';
import { JavaRunner, hash } from '../../apps/api/src/runner.js';

const runner = new JavaRunner();
afterAll(async () => runner.close());

type NewProblemId = '145' | '231' | '383';
type Course = { id: NewProblemId; lesson: Lesson; trace: (input: unknown, inputId: string) => Promise<ReferenceTrace> };
const courses: Course[] = [
  { id: '145', lesson: LessonSchema.parse(lesson145), trace: (input, id) => trace145(TreeInputSchema.parse(input), id) },
  { id: '231', lesson: LessonSchema.parse(lesson231), trace: (input, id) => trace231(PowerOfTwoInputSchema.parse(input), id) },
  { id: '383', lesson: LessonSchema.parse(lesson383), trace: (input, id) => trace383(RansomNoteInputSchema.parse(input), id) },
];

describe('145/231/383 real Java runner, independent oracle and reference trace', () => {
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

  it('compares actual javac/java output with models on small independent inputs', async () => {
    const inputs: Record<NewProblemId, unknown[]> = {
      '145': [{ root: [] }, { root: [1] }, { root: [1, null, 2, 3] }, { root: [5, 5, 5, null, 5] }],
      '231': [{ n: -2147483648 }, { n: 0 }, { n: 1 }, { n: 16 }, { n: 17 }],
      '383': [{ ransomNote: 'a', magazine: 'b' }, { ransomNote: 'aa', magazine: 'aab' }, { ransomNote: 'abc', magazine: 'cba' }, { ransomNote: 'zz', magazine: 'z' }],
    };
    for (const course of courses) for (const [index, input] of inputs[course.id].entries()) {
      const request = RunRequestSchema.parse({ problemId: course.id, lessonVersion: course.lesson.lessonVersion, source: course.lesson.reference.source, mode: 'run', input });
      const result = await runner.execute(request);
      expect(result.status, `${course.id}:${index}: ${result.reason ?? result.stderr}`).toBe('PASSED_LOCAL_TESTS');
      expect(result.origin).toBe('student-java');
      expect(result.sourceHash).toBe(hash(course.lesson.reference.source));
      expect(result.cleanup.status).toBe('done');
      expect(result.cases).toHaveLength(1);
      const trace = await course.trace(input, `sample-${course.id}-${index}`);
      expect(trace.finalOutput).toEqual(OutputSchema.parse(result.cases[0]!.actual));
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
