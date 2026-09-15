import { describe, expect, it } from 'vitest';
import { LinkedListInputSchema, LINKED_STARTER_SOURCE, RunRequestSchema, expectedReversedList } from '@jab/contracts';

describe('206 strict input and identity contract', () => {
  it('accepts empty/duplicate/maximum lists and original identity reverse expectations', () => {
    for (const head of [[], [4], [4,4], Array.from({ length: 5000 }, (_, i) => i - 2500)]) expect(LinkedListInputSchema.safeParse({ head }).success).toBe(true);
    expect(expectedReversedList({ head: [5,5,8] })).toEqual({ kind: 'list-graph', headId: 'h2', nodes: [{ id: 'h0', value: 5, nextId: null }, { id: 'h1', value: 5, nextId: 'h0' }, { id: 'h2', value: 8, nextId: 'h1' }] });
    expect(expectedReversedList({ head: [] })).toEqual({ kind: 'list-graph', headId: null, nodes: [] });
  });
  it('separates problem inputs and versions without opening future lessons', () => {
    const req = { problemId: '206', lessonVersion: '206-v1', source: LINKED_STARTER_SOURCE, mode: 'run', input: { head: [] } };
    expect(RunRequestSchema.safeParse(req).success).toBe(true);
    for (const bad of [{ ...req, lessonVersion: '704-v1' }, { ...req, problemId: '704' }, { ...req, problemId: '21' }, { ...req, input: { nums: [1], target: 1 } }, { ...req, sourceHash: 'a'.repeat(64) }, { ...req, mode: 'submit' }]) expect(RunRequestSchema.safeParse(bad).success).toBe(false);
    expect(RunRequestSchema.safeParse({ problemId: '206', lessonVersion: '206-v1', source: LINKED_STARTER_SOURCE, mode: 'submit' }).success).toBe(true);
  });
  it.each([{ head: [5001] }, { head: [-5001] }, { head: [1.5] }, { head: [null] }, { head: new Array(5001).fill(1) }, { head: [1], expected: [1] }])('rejects malformed or excessive lists before Java', input => {
    expect(LinkedListInputSchema.safeParse(input).success).toBe(false);
  });
});
