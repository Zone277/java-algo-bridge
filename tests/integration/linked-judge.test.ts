import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../apps/api/src/app.js';
import { JavaRunner, judgeListGraph } from '../../apps/api/src/runner.js';
import { LINKED_LESSON_VERSION, LINKED_STARTER_SOURCE, RunResultSchema, type ListGraph } from '../../packages/contracts/src/index.js';

// Hand-authored graph fixtures exercise structural comparison only, not Java execution.
const input = { head: [5, 5, 8] };
function graph(): ListGraph {
  return { kind: 'list-graph', headId: 'h2', nodes: [
    { id: 'h0', value: 5, nextId: null },
    { id: 'h1', value: 5, nextId: 'h0' },
    { id: 'h2', value: 8, nextId: 'h1' },
  ] };
}
describe('206 host structural judge (not Java execution evidence)', () => {
  it('accepts reversed original identities even if graph records arrive in another order', () => {
    const actual = graph();
    actual.nodes = [actual.nodes[2]!, actual.nodes[0]!, actual.nodes[1]!];
    expect(judgeListGraph(input, actual)).toBeNull();
  });
  it('accepts null for empty input and preserves the singleton identity', () => {
    expect(judgeListGraph({ head: [] }, { kind: 'list-graph', headId: null, nodes: [] })).toBeNull();
    expect(judgeListGraph({ head: [7] }, { kind: 'list-graph', headId: 'h0', nodes: [{ id: 'h0', value: 7, nextId: null }] })).toBeNull();
  });
  const failures: { label: string; alter: (actual: ListGraph) => void }[] = [
    { label: 'wrong original head', alter: g => { g.headId = 'h0'; } },
    { label: 'null head drops nonempty chain', alter: g => { g.headId = null; } },
    { label: 'cycle through former tail', alter: g => { g.nodes[0]!.nextId = 'h2'; } },
    { label: 'self cycle', alter: g => { g.nodes[1]!.nextId = 'h1'; } },
    { label: 'lost next chain', alter: g => { g.nodes[2]!.nextId = null; } },
    { label: 'value changed instead of reversing links', alter: g => { g.nodes[0]!.value = 8; g.nodes[2]!.value = 5; } },
    { label: 'missing original node', alter: g => { g.nodes.splice(1, 1); } },
    { label: 'extra node', alter: g => { g.nodes.push({ id: 'new0', value: 5, nextId: null }); } },
    { label: 'duplicate identity despite matching count', alter: g => { g.nodes[1]!.id = 'h0'; } },
    { label: 'new identity replacing an original', alter: g => { g.nodes[1]!.id = 'new0'; } },
    { label: 'root points at newly allocated object', alter: g => { g.headId = 'unknown0'; } },
    { label: 'next points at newly allocated object', alter: g => { g.nodes[1]!.nextId = 'unknown0'; } },
    { label: 'equal values hide wrong object order', alter: g => { g.nodes[2]!.nextId = 'h0'; g.nodes[0]!.nextId = 'h1'; g.nodes[1]!.nextId = null; } },
  ];
  it.each(failures)('rejects $label', ({ alter }) => {
    const actual = graph();
    alter(actual);
    expect(judgeListGraph(input, actual)).toEqual(expect.any(String));
  });
  it('rejects invented head or nodes for an empty input', () => {
    expect(judgeListGraph({ head: [] }, { kind: 'list-graph', headId: 'h0', nodes: [] })).not.toBeNull();
    expect(judgeListGraph({ head: [] }, { kind: 'list-graph', headId: 'h0', nodes: [{ id: 'h0', value: 0, nextId: null }] })).not.toBeNull();
  });
  it('handles a 5000-node cycle with bounded graph inspection', () => {
    const values = Array.from({ length: 5000 }, (_, i) => i);
    const nodes = values.map((value, i) => ({ id: `h${i}`, value, nextId: i === 0 ? 'h4999' : `h${i - 1}` }));
    expect(judgeListGraph({ head: values }, { kind: 'list-graph', headId: 'h4999', nodes })).not.toBeNull();
  });
});

// Real Fastify validation with an intentionally nonexistent Docker executable.
// No Java is compiled, and RUNNER_UNAVAILABLE is never counted as a passed algorithm.
const app = await buildApp({ runner: new JavaRunner({ dockerExecutable: 'jab-test-no-docker-206-740ebf' }) });
let token = '';
const headers = () => ({ host: '127.0.0.1:3001', origin: 'http://127.0.0.1:5173', 'x-java-algo-session': token });
const request = { problemId: '206', lessonVersion: LINKED_LESSON_VERSION, source: LINKED_STARTER_SOURCE, mode: 'run', input: { head: [] } };
beforeAll(async () => { token = (await app.inject({ method: 'GET', url: '/api/session', headers: { host: '127.0.0.1:3001' } })).json<{ token: string }>().token; });
afterAll(async () => { await app.close(); });
describe('206 actual HTTP validation with unavailable Docker', () => {
  it('accepts empty list input but reports unavailable without executing Java', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload: request });
    expect(response.statusCode).toBe(503);
    const result = RunResultSchema.parse(response.json());
    expect(result.problemId).toBe('206');
    expect(result.status).toBe('RUNNER_UNAVAILABLE');
    expect(result.reason).toBe('DOCKER_CLI_UNAVAILABLE');
    expect(result.cases).toEqual([]);
    expect(result.timings.compileMs).toBe(0);
    expect(result.timings.executeMs).toBe(0);
    expect(result.cleanup.status).toBe('done');
  });
  it('rejects wrong lesson version before execution', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload: { ...request, lessonVersion: '704-v1' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().reason).toBe('LESSON_VERSION_MISMATCH');
  });
  it.each([{ head: [5001] }, { head: Array.from({ length: 5001 }, () => 0) }, { head: [0], expected: null }])('rejects out-of-contract input', async listInput => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload: { ...request, input: listInput } });
    expect(response.statusCode).toBe(400);
    expect(response.json().reason).toBe('SITE_LIMIT');
  });
});
