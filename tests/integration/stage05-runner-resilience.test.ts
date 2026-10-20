import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTAINER_LABEL, JavaRunner, RUNNER_IMAGE } from '../../apps/api/src/runner.js';

const fakeDocker = String.raw`
const fs = require('node:fs');
const statePath = process.argv[1];
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
state.commands = state.commands || [];
state.commands.push(args);
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const finish = (code, stdout = '', stderr = '') => {
  save();
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exitCode = code;
};
if (args[0] === 'info') {
  if (state.mode === 'blank-info') finish(0, '', 'Docker Desktop is unable to start');
  else if (state.mode === 'hang-info') { save(); setInterval(() => {}, 10000); }
  else finish(0, 'linux\n');
} else if (args[0] === 'ps') {
  state.psCalls = (state.psCalls || 0) + 1;
  if (state.failFirstPs && state.psCalls === 1) finish(1, '', 'temporary daemon failure');
  else finish(0, (state.containerIds || []).join('\n'));
} else if (args[0] === 'inspect') {
  finish(0, state.created || new Date(0).toISOString());
} else if (args[0] === 'run') {
  if (args.includes('--probe')) finish(0, '{"available":true}\n');
  else finish(0, '{"cases":[{"status":"OK","output":{"kind":"int","value":0},"elapsedMs":1}],"compileMs":1,"phase":"execute","status":"OK","stdout":"","stderr":"","stdoutBytes":0,"stderrBytes":0,"truncated":false}\n');
} else if (args[0] === 'rm') {
  if (state.failRm) finish(1, '', 'forced rm failure'); else finish(0);
} else finish(1, '', 'unexpected fake docker command');
`;

type FakeState = { mode?: string; failFirstPs?: boolean; failRm?: boolean; psCalls?: number; commands?: string[][] };
const roots: string[] = [];

async function setup(state: FakeState = {}) {
  const root = await mkdtemp(join(tmpdir(), 'jab-stage05-fake-'));
  roots.push(root);
  const statePath = join(root, 'docker-state.json');
  await writeFile(statePath, JSON.stringify(state));
  const runner = new JavaRunner({ dockerExecutable: process.execPath, dockerArgumentsPrefix: ['--eval', fakeDocker, statePath], tempRoot: root });
  const readState = async () => JSON.parse(await readFile(statePath, 'utf8')) as Required<Pick<FakeState, 'commands' | 'psCalls'>> & FakeState;
  return { root, runner, readState };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('stage05 runner availability and cleanup resilience without real Docker', () => {
  it('does not treat exit zero with blank engine type as a usable daemon', async () => {
    const { runner } = await setup({ mode: 'blank-info' });
    expect(await runner.getAvailability()).toEqual({ available: false, reason: 'DOCKER_DAEMON_UNAVAILABLE' });
    await runner.close();
  });

  it('retries a failed stale sweep and disables image pulling on the successful probe', async () => {
    const { runner, readState } = await setup({ failFirstPs: true });
    expect((await runner.getAvailability()).reason).toContain('STALE_CLEANUP_FAILED');
    expect(await runner.getAvailability()).toEqual({ available: true, reason: null });
    const result = await runner.execute({ problemId: '704', lessonVersion: '704-v1', mode: 'run', source: 'class Solution { public int search(int[] nums, int target) { return 0; } }', input: { nums: [1], target: 1 } });
    expect(result.status).toBe('PASSED_LOCAL_TESTS');
    const state = await readState();
    expect(state.psCalls).toBe(2);
    const runs = state.commands.filter(command => command[0] === 'run');
    expect(runs).toHaveLength(2);
    for (const command of runs) {
      expect(command).toContain('--pull=never');
      expect(command).toContain(RUNNER_IMAGE);
    }
    expect(runs.find(command => command.includes('--probe'))).toContain('--rm');
    // Student task containers remain inspectable for genuine OOM evidence.
    expect(runs.find(command => !command.includes('--probe'))).not.toContain('--rm');
    await runner.close();
  });

  it('reconsiders a task directory that was too young during the first sweep', async () => {
    let now = 2_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { root, runner, readState } = await setup();
    const task = join(root, 'jab-run-young01');
    await mkdir(task);
    await writeFile(join(task, '.jab-task.json'), JSON.stringify({ project: CONTAINER_LABEL, createdAt: now }));
    expect((await runner.getAvailability()).available).toBe(true);
    expect(await readFile(join(task, '.jab-task.json'), 'utf8')).toContain(CONTAINER_LABEL);
    now += 121_000;
    expect((await runner.getAvailability()).available).toBe(true);
    await expect(readFile(join(task, '.jab-task.json'), 'utf8')).rejects.toThrow();
    expect((await readState()).psCalls).toBe(2);
    await runner.close();
  });

  it('cancels a request while Docker availability is still being checked', async () => {
    const { runner } = await setup({ mode: 'hang-info' });
    const controller = new AbortController();
    const pending = runner.execute({ problemId: '704', lessonVersion: '704-v1', mode: 'run', source: 'class Solution { public int search(int[] nums, int target) { return -1; } }', input: { nums: [1], target: 1 } }, { signal: controller.signal });
    const started = performance.now();
    setTimeout(() => controller.abort(), 50);
    const result = await pending;
    expect(result.status).toBe('CANCELLED');
    expect(performance.now() - started).toBeLessThan(2000);
    await runner.close();
  });

  it('rejects close when a tracked probe container cannot be removed', async () => {
    const { runner } = await setup({ failRm: true });
    expect((await runner.getAvailability()).available).toBe(false);
    await expect(runner.close()).rejects.toThrow('RUNNER_CLOSE_CLEANUP_FAILED');
  });
});
