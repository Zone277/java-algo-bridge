import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../apps/api/src/app.js';
import { JavaRunner } from '../../apps/api/src/runner.js';
import { correct } from '../fixtures/java.js';

const app = await buildApp({ runner: new JavaRunner({ dockerExecutable: 'jab-missing-docker-628239' }) });
let token: string;
const payload = { problemId: '704', lessonVersion: '704-v1', mode: 'run', source: correct, input: { nums: [-8, 3, 7], target: 3 } };
const headers = () => ({ host: '127.0.0.1:3001', origin: 'http://127.0.0.1:5173', 'x-java-algo-session': token });
beforeAll(async () => {
  const response = await app.inject({ method: 'GET', url: '/api/session', headers: { host: '127.0.0.1:3001' } });
  expect(response.statusCode).toBe(200);
  token = response.json<{token:string}>().token;
});
afterAll(async () => { await app.close(); });
describe('local HTTP trust boundary, actual Fastify handlers', () => {
  it.each([
    { host: 'attacker.example', origin: 'http://127.0.0.1:5173' },
    { host: '127.0.0.1:3001', origin: 'https://attacker.example' },
    { host: '127.0.0.1:3001' },
    { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:5173', 'x-java-algo-session': 'wrong' },
  ])('rejects untrusted Host, Origin, absent session', async extra => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: extra, payload });
    expect(response.statusCode).toBe(403);
  });
  it('valid authenticated request reports unavailable rather than algorithm failure', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload });
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('RUNNER_UNAVAILABLE');
    expect(response.json().cases).toEqual([]);
  });
  it.each([{ ...payload, expected: 1 }, { ...payload, mode: 'submit' }, { ...payload, input: { nums: [4, 2], target: 2 } }])('rejects client answer and invalid input', async payload => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload });
    expect(response.statusCode).toBe(400);
  });
  it('bounds request bytes before runner', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: headers(), payload: { ...payload, source: 'x'.repeat(131073) } });
    expect(response.statusCode).toBe(413);
  });
  it('rejects equal character length non-ASCII token without throwing', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', headers: { ...headers(), 'x-java-algo-session': '汉'.repeat(token.length) }, payload });
    expect(response.statusCode).toBe(403);
  });
});
